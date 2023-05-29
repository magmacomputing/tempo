import type { Tempo } from '@module/shared/tempo.class.js';
import type { Pledge } from '@module/shared/pledge.class.js';

// TODO:  remove this after Temporal reaches Stage-4
import { Temporal } from '@js-temporal/polyfill';

/** the actual type reported by ECMAScript */
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
export const asType = <T>(obj?: T, ...instances: Instance[]) => ({ type: getType(obj, ...instances), value: obj } as TypeValue<T>);
/** assert value is one of a list of Types */
export const isType = <T>(obj: unknown, ...types: Types[]): obj is T => types.includes(getType(obj));

/** Type-Guards: assert \<obj> is of \<type> */
export const isPrimitive = (obj?: unknown): obj is Primitive => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Void', 'Null', 'Record', 'Tuple');
export const isReference = (obj?: unknown): obj is Object => !isPrimitive(obj);
export const isIterable = <T>(obj: unknown): obj is Iterable<T> => Symbol.iterator in Object(obj) && !isString(obj);

export const isString = (obj?: unknown): obj is string => isType(obj, 'String');
export const isNumber = (obj?: unknown): obj is number => isType(obj, 'Number');
export const isInteger = (obj?: unknown): obj is bigint => isType(obj, 'BigInt');
export const isDigit = (obj?: unknown): obj is number | bigint => isType(obj, 'Number', 'BigInt');
export const isBoolean = <T>(obj?: T): obj is Extract<T, boolean> => isType(obj, 'Boolean');
export const isArray = <T>(obj: T | T[]): obj is Array<T> => isType(obj, 'Array');
export const isArrayLike = <T>(obj: any): obj is ArrayLike<T> => protoType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
export const isObject = <T>(obj?: unknown): obj is Record<string, any> => isType(obj, 'Object');
export const isDate = (obj?: unknown): obj is Date => isType(obj, 'Date');
export const isRegExp = (obj?: unknown): obj is RegExp => isType(obj, 'RegExp');
// TODO
export const isRecord = (obj?: unknown): obj is Record<any, any> => isType(obj, 'Record');
export const isTuple = <T>(obj?: unknown): obj is Array<T> => isType(obj, 'Tuple');

export const isNull = (obj?: unknown): obj is null => isType(obj, 'Null');
export const isNullish = (obj: {} | Nullish): obj is Nullish => isType<undefined | null | void>(obj, 'Null', 'Undefined', 'Void', 'Empty');
export const isUndefined = (obj?: unknown): obj is undefined => isType<undefined>(obj, 'Undefined');
export const isDefined = <T>(obj: T): obj is NonNullable<T> => !isNullish(obj);

export const isClass = (obj?: unknown): obj is Function => isType(obj, 'Class');
export const isFunction = (obj?: unknown): obj is Function => isType(obj, 'Function', 'AsyncFunction');
export const isPromise = <T>(obj?: unknown): obj is Promise<T> => isType(obj, 'Promise');
export const isMap = <K, V>(obj?: unknown): obj is Map<K, V> => isType(obj, 'Map');
export const isSet = <K>(obj?: unknown): obj is Set<K> => isType(obj, 'Set');
export const isError = (err: unknown): err is Error => isType(err, 'Error');
export const isTemporal = (obj: unknown): obj is Temporals => protoType(obj).startsWith('Temporal.');

export const nullToZero = <T>(obj: T) => obj ?? 0;
export const nullToEmpty = <T>(obj: T) => obj ?? '';
export const nullToValue = <T, R>(obj: T, value: R) => obj ?? value;

/** object has no values */
export const isEmpty = <T>(obj?: T) => false
	|| isNullish(obj)
	|| (isObject(obj) && Object.keys(obj).length === 0)
	|| (isString(obj) && obj.trim().length === 0)
	|| (isArray(obj) && obj.length === 0)
	|| (isRecord(obj) && Object.keys(obj).length === 0)
	|| (isTuple<T>(obj) && obj.length === 0)
	|| (isSet(obj) && obj.size === 0)
	|| (isMap(obj) && obj.size === 0)

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

/** bottom values */
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

type Primitive = string | number | bigint | boolean | symbol | void | undefined | null // TODO: add  record | tuple
type Instance = { type: string, class: Function }						// allow for Class instance re-naming (to avoid minification mangling)
export type Temporals = Exclude<keyof typeof Temporal, 'Now'>;

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

	'Tempo' |
	'Pledge'

export type TypeValue<T> =
	{ type: 'String', value: string } |
	{ type: 'Number', value: number } |
	{ type: 'BigInt', value: bigint } |
	{ type: 'Boolean', value: boolean } |
	{ type: 'Object', value: Extract<T, Record<any, any>> } |
	{ type: 'Array', value: Array<T> } |
	{ type: 'ArrayLike', value: ArrayLike<T> } |
	{ type: 'Undefined', value: undefined } |
	{ type: 'Null', value: null } |
	{ type: 'Void', value: void } |
	{ type: 'Date', value: Date } |
	{ type: 'Function', value: Function } |
	{ type: 'Class', value: T } |
	{ type: 'Promise', value: Promise<T> } |
	{ type: 'RegExp', value: RegExp } |
	{ type: 'Blob', value: Blob } |
	{ type: 'Map', value: Map<any, T> } |
	{ type: 'Set', value: Set<T> } |
	{ type: 'WeakMap', value: WeakMap<Record<string, any>, T> } |
	{ type: 'WeakSet', value: WeakSet<Record<string, any>> } |
	// { type: 'WeakRef', value: WeakRef<Record<string, any>, T> }
	{ type: 'Symbol', value: Symbol } |
	{ type: 'Error', value: Error } |

	{ type: 'Record', value: Record<string, T> } |						// TODO
	{ type: 'Tuple', value: Array<T> } |											// TODO

	{ type: 'Temporal', value: Temporals } |
	{ type: 'Temporal.Instant', value: Temporal.Instant } |
	{ type: 'Temporal.ZonedDateTime', value: Temporal.ZonedDateTime } |
	{ type: 'Temporal.PlainDateTime', value: Temporal.PlainDateTime } |
	{ type: 'Temporal.PlainDate', value: Temporal.PlainDate } |
	{ type: 'Temporal.PlainTime', value: Temporal.PlainTime } |
	{ type: 'Temporal.PlainYearMonth', value: Temporal.PlainYearMonth } |
	{ type: 'Temporal.PlainMonthDay', value: Temporal.PlainMonthDay } |

	{ type: 'Tempo', value: Tempo } |
	{ type: 'Pledge', value: Pledge<T> }
