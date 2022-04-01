import { asArray } from '@module/shared/array.library';
import { asString } from '@module/shared/string.library';
import { isType, type TValues } from '@module/shared/type.library';

/** convert String to Number */
export const asNumber = (str?: string | number) => parseFloat(str?.toString() ?? 'NaN');

/** test if can convert String to Number */
export const isNumeric = (str?: string | number): str is number => !isNaN(asNumber(str)) && isFinite(str as number);

/** return as Number if possible, else String */
export const ifNumeric = (str?: string | number, stripZero = false) =>
	isNumeric(str) && (!str.toString().startsWith('0') || stripZero)
		? asNumber(str)
		: str

		/** show Hex value of a number */
export const toHex = (num: TValues<number> = [], len: number = 64) => {
	return asArray(num)
		.map(val => (val + 0x100).toString(16).slice(-2))
		.join('')
		.toLowerCase()
		.substring(0, len)
}

/** apply an Ordinal suffix */
export const suffix = (idx: number) => {
	const str = asString(idx + 1);
	let sfx = 'th';

	switch (true) {
		case str.endsWith('1') && !str.endsWith('11'):
			sfx = 'st';
			break;
		case str.endsWith('2') && !str.endsWith('12'):
			sfx = 'nd';
			break;
		case str.endsWith('3') && !str.endsWith('13'):
			sfx = 'rd';
			break;
	}
	return str + sfx;
}

/** translate octal-literals back into decimal */
export const fromOctal = <T extends string | number | bigint>(nbr: T) => {
	if (!isType<T>(nbr, 'Number', 'BigInt'))
		return nbr;																							// doesn't need converting

	if ([2, 3, 6].includes(nbr.toString().length))						// at-risk strings are either 2- 3- or 6-characters
		return '0' + nbr.toString(8);														// 'guess' it had a leading zero

	return nbr;
}

/** split a value into an array */
export const split = <T extends string | number>(nbr?: string | number, chr: string = '.', zero: boolean = true) =>
	nbr?.toString().split(chr).map(val => ifNumeric(val, zero)) as T[] || [];

/** fix a string to set decimal precision */
export const fix = (nbr: string | number = 0, max = 2) =>
	asNumber(nbr).toFixed(max);

/** remove ':' from an HH:MI string, return as number */
export const asTime = (hhmi: string | number) =>
	Number(String(hhmi).replace(':', ''));

/** format a value as currency */
export const asCurrency = (str: string | number, scale = 2, currency = 'AUD') =>
	str.toLocaleString(void 0, { style: 'currency', currency, maximumFractionDigits: scale });
