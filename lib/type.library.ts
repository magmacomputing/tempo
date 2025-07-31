import { Tempo } from '#core/shared/tempo.class.js';
import { Pledge } from '#core/shared/pledge.class.js';

// TODO:  remove this after Temporal reaches Stage-4
import { Temporal } from '@js-temporal/polyfill';

/** the primitive type reported by toStringTag() */
const protoType = (obj?: unknown) => Object.prototype.toString.call(obj).slice(8, -1);

/** 
 * return an object's type as a ProperCase string.  
 * if instance, return Class name
 */
export const getType = (obj?: any, ...instances: Instance[]) => {
	const type = protoType(obj);

	switch (true) {
		case type === 'Object':
			let name = obj.constructor?.name ?? 'Object';					// some Objects do not have a constructor method

			switch (true) {
				case name !== 'Object':
					break;
				case isArrayLike(obj):															// special case Object: ArrayLike
					name = 'ArrayLike';
					break;
			}

			return (instances
				.find(inst => obj instanceof inst.class)?.type			// allow for 'real' name of Instance, after minification
				?? name) as Types;																	// return Object name

		case type === 'Function' && obj.valueOf().toString().startsWith('class '):
			return 'Class';

		default:
			return type as Types;
	}
}

/** return TypeValue<T> object */
export const asType = <T>(value?: T, ...instances: Instance[]) => {
	const type = getType(value, ...instances);

	return ({ type, value }) as TypeValue<T>
}

/** assert value is one of a list of Types */
export const isType = <T>(obj: unknown, ...types: Types[]): obj is T => types.includes(getType(obj));

/** Type-Guards: assert \<obj> is of \<type> */
export const isPrimitive = (obj?: unknown): obj is Primitive => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Void', 'Null', 'Empty');
export const isReference = (obj?: unknown): obj is Object => !isPrimitive(obj);
export const isIterable = <T>(obj: unknown): obj is Iterable<T> => Symbol.iterator in Object(obj) && !isString(obj);

export const isString = <T>(obj?: T): obj is Extract<T, string> => isType(obj, 'String');
export const isNumber = <T>(obj?: T): obj is Extract<T, number> => isType(obj, 'Number');
export const isInteger = <T>(obj?: T): obj is Extract<T, bigint> => isType(obj, 'BigInt');
export const isDigit = <T>(obj?: T): obj is Extract<T, number | bigint> => isType(obj, 'Number', 'BigInt');
export const isBoolean = <T>(obj?: T): obj is Extract<T, boolean> => isType(obj, 'Boolean');
export const isArray = <T>(obj: unknown): obj is T[] => isType(obj, 'Array');
// export const isArray = <T>(obj?: T): obj is Extract<T, any[]> => isType(obj, 'Array');
export const isArrayLike = <T>(obj: any): obj is ArrayLike<T> => protoType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
export const isObject = <T>(obj?: T): obj is Extract<T, Record<any, any>> => isType(obj, 'Object');
export const isDate = <T>(obj?: T): obj is Extract<T, Date> => isType(obj, 'Date');
export const isRegExp = <T>(obj?: T): obj is Extract<T, RegExp> => isType(obj, 'RegExp');
export const isSymbol = <T>(obj?: T): obj is Extract<T, symbol> => isType(obj, 'Symbol');
export const isSymbolFor = <T>(obj?: T): obj is Extract<T, symbol> => isType<symbol>(obj, 'Symbol') && Symbol.keyFor(obj) !== void 0;
export const isPropertyKey = (obj?: unknown): obj is PropertyKey => isType<PropertyKey>(obj, 'String', 'Number', 'Symbol');

export const isNull = <T>(obj?: T): obj is Extract<T, null> => isType(obj, 'Null');
export const isNullish = <T>(obj: T): obj is Extract<T, Nullish> => isType<undefined | null | void>(obj, 'Null', 'Undefined', 'Void', 'Empty');
export const isUndefined = <T>(obj?: T): obj is undefined => isType<undefined>(obj, 'Undefined', 'Void', 'Empty');
export const isDefined = <T>(obj: T): obj is NonNullable<T> => !isNullish(obj);

export const isClass = <T>(obj?: T): obj is Extract<T, Function> => isType(obj, 'Class');
export const isFunction = <T>(obj?: T): obj is Extract<T, Function> => isType<Function>(obj, 'Function', 'AsyncFunction');
export const isPromise = <T>(obj?: T): obj is Extract<T, Promise<any>> => isType(obj, 'Promise');
export const isMap = <K, V>(obj?: unknown): obj is Map<K, V> => isType(obj, 'Map');
export const isSet = <K>(obj?: unknown): obj is Set<K> => isType(obj, 'Set');
export const isError = (err: unknown): err is Error => isType(err, 'Error');
export const isTemporal = <T>(obj: T): obj is Extract<T, Temporals> => protoType(obj).startsWith('Temporal.');

// non-standard Objects
// export const isEnumify = <E>(obj: unknown): obj is Enumify<E> => isType(obj, 'Enumify');
export const isTempo = (obj: unknown): obj is Tempo => isType(obj, 'Tempo');
// export const isPledge = <P>(obj: unknown): obj is Pledge<P> => isType(obj, 'Pledge');

