import { $Extensible, $Target, $Registry, $Register } from '#library/symbol.library.js';

const $isTempo = Symbol.for('$isTempo');
const registry: Instance[] = [];														// global types for getType

/** the primitive type reported by toStringTag() */
const protoType = (obj?: unknown) => {
	const raw = (obj as any)?.[$Target] ?? obj;							// bypass Proxy traps
	return Object.prototype.toString.call(raw).slice(8, -1) as Type;
}

/** 
 * # getType
 * return an object's type as a ProperCase string.  
 * if instance, return Class name.
 * 
 * @NOTE Load-Order Dependency:
 * Consumers must import modules that call registerType() (such as Tempo) 
 * before calling getType() to ensure custom types are correctly identified.
 */
export const getType = (obj?: any, ...instances: Instance[]): Type => {
	const raw = (obj as any)?.[$Target] ?? obj;							// bypass Proxy traps
	const type = protoType(raw);

	switch (true) {
		case obj === null: return 'Null';
		case obj === undefined: return 'Undefined';

		case isClassConstructor(raw): return 'Class';
		case typeof raw === 'function': return type;						// catch all functional types (including AsyncFunction)

		case type === 'Object': {
			if (isArrayLike(raw)) return 'ArrayLike';

			for (const inst of instances) {
				const instRaw = (inst.class as any)?.[$Target] ?? inst.class;
				if (raw === instRaw || (instRaw && raw instanceof instRaw)) return inst.type as Type;
			}

			const globalRegistry = (globalThis as any)[$Registry] ?? [];
			for (const inst of [...registry, ...globalRegistry]) {
				const instRaw = (inst.class as any)?.[$Target] ?? inst.class;
				if (raw === instRaw || (instRaw && raw instanceof instRaw)) return inst.type as Type;
			}

			return 'Object';
		}

		default: return type;
	}
}

/** return TypeValue<T> object */
export const asType = <T>(value?: T, ...instances: Instance[]) => ({ type: getType(value, ...instances), value } as TypeValue<T>);

/** assert value is one of a list of Types */
export const isType = <T>(obj: unknown, ...types: Type[]): obj is T => types.includes(getType(obj));

/** Type-Guards: assert \<obj> is of \<type> */
export const isPrimitive = (obj?: unknown): obj is Primitive => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Void', 'Null', 'Empty');
export const isReference = (obj?: unknown): obj is Object => !isPrimitive(obj);
export const isIterable = <T>(obj: unknown): obj is Iterable<T> => Symbol.iterator in Object(obj) && !isString(obj);

export const isString = <T>(obj?: T): obj is Extract<T, string> => isType(obj, 'String');
export const isNumber = <T>(obj?: T): obj is Extract<T, number> => isType(obj, 'Number') && isFinite(obj as number);
export const isInteger = <T>(obj?: T): obj is Extract<T, bigint> => isType(obj, 'BigInt');
export const isIntegerLike = <T>(obj?: T): obj is Extract<T, string> => isType(obj, 'String') && /^-?[0-9]+n$/.test(obj as string);
export const isDigit = <T>(obj?: T): obj is Extract<T, number | bigint> => isType(obj, 'Number', 'BigInt');
export const isBoolean = <T>(obj?: T): obj is Extract<T, boolean> => isType(obj, 'Boolean');
export const isArray = <T>(obj: unknown): obj is T[] => isType(obj, 'Array');
export const isArrayLike = <T>(obj: any): obj is ArrayLike<T> => protoType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
export const isObject = <T>(obj?: T): obj is Extract<T, object> => isType(obj, 'Object');
export const isDate = <T>(obj?: T): obj is Extract<T, Date> => isType(obj, 'Date');
export const isRegExp = <T>(obj?: T): obj is Extract<T, RegExp> => isType(obj, 'RegExp');
export const isRegExpLike = <T>(obj?: T): obj is Extract<T, string> => isType(obj, 'String') && /^\/.*\/$/.test(obj as string);
export const isSymbol = <T>(obj?: T): obj is Extract<T, symbol> => isType(obj, 'Symbol');
export const isSymbolFor = <T>(obj?: T): obj is Extract<T, symbol> => isType<symbol>(obj, 'Symbol') && Symbol.keyFor(obj) !== undefined;
export const isPropertyKey = (obj?: unknown): obj is PropertyKey => isType<PropertyKey>(obj, 'String', 'Number', 'Symbol');

