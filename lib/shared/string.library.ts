import { isNumeric } from '@module/shared/number.library.js';
import { stringify } from '@module/shared/serialize.library.js';
import { isString, isObject, isNullish, assertCondition, assertString, nullToValue } from '@module/shared/type.library.js';

// General <string> functions

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// This section needs to be Function declarations so that they are hoisted
// (because they are referenced in prototype.library)

/**
 * clean a string to remove some standard control-characters (tab, line-feed, carriage-return)  
 * and trim redundant spaces.  
 * allow for optional RegExp to specify additional match
 */
export function trimAll(str: string | number, pat?: RegExp) {
	return str
		.toString()																							// force to String
		.replace(pat!, '')																			// remove regexp, if supplied
		.replace(/\t/g, ' ')																		// replace <tab> with <space>
		.replace(/(\r\n|\n|\r)/g, ' ')													// replace <return> & <newline>
		.replace(/\s{2,}/g, ' ')																// trim multiple <space>
		.trim()																									// leading/trailing <space>
}

export function toProperCase<T extends string>(...str: T[]) {
	return str
		.map(text => text.replace(/\w\S*/g,
			word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()))
		.join(' ') as T
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

export const toCamelCase = <T extends string>(sentence: T) => {
	let [word, ...rest] = sentence.match(/[A-Z\xC0-\xD6\xD8-\xDE]?[a-z\xDF-\xF6\xF8-\xFF]+|[A-Z\xC0-\xD6\xD8-\xDE]+(?![a-z\xDF-\xF6\xF8-\xFF])|\d+/g) ?? [''];

	if (isNumeric(word)) {
		word = rest[0];
		rest.splice(0, 1);
	}

	return (sentence.startsWith('_') ? '_' : '') + word.toLowerCase() + toProperCase(...rest).replace(/ /g, '') as T;
}

const HEX = 16;
export const randomString = (len = 36) => {
	let str = '';

	do																												// generate random strings
		str += Math.floor(Math.random() * 10 ** 16).toString(HEX).substring(2, 15);
	while (str.length < len)

	return str.substring(0, len);
}

const regexp = /\$\{(\d)\}/g;																// pattern to find "${digit}" parameter markers
type Sprintf = {
	(fmt: string, ...msg: any[]): string;											// either a format-string, followed by arguments
	(...msg: any[]): string;																	// or just an array of arguments
}
/**
 * use sprintf-style formatting on a string.  
 */
export const sprintf: Sprintf = (fmt: {}, ...msg: any[]) => {
	let sfmt = asString(fmt);																	// avoid mutate fmt

	if (!isString(fmt)) {																			// might be an Object
		msg.unshift(JSON.stringify(fmt));												// push to start of msg[]
		sfmt = '';																							// reset the string-format
	}

	let cnt = 0;																							// if the format does not contain a corresponding '${digit}' then re-construct the parameters
	sfmt = sfmt.replace(/%[sj]/g, _ => `\${${cnt++}}`);				// flip all the %s or %j to a ${digit} parameter

	const params = Array.from(sfmt.matchAll(regexp))
		.map(match => Number(match[1]))													// which parameters are in the fmt
	msg.forEach((_, idx) => {
		if (!params.includes(idx))															// if more args than params
			sfmt += `${sfmt.length === 0 ? '' : ', '}\${${idx}}`	//  append a dummy params to fmt
	})

	return sfmt.replace(regexp, (_, idx) => isObject(msg[idx]) ? JSON.stringify(msg[idx]) : msg[idx]);
}

/** apply a plural suffix, if greater than '1' */
export const plural = (val: string | number | Record<string, string>, word: string, plural = word + 's') => {
	const _plural = (num: string | number | object, word: string, plural = word + 's') =>
		[1, -1].includes(Number(num)) ? word : plural;

	return isObject(val)
		? (num: string, word: string) => _plural(num, word, (val as Record<string, string>)[word])
		: _plural(val, word, plural)
}

/** make an Object's values into a Template Literals, and evaluate */
export const makeTemplate = (templateString: Object) =>
	(templateData: Object) =>
		new Function(`{${Object.keys(templateData).join(',')}}`, 'return `' + templateString + '`')(templateData);

export const asString = (str?: unknown) => isNullish(str) ? '' : stringify(str);
export const toLower = <T>(str: T) => isString(str) ? asString(str).toLowerCase().trim() : str;
export const toUpper = <T>(str: T) => isString(str) ? asString(str).toUpperCase().trim() : str;

/** assert string is within bounds */
type StrLen<Min, Max = Min> = string & { __value__: never };
export const strlen = <Min extends number, Max extends number>(str: unknown, min: Min, max?: Max) => {
	assertString(str);
	assertCondition(str.length >= min && str.length <= (max ?? min), 'string length is not between specified min and max')

	return str as StrLen<Min, Max>;
}

/**
 * pad a string with leading character  
 * @param		nbr	input value to pad
 * @param		len	fill-length (default: 2)
 * @param		fill	character (default \<space> for string and \<zero> for number)
 * @returns	fixed-length string padded on the left with fill-character
 */
export const pad = (nbr: string | number | bigint = 0, len = 2, fill?: string | number) =>
	nbr.toString().padStart(len, nullToValue(fill, isNumeric(nbr) ? '0' : ' ').toString());
