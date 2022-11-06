import { isNumeric } from '@module/shared/number.library';
import { isVoid, isString, isObject, assertCondition, assertString, nullToValue } from '@module/shared/type.library';

// General <string> functions

export const toProperCase = <T extends string>(...str: T[]) =>
	str
		.map(text => text.replace(/\w\S*/g,
			word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()))
		.join(' ') as T

export const toCamelCase = <T extends string>(sentence: T) => {
	let [word, ...rest] = sentence.match(/[A-Z\xC0-\xD6\xD8-\xDE]?[a-z\xDF-\xF6\xF8-\xFF]+|[A-Z\xC0-\xD6\xD8-\xDE]+(?![a-z\xDF-\xF6\xF8-\xFF])|\d+/g) ?? [];

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

type Sprintf = {
	(fmt: string, ...msg: any[]): string;											// either a format-string, followed by arguments
	(...msg: any[]): string;																	// or just an array of arguments
};
/**
 * use sprintf-style formatting on a string.  
 */
export const sprintf: Sprintf = (fmt: any, ...msg: any[]) => {
	let sfmt = asString(fmt);																	// avoid mutate fmt
	let regexp = /\$\{(\d)\}/g;																// pattern to find "${digit}" parameter markers

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

export const asString = (str?: Object) => isVoid(str) ? '' : isString(str) ? str : JSON.stringify(str);
export const toLower = (str: Object) => isString(str) ? asString(str).toLowerCase().trim() : str;
export const toUpper = (str: Object) => isString(str) ? asString(str).toUpperCase().trim() : str;

/** assert string is within bounds */
type StrLen<Min, Max = Min> = string & { __value__: never };
export const strlen = <Min extends number, Max extends number>(str: unknown, min: Min, max?: Max) => {
	assertString(str);
	assertCondition(str.length >= min && str.length <= (max ?? min), 'string length is not between specified min and max')

	return str as StrLen<Min, Max>;
}

/** pad a string with leading character */
export const pad = (nbr: string | number | bigint = 0, max = 2, fill?: string | number) =>
	nbr.toString().padStart(max, nullToValue(fill, isNumeric(nbr) ? '0' : ' ').toString());