export const isNull = <T>(obj?: T): obj is Extract<T, null> => isType(obj, 'Null');
export const isNullish = <T>(obj: T): obj is Extract<T, Nullish> => isType<undefined | null | void>(obj, 'Null', 'Undefined', 'Void', 'Empty');
export const isUndefined = <T>(obj?: T): obj is undefined => isType<undefined>(obj, 'Undefined', 'Void', 'Empty');
export const isDefined = <T>(obj: T): obj is NonNullable<T> => !isNullish(obj);

export const isClass = <T>(obj?: T): obj is Extract<T, Function> => isType(obj, 'Class');
export const isFunction = <T>(obj?: T): obj is Extract<T, Function> => isType(obj, 'Function', 'AsyncFunction');
export const isPromise = <T>(obj?: T): obj is Extract<T, Promise<any>> => isType(obj, 'Promise');
export const isMap = <T, K = any, V = any>(obj?: T): obj is Extract<T, Map<K, V>> => isType(obj, 'Map');
export const isSet = <T, K = any>(obj?: T): obj is Extract<T, Set<K>> => isType(obj, 'Set');
export const isError = <T>(err?: T): err is Extract<T, Error> => isType(err, 'Error');
export const isTemporal = <T>(obj: T): obj is Extract<T, Temporals> => protoType(obj).startsWith('Temporal.');

// non-standard Objects
export const isTempo = <T>(obj?: T): obj is Extract<T, GetType<'Tempo'>> => {
	const raw = (obj as any)?.[$Target] ?? obj;							// bypass Proxy traps
	return !!(raw?.[$isTempo]);
}
export const isEnum = <T, E extends Property<any>>(obj?: T): obj is Extract<T, GetType<'Enumify', E>> => isType(obj, 'Enumify');
export const isPledge = <T, P = any>(obj?: T): obj is Extract<T, GetType<'Pledge', P>> => isType(obj, 'Pledge');

/** assert value for secure() */
export const isExtensible = (obj: any): obj is any => !!(obj?.[$Extensible]);
export const isTarget = (obj: any): obj is any => !!(obj?.[$Target]);

export const nullToZero = <T>(obj: T) => obj ?? 0;
export const nullToEmpty = <T>(obj: T) => obj ?? '';
export const nullToValue = <T, R>(obj: T, value: R) => obj ?? value;

/** object has no values */
export const isEmpty = <T>(obj?: T) => false
	|| isNullish(obj)
	|| (isObject(obj) && (Reflect.ownKeys(obj).length === 0))
	|| (isString(obj) && (obj.trim().length === 0))
	|| (isNumber(obj) && (isNaN(obj) === true))
	|| (isArray(obj) && (obj.length === 0))
	|| (isSet(obj) && (obj.size === 0))
	|| (isMap(obj) && (obj.size === 0))

export function assertCondition(condition: boolean, message?: string): asserts condition {
	if (!condition)
		throw new Error(message);
}
export function assertString(str: unknown): asserts str is string { assertCondition(isString(str), `Invalid string: ${str}`) };
export function assertNever(val: never): asserts val is never { throw new Error(`Unexpected object: ${val}`) };

/** 
 * # resetRegistry
 * Clear the global type registry for test isolation and deterministic behavior.
 */
export const resetRegistry = () => { registry.length = 0; };
const classRegex = /^\s*(class\s|\[native code\])/;						// match class keyword OR native constructor

