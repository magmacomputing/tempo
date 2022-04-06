import type { Tempo } from '@module/shared/tempo.class';
import type { Pledge } from '@module/shared/pledge.class';

// TODO:  remove this after Temporal reaches Stage-4
import { Temporal } from '@js-temporal/polyfill';


/** the actual type reported by ECMAScript */
const esType = (obj?: unknown) => Object.prototype.toString.call(obj).slice(8, -1);

/**
 * return a ProperCase string of an object's type.  
 * If instance, return Class name
 */
export const getType = (obj?: any, ...instances: Instance[]) => {
	const type = esType(obj);

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

			return (instances.find(inst => obj instanceof inst.class)?.type	// allow for 'real' name for Instance, after minification
				|| name) as Types;																	// return Object name

		case type === 'Function' && obj.valueOf().toString().startsWith('class '):
			return 'Class';

		default:
			return type as Types;
	}
}

export const asType = <T>(obj?: T, ...instances: Instance[]) => ({ type: getType(obj, ...instances), value: obj } as TypeValue<T>);
export const isType = <T>(obj: unknown, type: Types, ...types: Types[]): obj is T => [type, ...types].includes(getType(obj));

/** Type-Guards: return a boolean to test \<obj> is of \<type> */
export const isPrimitive = (obj?: unknown): obj is Primitive => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Null');
export const isReference = (obj?: unknown): obj is Object => !isPrimitive(obj);
export const isIterable = <T>(obj: unknown): obj is Iterable<T> => Symbol.iterator in Object(obj) && !isString(obj);

export const isString = (obj?: unknown): obj is string => isType(obj, 'String');
export const isNumber = (obj?: unknown): obj is number => isType(obj, 'Number');
export const isInteger = (obj?: unknown): obj is bigint => isType(obj, 'BigInt');
export const isBoolean = <T>(obj?: T): obj is Extract<T, boolean> => isType(obj, 'Boolean');
export const isArray = <T>(obj?: T | Array<T>): obj is Array<T> => isType(obj, 'Array');
export const isArrayLike = <T>(obj: any): obj is ArrayLike<T> => esType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
export const isObject = <T>(obj?: T): obj is Extract<T, Record<any, any>> => isType(obj, 'Object');
export const isDate = (obj?: unknown): obj is Date => isType(obj, 'Date');
export const isRegExp = (obj?: unknown): obj is RegExp => isType(obj, 'RegExp');
// TODO
export const isRecord = (obj?: unknown): obj is Record<any, any> => isType(obj, 'Record');
export const isTuple = <T>(obj?: unknown): obj is Array<T> => isType(obj, 'Tuple');

export const isNull = (obj?: unknown): obj is null => isType(obj, 'Null');
export const isNullish = <T>(obj: T | null | void): obj is void | null => isType<void | null>(obj, 'Null', 'Undefined');
export const isUndefined = (obj?: unknown): obj is void => isType<void>(obj, 'Undefined');
export const isDefined = <T>(obj: T): obj is NonNullable<T> => !isNullish(obj);

export const isClass = (obj?: unknown): obj is Function => isType(obj, 'Class');
export const isFunction = (obj?: unknown): obj is Function => isType(obj, 'Function', 'AsyncFunction');
export const isPromise = <T>(obj?: unknown): obj is Promise<T> => isType(obj, 'Promise');
export const isMap = <K, V>(obj?: unknown): obj is Map<K, V> => isType(obj, 'Map');
export const isSet = <K>(obj?: unknown): obj is Set<K> => isType(obj, 'Set');
export const isError = (err: unknown): err is Error => isType(err, 'Error');
export const isTemporal = (obj: unknown): obj is Temporals => esType(obj).startsWith('Temporal.');

export const nullToZero = <T>(obj: T) => obj ?? 0;
export const nullToEmpty = <T>(obj: T) => obj ?? '';
export const nullToValue = <T, R>(obj: T, value: R) => obj ?? value;

export const isEmpty = <T>(obj?: T) => false
	|| isNullish(obj)
	|| (isObject(obj) && Object.keys(obj).length === 0)
	|| (isRecord(obj) && Object.keys(obj).length === 0)
	|| (isString(obj) && obj.trim().length === 0)
	|| (isArray(obj) && obj.length === 0)
	|| (isTuple<T>(obj) && obj.length === 0)
	|| (isSet(obj) && obj.size === 0)
	|| (isMap(obj) && obj.size === 0)

