import { asArray } from '@module/shared/array.library.js';
import { asString } from '@module/shared/string.library.js';
import { asType, isInteger, isString, type TValues } from '@module/shared/type.library.js';

/** string representation of a BigInt */
export const regInteger = /^[0-9]+n$/;

/** convert String to Number */
export function asNumber(str?: string | number | bigint) {
	return parseFloat(str?.toString() ?? 'NaN');
}

/** convert String to BigInt */
export function asInteger<T extends string | number | bigint>(str?: T) {
	const arg = asType(str);

	switch (arg.type) {
		case 'BigInt':
			return arg.value;																			// already a BigInt
		case 'Number':
			return BigInt(arg.value);															// cast as BigInt
		case 'String':
			return regInteger.test(arg.value)
				? BigInt(arg.value.slice(0, -1))
				: arg.value;
		default:
			return str as Exclude<T, number>;
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
			return regInteger.test(arg.value)
				? true																							// is BigInt
				: !isNaN(asNumber(str)) && isFinite(str as number)	// test if Number

		default:
			return false;
	}
}

/** return as Numeric if possible, else String */
export const ifNumeric = (str?: string | number | bigint, stripZero = false) => {
	switch (true) {
		case isInteger(str):																		// bigint
			return str;
		case isString(str) && /^[0-9]+n$/.test(str!):						// string representation of a BigInt
			return BigInt(str!.toString().slice(0, -1));
		case isNumeric(str) && (!str!.toString().startsWith('0') || stripZero):
			return asNumber(str);

		default:
			return str;
	}
}

/** show Hex value of a number */
export const toHex = (num: TValues<number> = [], len = 64) =>
	asArray(num)
		.map(val => (val + 0x100).toString(16).slice(-2))
		.join('')
		.toLowerCase()
		.substring(0, len)

/** apply an Ordinal suffix */
export const suffix = (idx: number) => {
	const str = asString(idx /** + 1 */);

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