/** private helper to safely identify an ES6 class, bypassing Proxies */
const isClassConstructor = (obj: any): boolean => {
	if (typeof obj !== 'function') return false;

	const raw = (obj as any)?.[$Target] ?? obj;							// bypass Proxy traps

	// Arrow functions do NOT have a prototype property, whereas traditional functions and classes DO.
	// This is a high-performance check to immediately classify arrow functions as non-classes.
	if (!('prototype' in raw)) return false;
	const name = (raw as any)?.name;
	const tag = raw?.[Symbol.toStringTag] ?? raw?.prototype?.[Symbol.toStringTag];

	// Absolute bypass for Tempo and Temporal identities (using global brands)
	if (raw?.[$isTempo] || name === 'Tempo' || tag === 'Tempo' || (typeof tag === 'string' && (tag.startsWith('Temporal.') || tag.startsWith('Tempo.')))) return true;
	if (typeof tag === 'string' && tag.endsWith('Function')) return false;	// check the tag directly to avoid misidentifying function as class

	const globalRegistry = (globalThis as any)[$Registry] ?? [];
	if (globalRegistry.some((inst: any) => ((inst.class as any)?.[$Target] ?? inst.class) === raw || (name && inst.type === name) || (tag && inst.type === tag))) return true;

	// 3. Last resort: Inspection of constructor property & prototype (Transpilation-Safe)
	try {
		const str = Function.prototype.toString.call(raw);
		if (classRegex.test(str)) return true;

		// ES6 classes have a non-writable prototype descriptor
		const descriptor = Object.getOwnPropertyDescriptor(raw, 'prototype');
		if (descriptor && descriptor.writable === false) return true;

		// if it's a function with a 'prototype' that is NOT an empty object (excluding its constructor), it's likely a class
		const proto = raw.prototype;
		if (proto && Object.getOwnPropertyNames(proto).length > 2) return true;

	} catch {
		return false;
	}

	return false;
}

/** infer T of a <T | T[]> */																export type TValue<T> = T extends Array<infer A> ? A : NonNullable<T>;
/** cast <T | undefined> as <T | T[]> */										export type TValues<T> = TValue<T> | Array<TValue<T>> | Extract<T, undefined>;
/** cast <T | T[]> as T[] */																export type TArray<T> = Array<TValue<T>>;

/** generic value which may be NULL */											export type Nullable<T> = T | null;
/** bottom value */																					export type Nullish = null | undefined | void;
/** Generic Record */																				export type Property<T> = Record<PropertyKey, T>;
/** Generic Record or Array */															export type Obj = Property<any> | Array<any>
type SafeRecursion = 50;
type SafeCount<T, Acc extends any[] = [], Last = LastInUnion<T>> =
	Acc['length'] extends SafeRecursion ? number :						// limit of recursive depth
	0 extends (1 & T) ? number :															// detect 'number'
	[T] extends [never] ? Acc['length'] :										// detect 'never'
	SafeCount<Exclude<T, Last>, [...Acc, any]>								// count remaining

/** Own properties of an Array, Object, Map or Enum */
export type WellKnownSymbols = { [K in keyof SymbolConstructor]: SymbolConstructor[K] extends symbol ? SymbolConstructor[K] : never }[keyof SymbolConstructor]
/** Augmentable map of method/property names to exclude from KeyOf/ValueOf/OwnOf */
export interface IgnoreOfMap { }
type IgnoreOf = WellKnownSymbols | keyof IgnoreOfMap;

export type CountOf<T> = SafeCount<T>
export type OwnOf<T extends Obj> = T extends Array<any> ? { [K in number]: T[number] } : Omit<T, IgnoreOf>
export type KeyOf<T extends Obj> = T extends Array<any> ? number : Exclude<Extract<keyof T, string | symbol>, IgnoreOf>
export type ValueOf<T extends Obj> = T extends Array<any> ? T[number] : T[KeyOf<T>]
export type EntryOf<T extends Obj> = [KeyOf<T>, ValueOf<T>]

/** extracts only the Literal string keys (not index signatures) from an object/interface */
export type LiteralKey<T> = { [K in keyof T]: string extends K ? never : K }[keyof T] & string
/** remove readonly from all keys */
export type Mutable<T> = { -readonly [K in keyof T]: T[K]; }

/** mark some fields as Optional */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
/** Remove 'optional' on keys as well as 'undefined' on values */
export type NonOptional<T> = { [K in keyof T]-?: Exclude<T[K], undefined> }

/** Record with only one-key */
export type OneKey<K extends keyof any, V, KK extends keyof any = K> =
	{ [P in K]: { [Q in P]: V } &
	{ [Q in Exclude<KK, P>]?: undefined } extends infer O ?
		{ [Q in keyof O]: O[Q] } : never
	}[K]

