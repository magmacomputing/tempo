import { asArray } from '#core/shared/array.library.js';
import { patBigInt } from '#core/shared/regexp.library.js';
import { asType, isInteger, isString } from '#core/shared/type.library.js';
import type { TValues } from '#core/shared/type.library.js';


/** convert String | Number | BigInt to Number */
export function asNumber(str?: string | number | bigint) {
	return parseFloat(str?.toString() ?? 'NaN');
}

/** convert String | Number to BigInt */
export function asInteger<T extends string | number | bigint>(str?: T) {
	const arg = asType(str);

	switch (arg.type) {
		case 'BigInt':
			return arg.value;																			// already a BigInt
		case 'Number':
			return BigInt(Math.trunc(arg.value));									// cast as BigInt
		case 'String':
			return patBigInt.test(arg.value)											// String representation of a BigInt
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
			return patBigInt.test(arg.value)
				? true																							// is Number | BigInt
				: !isNaN(asNumber(str)) && isFinite(str as number)	// test if Number

		default:
			return false;
	}
}

/** return as Number if possible, else String */
export const ifNumeric = (str?: string | number | bigint, stripZero = false) => {
	switch (true) {
		case isInteger(str):																		// bigint
			return str;

		case isString(str) && /^[0-9]+n$/.test(str):						// string representation of a BigInt
			return asInteger(str);

		case isNumeric(str) && (!str?.toString().startsWith('0') || stripZero):
			return asNumber(str);

		default:
			return str;
	}
}

/** show Hex value of a number */
export const toHex = (num: TValues<number> = [], len?: number) =>
	asArray(num)																							// ensure array
		.flat(1_000_000)																					// flatten any arrays to arbitrary depth
		.filter(Number.isInteger)																// ensure integers	
		.map(val => (val + 0x100).toString(16).slice(-2))
		.join('')
		.toLowerCase()
		.substring(0, len ?? Number.MAX_SAFE_INTEGER)

/** apply an Ordinal suffix */
export const suffix = (idx: number) => {
	const str = String(idx ?? '');														// so we can use 'endsWith'

	switch (true) {
		case str.endsWith('1') && !str.endsWith('11'):
			return str + 'st';
		case str.endsWith('2') && !str.endsWith('12'):
			return str + 'nd';
		case str.endsWith('3') && !str.endsWith('13'):
			return str + 'rd';
		default:
			return str + 'th';
	}
}

/** split a value into an array */
export function split<T extends number>(nbr: T, chr?: string, zero?: boolean): number[];
export function split<T extends string>(nbr: T, chr?: string, zero?: boolean): (string | number)[];
export function split<T extends string | number>(nbr?: T, chr: string = '.', zero: boolean = true) {
	return nbr?.toString().split(chr).map(val => ifNumeric(val, zero))
		|| []
};

/** fix a string to set decimal precision */
export const fix = (nbr: string | number = 0, max = 2) =>
	asNumber(nbr).toFixed(max);

/** remove ':' from an HH:MI string, return as number */
export const asTime = (hhmi: string | number) =>
	Number(String(hhmi).replace(':', ''));

/** format a value as currency */
export const asCurrency = (str: string | number, scale = 2, currency = 'AUD') =>
	str.toLocaleString(void 0, { style: 'currency', currency, maximumFractionDigits: scale });
