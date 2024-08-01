import type { Tempo } from '@module/shared/tempo.class.js';
import type { Pledge } from '@module/shared/pledge.class.js';
import type { Enum } from '@module/shared/enumerate.library.js';

// TODO:  remove this after Temporal reaches Stage-4
// import { Temporal } from '@js-temporal/polyfill';
import 'temporal-polyfill/global';

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
			let name = obj.constructor?.name || 'Object';					// some Objects do not have a constructor method

			switch (true) {
				case name !== 'Object':
					break;
				case isArrayLike(obj):															// special case Object
					name = 'ArrayLike';
					break;
			}

			return (instances.find(inst => obj instanceof inst.class)?.type	// allow for 'real' name of Instance, after minification
				|| name) as Types;																	// return Object name

		case type === 'Function' && obj.valueOf().toString().startsWith('class '):
			return 'Class';

		default:
			return type as Types;
	}
}

/** convert value to TypeValue<T> object */
export const asType = <T>(obj?: T, ...instances: Instance[]) => {
	const type = getType(obj, ...instances);
	return ({
		type,
		value: type === 'Enum' ? (obj as any).enum?.() : obj,		// kludge to return enum-type
	}) as TypeValue<T>
}

/** assert value is one of a list of Types */
export const isType = <T>(obj: unknown, ...types: Types[]): obj is T => types.includes(getType(obj));

/** Type-Guards: assert \<obj> is of \<type> */
export const isPrimitive = (obj?: unknown): obj is Primitive => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Void', 'Null', 'Record', 'Tuple');
export const isReference = (obj?: unknown): obj is Object => !isPrimitive(obj);
export const isIterable = <T>(obj: unknown): obj is Iterable<T> => Symbol.iterator in Object(obj) && !isString(obj);

export const isString = <T>(obj?: T): obj is Extract<T, string> => isType(obj, 'String');
export const isNumber = <T>(obj?: T): obj is Extract<T, number> => isType(obj, 'Number');
export const isInteger = <T>(obj?: T): obj is Extract<T, bigint> => isType(obj, 'BigInt');
export const isDigit = <T>(obj?: T): obj is Extract<T, number | bigint> => isType(obj, 'Number', 'BigInt');
export const isBoolean = <T>(obj?: T): obj is Extract<T, boolean> => isType(obj, 'Boolean');
export const isArray = <T>(obj: T | T[]): obj is Array<T> => isType(obj, 'Array');
export const isArrayLike = <T>(obj: any): obj is ArrayLike<T> => protoType(obj) === 'Object' && Object.keys(obj).includes('length') && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
export const isObject = <T>(obj?: T): obj is Extract<T, Record<any, any>> => isType(obj, 'Object');
export const isDate = <T>(obj?: T): obj is Extract<T, Date> => isType(obj, 'Date');
export const isRegExp = <T>(obj?: T): obj is Extract<T, RegExp> => isType(obj, 'RegExp');
export const isSymbol = <T>(obj?: T): obj is Extract<T, symbol> => isType(obj, 'Symbol');
export const isSymbolFor = <T>(obj?: T): obj is Extract<T, symbol> => isType<symbol>(obj, 'Symbol') && Symbol.keyFor(obj) !== void 0;

// TODO
export const isRecord = <T>(obj?: T): obj is Readonly<Extract<T, Record<any, any>>> => isType(obj, 'Record');
export const isTuple = <T>(obj?: T): obj is Readonly<Extract<T, Array<T>>> => isType(obj, 'Tuple');

export const isNull = <T>(obj?: T): obj is Extract<T, null> => isType(obj, 'Null');
export const isNullish = <T>(obj: T): obj is Extract<T, Nullish> => isType<undefined | null | void>(obj, 'Null', 'Undefined', 'Void', 'Empty');
export const isUndefined = <T>(obj?: T): obj is undefined => isType<undefined>(obj, 'Undefined', 'Void');
export const isDefined = <T>(obj: T): obj is NonNullable<T> => !isNullish(obj);

export const isClass = <T>(obj?: T): obj is Extract<T, Function> => isType(obj, 'Class');
export const isFunction = <T>(obj?: T): obj is Extract<T, Function> => isType(obj, 'Function', 'AsyncFunction');
export const isPromise = <T>(obj?: T): obj is Extract<T, Promise<any>> => isType(obj, 'Promise');
export const isMap = <K, V>(obj?: unknown): obj is Map<K, V> => isType(obj, 'Map');
export const isSet = <K>(obj?: unknown): obj is Set<K> => isType(obj, 'Set');
export const isError = (err: unknown): err is Error => isType(err, 'Error');
export const isTemporal = <T>(obj: T): obj is Extract<T, Temporals> => protoType(obj).startsWith('Temporal.');

// non-standard Objects
export const isEnum = <E>(obj: unknown): obj is Enum<E> => isType(obj, 'Enum');
export const isTempo = (obj: unknown): obj is Tempo => isType(obj, 'Tempo');
export const isPledge = <P>(obj: unknown): obj is Pledge<P> => isType(obj, 'Pledge');

export const nullToZero = <T>(obj: T) => obj ?? 0;
export const nullToEmpty = <T>(obj: T) => obj ?? '';
export const nullToValue = <T, R>(obj: T, value: R) => obj ?? value;

