import { clone, stringify } from '#library/serialize.library.js';
import { isIntegerLike, isArrayLike, isDefined, isInteger, isIterable, isNullish, isString, isUndefined, asType, isNumber } from '#library/type.library.js';

/** Coerce {value} into {value[]} ( if not already ), with optional {fill} Object */
export function asArray<T>(arr: Exclude<ArrayLike<T>, string> | undefined): T[];
export function asArray<T>(arr: T | Exclude<Iterable<T> | undefined, string>): NonNullable<T>[];
export function asArray<T, K>(arr: Iterable<T> | ArrayLike<T>, fill: K): K[];
export function asArray<T, K>(arr: T | Iterable<T> | ArrayLike<T> = [], fill?: K): (T | K)[] {
	switch (true) {
		case isArrayLike<T>(arr):															// allow for {length:nn} objects
		case isIterable<T>(arr) && !isString(arr):							// dont iterate Strings
			return Array.from<T, K>(arr, val => {
				return isUndefined(fill) || isDefined(val)
					? val as unknown as K														// if no {fill}, then use {val}
					: clone(fill)																		// clone {fill} to create new Objects
			});

		default:
			return Array.of(arr);
	}
}

/** stringify if not nullish */
export function asString<T>(str?: T) {
	return isNullish(str)
		? ''
		: isInteger(str)
			? str.toString() + 'n'
			: stringify(str);
}

/** convert String | Number | BigInt to Number */
export function asNumber(str?: string | number | bigint) {
	return parseFloat(str?.toString() ?? 'NaN');
}

/** convert String | Number to BigInt */
export function asInteger<T extends string | number | bigint>(str?: T) {
	const arg = asType(str);

	switch (arg.type) {
		case 'BigInt':
			return arg.value;																		// already a BigInt
		case 'Number':
			return BigInt(Math.trunc(arg.value));								// cast as BigInt
		case 'String':
			return (isIntegerLike(arg.value))										// String representation of a BigInt
				? BigInt(arg.value.slice(0, -1))										// get rid of trailing 'n'
				: BigInt(arg.value);
		default:
			return str as Exclude<T, string | number>;
	}
}

/** test if can convert String to Numeric */
export function isNumeric(str?: string | number | bigint) {
	const arg = asType(str);

	switch (arg.type) {
		case 'Number':
		case 'BigInt':
			return true;

		case 'String':
			return isIntegerLike(arg.value)
				? true																							// is Number | BigInt
				: !isNaN(asNumber(str)) && isFinite(str as number)	// test if Number

		default:
			return false;
	}
}

/** return as Number if possible, else original String */
export const ifNumeric = (str: string | number | bigint, stripZero = false) => {
	switch (true) {
		case isInteger(str):																		// BigInt → Number
			return Number(str);

		case isNumber(str):																		// Number → as-is
			return str;

		case isNumeric(str) && (!str?.toString().startsWith('0') || stripZero):
			return asNumber(str);																// numeric String → Number

		default:
			return str as string;																// non-numeric String → as-is
	}
}