export function assertCondition(condition: boolean, message?: string): asserts condition {
	if (!condition)
		throw new Error(message);
}
export function assertString(str: unknown): asserts str is string { assertCondition(isString(str), `Invalid string: ${str}`) };
export function assertNever(val: never): asserts val is never { throw new Error(`Unexpected object: ${val}`) };

export type TValues<T> = T | Array<T>
export type TArray<T> = NonNullable<Exclude<T, string | number>>
export type TPlural<T extends string> = `${T}s`
export type ValueOf<T> = T[keyof T]
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type OneKey<K extends keyof any, V, KK extends keyof any = K> =
	{ [P in K]: { [Q in P]: V } &
		{ [Q in Exclude<KK, P>]?: undefined } extends infer O ?
		{ [Q in keyof O]: O[Q] } : never
	}[K]

// TODO: add Record | Tuple
type Primitive = string | number | bigint | boolean | symbol | void | null // | record | tuple
type Instance = { type: string, class: Function }						// allow for Class instance re-naming (to avoid minification mangling)
export type Temporals = Exclude<keyof typeof Temporal, 'Now'>;

export type Types = 'String' | 'Number' | 'BigInt' | 'Boolean' | 'Object' | 'Array' | 'ArrayLike' | 'Null' | 'Undefined' | 'Date' | 'Function' | 'AsyncFunction' | 'Class' | 'Promise' | 'Map' | 'Set' | 'RegExp' | 'Symbol' | 'Record' | 'Tuple' | 'Error'
export type TypeValue<T> =
	typeString |
	typeNumber |
	typeBigInt |
	typeBoolean |
	typeObject<T> |
	typeArray<T> |
	typeArrayLike<T> |
	typeNull |
	typeVoid |
	typeDate |
	typeFunction |
	typeClass<T> |
	typePromise<T> |
	typeRegExp |
	typeMap<T> |
	typeSet<T> |
	typeSymbol |
	typeError |

	typeRecord<T> |
	typeTuple<T> |

	typeTemporal |
	typeZonedDateTime |
	typePlainDateTime |
	typePlainDate |
	typePlainTime |
	typePlainYearMonth |
	typePlainMonthDay |
	typeInstant |

	classTempo |
	classPledge<T>

interface typeString { type: 'String', value: string }
interface typeNumber { type: 'Number', value: number }
interface typeBigInt { type: 'BigInt', value: bigint }
interface typeBoolean { type: 'Boolean', value: boolean }
interface typeObject<T> { type: 'Object', value: Extract<T, Record<any, any>> }
interface typeArray<T> { type: 'Array', value: Array<T> }
interface typeArrayLike<T> { type: 'ArrayLike', value: ArrayLike<T> }
interface typeNull { type: 'Null', value: null }
interface typeVoid { type: 'Undefined', value: void }
interface typeDate { type: 'Date', value: Date }
interface typeFunction { type: 'Function', value: Function }
interface typeClass<T> { type: 'Class', value: T }
interface typePromise<T> { type: 'Promise', value: Promise<T> }
interface typeRegExp { type: 'RegExp', value: RegExp }
interface typeMap<T> { type: 'Map', value: Map<any, T> }
interface typeSet<T> { type: 'Set', value: Set<T> }
interface typeSymbol { type: 'Symbol', value: Symbol }
interface typeError { type: 'Error', value: Error }
// TODO:  when Record/Tuple reach Stage-4
interface typeRecord<T> { type: 'Record', value: Record<any, any> }
interface typeTuple<T> { type: 'Tuple', value: Array<T> }

interface typeTemporal { type: 'Temporal', value: Temporals }
interface typeZonedDateTime { type: 'Temporal.ZonedDateTime', value: Temporal.ZonedDateTime }
interface typePlainDateTime { type: 'Temporal.PlainDateTime', value: Temporal.PlainDateTime }
interface typePlainDate { type: 'Temporal.PlainDate', value: Temporal.PlainDate }
interface typePlainTime { type: 'Temporal.PlainTime', value: Temporal.PlainTime }
interface typePlainYearMonth { type: 'Temporal.PlainYearMonth', value: Temporal.PlainYearMonth }
interface typePlainMonthDay { type: 'Temporal.PlainMonthDay', value: Temporal.PlainMonthDay }
interface typeInstant { type: 'Temporal.Instant', value: Temporal.Instant }

interface classTempo { type: 'Tempo', value: Tempo }
interface classPledge<T> { type: 'Pledge', value: Pledge<T> }