export const nullToZero = <T>(obj: T) => obj ?? 0;
export const nullToEmpty = <T>(obj: T) => obj ?? '';
export const nullToValue = <T, R>(obj: T, value: R) => obj ?? value;

/** object has no values */
export const isEmpty = <T>(obj?: T) => false
	|| isNullish(obj)
	|| (isObject(obj) && (Reflect.ownKeys(obj).length === 0))
	|| (isString(obj) && (obj.trim().length === 0))
	|| (isNumber(obj) && (isNaN(obj) === false))
	|| (isArray(obj) && (obj.length === 0))
	|| (isSet(obj) && (obj.size === 0))
	|| (isMap(obj) && (obj.size === 0))

export function assertCondition(condition: boolean, message?: string): asserts condition {
	if (!condition)
		throw new Error(message);
}
export function assertString(str: unknown): asserts str is string { assertCondition(isString(str), `Invalid string: ${str}`) };
export function assertNever(val: never): asserts val is never { throw new Error(`Unexpected object: ${val}`) };

/** infer T of a <T | T[]> */
export type TValue<T> = T extends Array<infer A> ? A : NonNullable<T>;
/** cast <T | undefined> as <T | T[]> */
export type TValues<T> = TValue<T> | Array<TValue<T>> | Extract<T, undefined>;
/** cast <T | T[]> as T[] */
export type TArray<T> = Array<TValue<T>>;

/** bottom value */
export type Nullish = null | undefined | void;

export type KeyOf<T> = keyof T;
export type ValueOf<T> = T[keyof T];
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Generic Record */
export type Property<T> = Record<PropertyKey, T>

/** Record with only one-key */
export type OneKey<K extends keyof any, V, KK extends keyof any = K> =
	{ [P in K]: { [Q in P]: V } &
	{ [Q in Exclude<KK, P>]?: undefined } extends infer O ?
		{ [Q in keyof O]: O[Q] } : never
	}[K]

export type Prettify<T> = { [K in keyof T]: T[K]; } & {}
export type ParseInt<T> = T extends `${infer N extends number}` ? N : never
export type TPlural<T extends string> = `${T}s`;

type Primitive = string | number | bigint | boolean | symbol | void | undefined | null // TODO: add  record | tuple
type Instance = { type: string, class: Function }						// allow for Class instance re-naming (to avoid minification mangling issues)
export type Temporals = Exclude<keyof typeof Temporal, 'Now'>;

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	export type Types =
		| 'String'
		| 'Number'
		| 'BigInt'
		| 'Boolean'
		| 'Object'
		| 'Array' | 'ArrayLike'
		| 'Null'
		| 'Undefined' | 'Void' | 'Empty'
		| 'Date'
		| 'Function' | 'AsyncFunction'
		| 'Class'
		| 'Promise'
		| 'RegExp'
		| 'Blob'
		| 'Map'
		| 'Set'
		| 'WeakMap' | 'WeakSet' | 'WeakRef'
		| 'Symbol'
		| 'Error'

		| 'Temporal'
		| 'Temporal.Instant'
		| 'Temporal.ZonedDateTime'
		| 'Temporal.PlainDateTime'
		| 'Temporal.PlainDate'
		| 'Temporal.PlainTime'
		| 'Temporal.PlainYearMonth'
		| 'Temporal.PlainMonthDay'

		| 'Enumify'
		| 'Tempo'
		| 'Pledge'

export type TypeValue<T> =
	| { type: 'String', value: string }
	| { type: 'Number', value: number }
	| { type: 'BigInt', value: bigint }
	| { type: 'Boolean', value: boolean }
	| { type: 'Object', value: Extract<T, Property<unknown>> }
	| { type: 'Array', value: Array<T> }
	| { type: 'ArrayLike', value: ArrayLike<T> }
	| { type: 'Undefined', value: undefined }
	| { type: 'Null', value: null }
	| { type: 'Void', value: void }
	| { type: 'Empty', value: unknown }
	| { type: 'Date', value: Date }
	| { type: 'Function', value: Function }
	| { type: 'Class', value: T }
	| { type: 'Promise', value: Promise<T> }
	| { type: 'RegExp', value: RegExp }
	| { type: 'Blob', value: Blob }
	| { type: 'Map', value: Map<any, T> }
	| { type: 'Set', value: Set<T> }
	| { type: 'WeakSet', value: WeakSet<Property<unknown>> }
	| { type: 'WeakMap', value: WeakMap<Property<unknown>, T> }
	// | { type: 'WeakRef', value: WeakRef<Property<unknown>, T> }
	| { type: 'Symbol', value: symbol }
	| { type: 'Error', value: Error }

	| { type: 'Temporal', value: Temporals }
	| { type: 'Temporal.Instant', value: Temporal.Instant }
	| { type: 'Temporal.ZonedDateTime', value: Temporal.ZonedDateTime }
	| { type: 'Temporal.PlainDateTime', value: Temporal.PlainDateTime }
	| { type: 'Temporal.PlainDate', value: Temporal.PlainDate }
	| { type: 'Temporal.PlainTime', value: Temporal.PlainTime }
	| { type: 'Temporal.PlainYearMonth', value: Temporal.PlainYearMonth }
	| { type: 'Temporal.PlainMonthDay', value: Temporal.PlainMonthDay }

	| { type: 'Tempo', value: Tempo }
	| { type: 'Pledge', value: Pledge<T> }
	| { type: 'Enumify', value: Property<T> }

