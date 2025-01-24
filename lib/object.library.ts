import { ownKeys, ownEntries } from '@core/shared/reflect.library.js';
import { isObject, isArray, isString, isNull, isUndefined, isReference, isFunction, isDefined, isEmpty } from '@core/shared/type.library.js';
import type { TValues, Property } from '@core/shared/type.library.js';

const regex = /(?<matchWord>.*)\[(?<matchIdx>.)\]$/;				// a pattern to find array-references

/**
 * Get nested value
 */
export function extract<T>(obj: Property<T>, path: PropertyKey, dflt: T): T;
export function extract<T>(obj: Property<T>, path: PropertyKey): T | undefined;
export function extract<T>(obj: Property<T>, path = '' as PropertyKey, dflt?: T) {
	if (isEmpty(path))
		return obj as unknown as T;															// finished searching
	if (!isObject(obj) && !isArray(obj))
		return dflt;

	const fields = path.toString()
		.replace(/\[(\w+)\]/g, '.$1')														// convert indexes to properties
		.replace(/^\./, '')																			// strip a leading dot
		.replace(/\.$/, '')																			// strip a trailing dot
		.replace(' ', '')																				// remove readability-spaces
		.split('.')

	const [word, ...rest] = fields;
	for (const [key, val] of ownEntries(obj))
		if (word === key.toString())
			return extract({ [key]: val }, rest.join('.'), dflt);	// recurse into object

	return dflt;
}

/**
 * Get nested value,  
 * allow for array-references in \<path>
 */
export const getPath = <T>(obj: any, path: TValues<string>, dflt?: any, indx?: string | number): T => {
	if (!isObject(obj) && !isArray(obj))
		return dflt || void 0;

	const [word, ...rest] = isString(path)										// first word in the index-path, and the rest
		? path.replace(' ', '').split('.')											// remove readability-spaces
		: path

	const match = regex.exec(word);														// eg. does the 'word' end in "*[0]"?
	const { matchWord, matchIdx } = !isNull(match) && match.groups || { matchWord: word, matchIdx: '*' };

	let clone = isArray(obj)
		? obj
			.map(itm => { if (isUndefined(itm[matchWord])) itm[matchWord] = dflt; return itm; })
			.map(itm => itm[matchWord])
			.filter((_row, idx) => indx === '*' || indx === idx.toString())
		: obj[matchWord]
	if (isArray(clone) && matchIdx !== '*')
		clone = clone[0];																				// limit to the first filtered element

	return rest.length
		? getPath(clone, rest, dflt, matchIdx)									// recurse into object
		: clone || dflt
}
export const getPath1 = <T>(obj: unknown, path: string, dflt?: T, idx?: string | number) => {
	const words = path.replace(' ', '').split('.');

	if (isArray(obj)) {
		const { matchWord, matchIdx } = regex.exec(words[0])?.groups || { matchWord: words[0], matchIdx: '*' };
	} else {
		if (!isObject(obj))
			return dflt;
	}

	let res = obj as Record<string, any>;
	path
		.replace(' ', '')
		.split('.')
		.forEach(word => res = res?.[word])

	return res ?? dflt;
}

export const quoteObj = (obj: any) => {
	return JSON.stringify(obj)
		?.replace(/"([^"]+)":/g, '$1: ')
		?.replace(/,/g, ', ')
}

/** copy enumerable properties to a new Object */
export const asObject = <T>(obj: any) => {
	if (obj === null || !isObject(obj))
		return obj;

	const temp: any = isArray(obj) ? [] : {};

	for (const key in obj)
		temp[key] = asObject(obj[key]);

	return temp as T;
}

/** deep-compare object values for equality */
export const isEqual = (obj1: any = {}, obj2: any = {}): boolean => {
	const keys = new Set<PropertyKey>();											// union of unique keys from both Objects
	const keys1 = isFunction(obj1.keys) ? Array.from<PropertyKey>(obj1.keys()) : ownKeys(obj1);
	const keys2 = isFunction(obj2.keys) ? Array.from<PropertyKey>(obj2.keys()) : ownKeys(obj2);

	keys1.forEach(key => keys.add(key));
	keys2.forEach(key => keys.add(key));

	return keys
		.values()
		.every(key => {																					// 'every' will shortcut if <false>
			const val1 = obj1[key];
			const val2 = obj2[key];

			return isReference(val1) && isReference(val2)
				? isEqual(val1, val2)																// recurse into object
				: val1 === val2
		})
}

/** extract a subset of keys from an object */
export const pick = <T extends Property<T>, K extends string>(obj: T, ...keys: K[]): Partial<T> => {
	const ownKeys = Object.getOwnPropertyNames(obj);

	return keys.reduce((acc, key) => {
		if (ownKeys.includes(key))
			acc[key] = obj[key];
		return acc;
	}, {} as T);
}

/** find all methods on an Object */
export const getMethods = (obj: any, all = false) => {
	const properties = new Set();
	let currentObj = obj;

	do {
		Object
			.getOwnPropertyNames(currentObj)
			.map(key => properties.add(key))
	} while (all && (currentObj = Object.getPrototypeOf(currentObj)));

	return [...properties.keys()].filter((key: any) => isFunction(obj[key]));
}

/** remove undefined values from Object */
export function ifDefined<T>(obj: Property<T>) {
	return ownEntries(obj)
		.reduce((acc, [key, val]) => {
			if (isDefined(val))
				acc[key] = val;
			return acc;
		}, {} as Property<T>)
}

/** extract a named key from an array of objects */
export const pluck = <T, K extends keyof T>(objs: T[], key: K): T[K][] =>
	objs.map(obj => obj[key]);

export const countProperties = (obj = {}) =>
	ownKeys(obj).length

/** extend an object with the properties of another */
export const extend = <T extends {}, U>(obj: T, ...objs: U[]) =>
	Object.assign(obj, ...objs) as T;