/** object has no values */
export const isEmpty = <T>(obj?: T) => false
	|| isNullish(obj)
	|| (isObject(obj) && Object.keys(obj as Record<any, any>).length === 0)
	|| (isString(obj) && obj.trim().length === 0)
	|| (isNumber(obj) && isNaN(obj) === false)
	|| (isArray(obj) && obj.length === 0)
	|| (isSet(obj) && obj.size === 0)
	|| (isMap(obj) && obj.size === 0)
	|| (isTuple(obj) && obj.length === 0)
	|| (isRecord(obj) && Object.keys(obj).length === 0)

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
export type TPlural<T extends string> = `${T}s`;
export type ValueOf<T> = T[keyof T];
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Record with only one-key */
export type OneKey<K extends keyof any, V, KK extends keyof any = K> =
	{ [P in K]: { [Q in P]: V } &
		{ [Q in Exclude<KK, P>]?: undefined } extends infer O ?
		{ [Q in keyof O]: O[Q] } : never
	}[K]

export type ParseInt<T> = T extends `${infer N extends number}` ? N : never

type Primitive = string | number | bigint | boolean | symbol | void | undefined | null // TODO: add  record | tuple
type Instance = { type: string, class: Function }						// allow for Class instance re-naming (to avoid minification mangling)
export type Temporals = Exclude<keyof typeof Temporal, 'Now'>;

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

export type Types =
	'String' |
	'Number' |
	'BigInt' |
	'Boolean' |
	'Object' |
	'Array' | 'ArrayLike' |
	'Null' |
	'Undefined' | 'Void' | 'Empty' |
	'Date' |
	'Function' | 'AsyncFunction' |
	'Class' |
	'Promise' |
	'RegExp' |
	'Blob' |
	'Map' |
	'Set' |
	'WeakMap' | 'WeakSet' | 'WeakRef' |
	'Symbol' |
	'Error' |
	'Record' |
	'Tuple' |

	'Temporal' |
	'Temporal.Instant' |
	'Temporal.ZonedDateTime' |
	'Temporal.PlainDateTime' |
	'Temporal.PlainDate' |
	'Temporal.PlainTime' |
	'Temporal.PlainYearMonth' |
	'Temporal.PlainMonthDay' |

	'Enum' |
	'Tempo' |
	'Pledge'

export type TypeValue<T> =
	{ type: 'String', value: string } |
	{ type: 'Number', value: number } |
	{ type: 'BigInt', value: bigint } |
	{ type: 'Boolean', value: boolean } |
	{ type: 'Object', value: Extract<T, Record<PropertyKey, unknown>> } |
	{ type: 'Array', value: Array<T> } |
	{ type: 'ArrayLike', value: ArrayLike<T> } |
	{ type: 'Undefined', value: undefined } |
	{ type: 'Null', value: null } |
	{ type: 'Void', value: void } |
	{ type: 'Empty', value: unknown } |
	{ type: 'Date', value: Date } |
	{ type: 'Function', value: Function } |
	{ type: 'Class', value: T } |
	{ type: 'Promise', value: Promise<T> } |
	{ type: 'RegExp', value: RegExp } |
	{ type: 'Blob', value: Blob } |
	{ type: 'Map', value: Map<any, T> } |
	{ type: 'Set', value: Set<T> } |
	{ type: 'WeakMap', value: WeakMap<Record<PropertyKey, unknown>, T> } |
	{ type: 'WeakSet', value: WeakSet<Record<PropertyKey, unknown>> } |
	// { type: 'WeakRef', value: WeakRef<Record<PropertyKey, any>, T> }
	{ type: 'Symbol', value: symbol } |
	{ type: 'Error', value: Error } |

	{ type: 'Record', value: Record<PropertyKey, T> } |				// TODO
	{ type: 'Tuple', value: Array<T> } |											// TODO

	{ type: 'Temporal', value: Temporals } |
	{ type: 'Temporal.Instant', value: Temporal.Instant } |
	{ type: 'Temporal.ZonedDateTime', value: Temporal.ZonedDateTime } |
	{ type: 'Temporal.PlainDateTime', value: Temporal.PlainDateTime } |
	{ type: 'Temporal.PlainDate', value: Temporal.PlainDate } |
	{ type: 'Temporal.PlainTime', value: Temporal.PlainTime } |
	{ type: 'Temporal.PlainYearMonth', value: Temporal.PlainYearMonth } |
	{ type: 'Temporal.PlainMonthDay', value: Temporal.PlainMonthDay } |

	{ type: 'Enum', value: Record<PropertyKey, T> } |
	{ type: 'Tempo', value: Tempo } |
	{ type: 'Pledge', value: Pledge<T> }

// https://dev.to/harry0000/a-bit-convenient-typescript-type-definitions-for-objectentries-d6g
type TupleEntry<T extends readonly unknown[], I extends unknown[] = [], R = never> =
	T extends readonly [infer Head, ...infer Tail]
	? TupleEntry<Tail, [...I, unknown], R | [`${I['length']}`, Head]>
	: R

type ObjectEntry<T extends {}> =
	T extends object
	? { [K in keyof T]: [K, Required<T>[K]] }[keyof T] extends infer E
	? E extends [infer K extends string | number, infer V]
	? [`${K}`, V]
	: never
	: never
	: never

/** if T extends readonly[] => [number, T],   if T extends {} => [key:string, T] */
export type Entry<T extends {}> =
	T extends readonly [unknown, ...unknown[]]
	? TupleEntry<T>
	: T extends ReadonlyArray<infer U>
	? [`${number}`, U]
	: ObjectEntry<T>

/** Object.entries<T> as [number,T][] */
export type Entries<T extends {}> = ReadonlyArray<Entry<T>>
export type Inverse<T> = {[K in keyof T as (T[K] & (string | number))]: K};
export type Index<T extends readonly any[]> = { [K in Entry<T> as `${K[1]}`]: ParseInt<K[0]> } //& { [K in Entry<T> as K[0]]: K[1] }

// https://stackoverflow.com/questions/39494689/is-it-possible-to-restrict-number-to-a-certain-range/70307091#70307091
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

export type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>