export type Prettify<T> = { [K in keyof T]: T[K]; } & {}
export type ParseInt<T> = T extends `${infer N extends number}` ? N : never
export type Plural<T extends string> = `${T}s`;

type toName<T extends Primitive> =
	T extends string ? "String" :
	T extends number ? "Number" :
	T extends bigint ? "BigInt" :
	T extends boolean ? "Boolean" :
	T extends symbol ? "Symbol" :
	T extends void ? "Void" :
	T extends undefined ? "Undefined" :
	T extends null ? "Null" :
	never
type Primitive = string | number | bigint | boolean | symbol | void | undefined | null	// TODO: add  composite (record & tuple) ?
export type Primitives = toName<Primitive>

/** Generic constructor type */
export type Constructor<T = any> = new (...args: any[]) => T;
export type Instance = { type: Type, class: Constructor }		// allow for Class instance re-naming (to avoid minification mangling issues)

/** 
 * register a class with the runtime type system.
 * @NOTE Custom types must augment `TypeValueMap` to be recognized by the type system!
 */
export const registerType = (cls: Constructor, type?: Type) => {
	const tag = (cls.prototype as any)?.[Symbol.toStringTag];	// toStringTag is the source-of-truth, if present
	const name = (tag ?? type ?? cls.name) as Type;

	if (name && !['Object', 'Function', ''].includes(name as string)) {
		if (!registry.some(inst => inst.class === cls))
			registry.push({ class: cls, type: name });
	}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
export type Temporals = typeof Temporal extends { Now: any } ? Exclude<keyof typeof Temporal, 'Now'> : never;
export type TemporalObject = Temporal.PlainDate | Temporal.PlainTime | Temporal.PlainDateTime | Temporal.ZonedDateTime | Temporal.Instant | Temporal.Duration;
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

export interface TypeValueMap<T = any> {
	String: { type: 'String', value: string };
	Number: { type: 'Number', value: number };
	BigInt: { type: 'BigInt', value: bigint };
	Boolean: { type: 'Boolean', value: boolean };
	Object: { type: 'Object', value: Extract<T, Property<unknown>> };
	Array: { type: 'Array', value: Array<T> };
	ArrayLike: { type: 'ArrayLike', value: ArrayLike<T> };
	Undefined: { type: 'Undefined', value: undefined };
	Null: { type: 'Null', value: null };
	Void: { type: 'Void', value: void };
	Empty: { type: 'Empty', value: unknown };
	Date: { type: 'Date', value: Date };
	Function: { type: 'Function', value: Function };
	AsyncFunction: { type: 'AsyncFunction', value: Function };
	Class: { type: 'Class', value: T };
	Promise: { type: 'Promise', value: Promise<T> };
	RegExp: { type: 'RegExp', value: RegExp };
	Blob: { type: 'Blob', value: Blob };
	Map: { type: 'Map', value: Map<any, T> };
	Set: { type: 'Set', value: Set<T> };
	WeakSet: { type: 'WeakSet', value: WeakSet<Property<unknown>> };
	WeakMap: { type: 'WeakMap', value: WeakMap<Property<unknown>, T> };
	WeakRef: { type: 'WeakRef', value: any };
	Symbol: { type: 'Symbol', value: symbol };
	Error: { type: 'Error', value: Error };

	Temporal: { type: 'Temporal', value: Temporals };
	'Temporal.Instant': { type: 'Temporal.Instant', value: Temporal.Instant };
	'Temporal.ZonedDateTime': { type: 'Temporal.ZonedDateTime', value: Temporal.ZonedDateTime };
	'Temporal.PlainDateTime': { type: 'Temporal.PlainDateTime', value: Temporal.PlainDateTime };
	'Temporal.PlainDate': { type: 'Temporal.PlainDate', value: Temporal.PlainDate };
	'Temporal.PlainTime': { type: 'Temporal.PlainTime', value: Temporal.PlainTime };
	'Temporal.PlainYearMonth': { type: 'Temporal.PlainYearMonth', value: Temporal.PlainYearMonth };
	'Temporal.PlainMonthDay': { type: 'Temporal.PlainMonthDay', value: Temporal.PlainMonthDay };
	'Temporal.ZonedDateTimeLike': { type: 'Temporal.ZonedDateTimeLike', value: Temporal.ZonedDateTimeLike };
	'Temporal.Duration': { type: 'Temporal.Duration', value: Temporal.Duration };
	'Temporal.DurationLike': { type: 'Temporal.DurationLike', value: Temporal.DurationLike };
	'Temporal.PlainDateLike': { type: 'Temporal.PlainDateLike', value: Temporal.PlainDateLike };
	'Temporal.PlainTimeLike': { type: 'Temporal.PlainTimeLike', value: Temporal.PlainTimeLike };
	'Temporal.PlainYearMonthLike': { type: 'Temporal.PlainYearMonthLike', value: Temporal.PlainYearMonthLike };
	'Temporal.PlainMonthDayLike': { type: 'Temporal.PlainMonthDayLike', value: Temporal.PlainMonthDayLike };
}

/** add Special Type placeholders to the keyof TypeValueMap */
export type Type = keyof TypeValueMap<any> | 'Enumify' | 'Pledge' | 'Tempo';
export type TypeValue<T> = { [K in Type]: { type: K, value: GetType<K, T> } }[Type];

/** late-binding Type utility for augmented modules */
export type GetType<K extends string, T = any> = K extends keyof TypeValueMap<T> ? TypeValueMap<T>[K]['value'] : any;

// https://dev.to/harry0000/a-bit-convenient-typescript-type-definitions-for-objectentries-d6g
type TupleEntry<T extends readonly unknown[], I extends unknown[] = [], R = never> =
	T extends readonly [infer Head, ...infer Tail]
	? TupleEntry<Tail, [...I, unknown], R | [`${I["length"]}`, Head]>
	: R

type ObjectEntry<T extends Property<any>> =
	T extends object
	? { [K in keyof T]: [T[K]] extends [never] ? never : [K, Required<T>[K]] }[keyof T] extends infer E
	? E extends [infer K extends string | number, infer V]
	? [`${K}`, V]
	: E extends [infer K extends symbol, infer V]
	? [K, V]
	: never
	: never
	: never

/** if T extends readonly[] => [number, T],   if T extends {} => [key:string, T] */
export type Entry<T extends Property<any>> =
	T extends readonly [unknown, ...unknown[]]
	? TupleEntry<T>
	: T extends ReadonlyArray<infer U>
	? [`${number}`, U]
	: ObjectEntry<T>

/** Object.entries<T> as [number,T][] */
export type Entries<T extends Property<T>> = ReadonlyArray<Entry<T>>
/** invert key-value object */
export type Inverse<T> = { [K in keyof T as (T[K] & PropertyKey)]: K }
/** assign array indexes as values in an object */
export type Index<T extends readonly any[]> = { [K in Entry<T> as `${K[1]}`]: ParseInt<K[0]> }

/** reverse a Tuple */
export type Reverse<T extends any[], R extends any[] = []> = ReturnType<T extends [infer F, ...infer L] ? () => Reverse<L, [F, ...R]> : () => R>
/** reverse a Record */
export type Invert<T extends Record<keyof T, keyof any>> = { [K in keyof T as T[K]]: K; }

// https://stackoverflow.com/questions/39494689/is-it-possible-to-restrict-number-to-a-certain-range/70307091#70307091
type EnumerateMin<N extends number, Acc extends number[] = []> = Acc["length"] extends N
	? Acc[number]
	: EnumerateMin<N, [...Acc, Acc["length"]]>
type EnumerateMax<N extends number, Acc extends number[] = []> = Acc["length"] extends N
	? ([...Acc, Acc["length"]])[number]											// add one more element to make 'inclusive' upper-range
	: EnumerateMax<N, [...Acc, Acc["length"]]>

/** declare expected range of values */
export type IntRange<Lower extends number, Upper extends number> = Exclude<EnumerateMax<Upper>, EnumerateMin<Lower>>

// branded object
declare const __brand: unique symbol
type Brand<B> = { [__brand]: B }
export type Branded<T, B> = T & Brand<B>

// JSON object with no own-properties
export type EmptyObject = { [__brand]?: never }

// https://www.youtube.com/watch?v=_-QYbP9rOhg&list=WL&index=1
type Length<T extends string, Count extends number[] = []> =
	T extends `${string}${infer Tail}`
	? Length<Tail, [...Count, 0]>
	: Count["length"]

type Compare<First extends number, Second extends number, Count extends number[] = []> =
	First extends Second
	? 0																											// equal
	: Count["length"] extends First
	? -1																											// first less than second
	: Count["length"] extends Second
	? 1																											// first more than second
	: Compare<First, Second, [...Count, 0]>

export type MaxLength<T extends string, Max extends number> =
	Compare<Length<T>, Max> extends -1 | 0 ? T : never
export type MinLength<T extends string, Min extends number> =
	Compare<Min, Length<T>> extends -1 | 0 ? T : never

export type InRange<T extends string, Min extends number, Max extends number> =
	MinLength<T, Min> & MaxLength<T, Max>

/**
 * return a substring of a string-type  
 * eg: Substr<Monday|Tuesday|Wednesday, 3> returns Mon|Tue|Wed  
 * U is the original string union  
 * Max is the number of chars to return  
 * Start is the offset (starting from '1')  
 */
export type Substring<U extends string, Max extends number, Start extends number = 1> =
	Substr<U, Max, Start>

/**
 * internal Type for Substring<> to recurse
 * Str is the string to build and return
 * Offset is an internal array used to assist with determining start-point of T
 */
type Substr<U, Max, Start, Str extends string = '', Offset extends number[] = [0]> =
	U extends `${infer NextChar}${infer Rest}`								// if there is a next-char (and optional trail-chars)
	? Offset["length"] extends Start													// if offset beginning of U reached
	? Length<Str> extends Max																// if length of Str is equal to Max
	? Str																										// return Str, all done
	: Substr<Rest, Start, Max, `${Str}${NextChar}`, Offset>	// else Str less than Max; recurse & append NextChar to Str
	: Substr<Rest, Start, Max, Str, [...Offset, 0]>					// else offset not reached; recurse & increment offset-Count
	: Str																										// else no more chars; return Str

// https://stackoverflow.com/questions/69571110/how-to-turn-union-into-a-tuple-in-typescript
// UnionToIntersection<A | B> = A & B
type UnionToIntersection<U> = (U extends unknown ? (arg: U) => 0 : never) extends (arg: infer I) => 0
	? I
	: never

// LastInUnion<A | B> = B
type LastInUnion<U> = UnionToIntersection<U extends unknown ? (x: U) => 0 : never> extends (x: infer L) => 0
	? L
	: never

/**
 * convert a Union to a Tuple.  
 * usage: UnionToTuple<A | B> = [A, B]
 */
export type UnionToTuple<T, Acc extends any[] = [], Last = LastInUnion<T>> =
	Acc['length'] extends SafeRecursion ? T[] :							// limit of recursive depth
	[T] extends [never] ? Acc :
	UnionToTuple<Exclude<T, Last>, [Last, ...Acc]>

/** Deep Readonly object for type safety */
export type Secure<T> = T extends Primitive | Function | Date | RegExp | Error | Map<any, any> | Set<any> | Promise<any>
	? T
	: T extends (infer R)[]
	? SecureArray<R>
	: T extends object
	? SecureObject<T>
	: T
export interface SecureArray<T> extends ReadonlyArray<Secure<T>> { }
export type SecureObject<T> = { readonly [K in keyof T]: Secure<T[K]> };

type LooseString = (string & {})
type LooseSymbol = (symbol & {})
type LooseProperty = (PropertyKey & {})

// https://www.youtube.com/watch?v=lraHlXpuhKs&t=43s
/** Loose union */
export type LooseUnion<T extends string> = T | LooseString
/** Loose property key */
export type LooseKey<K extends PropertyKey = string> = K | LooseProperty
// /** Loose auto-complete */
// export type LooseRecord<T extends Property<any>> = Partial<T> & Record<PropertyKey, any>

/** Extend an object with a generic-signature */
export type Extend<T, K extends PropertyKey = string, V = any> = T & { [P in K]: V }
