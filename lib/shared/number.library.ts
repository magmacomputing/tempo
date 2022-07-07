import { asArray } from '@module/shared/array.library';
import { asString } from '@module/shared/string.library';
import type { TValues } from '@module/shared/type.library';

/** convert String to Number */
export function asNumber(str?: string | number) { return parseFloat(str?.toString() ?? 'NaN') }

/** test if can convert String to Number */
export function isNumeric(str?: string | number): str is number { return !isNaN(asNumber(str)) && isFinite(str as number) }

/** return as Number if possible, else String */
export const ifNumeric = (str?: string | number, stripZero = false) =>
	isNumeric(str) && (!str.toString().startsWith('0') || stripZero)
		? asNumber(str)
		: str

/** show Hex value of a number */
export const toHex = (num: TValues<number> = [], len = 64) =>
	asArray(num)
		.map(val => (val + 0x100).toString(16).slice(-2))
		.join('')
		.toLowerCase()
		.substring(0, len)

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