// https://dev.to/harry0000/a-bit-convenient-typescript-type-definitions-for-objectentries-d6g
type TupleEntry<T extends readonly unknown[], I extends unknown[] = [], R = never> =
	T extends readonly [infer Head, ...infer Tail]
	? TupleEntry<Tail, [...I, unknown], R | [`${I['length']}`, Head]>
	: R

type ObjectEntry<T extends Property<any>> =
	T extends object
	? { [K in keyof T]: [K, Required<T>[K]] }[keyof T] extends infer E
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
export type Inverse<T> = { [K in keyof T as (T[K] & PropertyKey)]: K }
export type Index<T extends readonly any[]> = { [K in Entry<T> as `${K[1]}`]: ParseInt<K[0]> }

/** reverse a Tuple */
export type Reverse<T extends any[], R extends any[] = []> = ReturnType<T extends [infer F, ...infer L] ? () => Reverse<L, [F, ...R]> : () => R>
/** reverse a Record */
export type Invert<T extends Record<keyof T, keyof any>> = { [K in keyof T as T[K]]: K; }

// https://stackoverflow.com/questions/39494689/is-it-possible-to-restrict-number-to-a-certain-range/70307091#70307091
type EnumerateMin<N extends number, Acc extends number[] = []> = Acc['length'] extends N
	? Acc[number]
	: EnumerateMin<N, [...Acc, Acc['length']]>
type EnumerateMax<N extends number, Acc extends number[] = []> = Acc['length'] extends N
	? ([...Acc, Acc['length']])[number]												// add one more element to make 'inclusive' upper-range
	: EnumerateMax<N, [...Acc, Acc['length']]>

/** declare expected range of values */
export type IntRange<Lower extends number, Upper extends number> = Exclude<EnumerateMax<Upper>, EnumerateMin<Lower>>

// branded object
declare const __brand: unique symbol
type Brand<B> = { [__brand]: B }
export type Branded<T, B> = T & Brand<B>

// JSON object with zero properties
export type EmptyObject = { [__brand]?: never }

// https://www.youtube.com/watch?v=_-QYbP9rOhg&list=WL&index=1
type Length<T extends string, Count extends number[] = []> =
	T extends `${string}${infer Tail}`
	? Length<Tail, [...Count, 0]>
	: Count['length']

type Compare<First extends number, Second extends number, Count extends number[] = []> =
	First extends Second
	? 0																												// equal
	: Count['length'] extends First
	? -1																											// first less than second
	: Count['length'] extends Second
	? 1																												// first more than second
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
 * T is the original string union  
 * Max is the number of chars to return  
 * Start is the offset (starting from '1')  
 */
export type Substring<T extends string, Max extends number, Start extends number = 1> =
	Substr<T, Start, Max, '', [0]>

/**
 * internal Type to for Substring<> to recurse
 * Str is the string to build and return
 * Offset is an internal array used to assist with determining start-point of T
 */
type Substr<T, Start, Max, Str extends string, Offset extends number[]> =
	T extends `${infer NextChar}${infer Rest}`								// if there is a next-char (and optional trail-chars)
	? Offset['length'] extends Start													// if offset beginning of T reached
	? Length<Str> extends Max																	// if length of Str is equal to Max
	? Str																											// return Str, all done
	: Substr<Rest, Start, Max, `${Str}${NextChar}`, Offset>		// else Str less than Max; recurse & append NextChar to Str
	: Substr<Rest, Start, Max, Str, [...Offset, 0]>						// else offset not reached; recurse & increment offset-Count
	: Str																											// else no more chars; return Str

// https://stackoverflow.com/questions/69571110/how-to-turn-union-into-a-tuple-in-typescript
// UnionToIntersection<A | B> = A & B
type UnionToIntersection<U> = (U extends unknown ? (arg: U) => 0 : never) extends (arg: infer I) => 0
	? I
	: never

// LastInUnion<A | B> = B
type LastInUnion<U> = UnionToIntersection<U extends unknown ? (x: U) => 0 : never> extends (x: infer L) => 0
	? L
	: never

// UnionToTuple<A | B> = [A, B]
type UnionToTuple<T, Last = LastInUnion<T>> = [T] extends [never]
	? []
	: [...UnionToTuple<Exclude<T, Last>>, Last]

// Count the members of a Union	
export type Count<T> = UnionToTuple<T>["length"]

// DeepReadonly type for type safety
export type Secure<T> = T extends (infer R)[]
	? SecureArray<R>
	: T extends Function
	? T
	: T extends object
	? SecureObject<T>
	: T

interface SecureArray<T> extends ReadonlyArray<Secure<T>> { }

type SecureObject<T> = {
	readonly [K in keyof T]: Secure<T[K]>;
}
