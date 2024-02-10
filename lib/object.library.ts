import { clone } from '@module/shared/serialize.library.js';
import { isObject, isArray, isString, isNull, isUndefined, isReference, isFunction, type TValues } from '@module/shared/type.library.js';

const regex = /(?<matchWord>.*)\[(?<matchIdx>.)\]$/;				// a pattern to find array-references

/**
 * Get nested value
 */
export function extract<T>(obj: object, path: string, dflt: T): T;
export function extract<T>(obj: object, path: string): T | undefined;
export function extract<T>(obj: object, path = '', dflt?: T) {
	if (!path.length)
		return obj as unknown as T;															// finished searching
	if (!isObject(obj) && !isArray(obj))
		return dflt;

	const fields = path
		.replace(/\[(\w+)\]/g, '.$1')														// convert indexes to properties
		.replace(/^\./, '')																			// strip a leading dot
		.replace(/\.$/, '')																			// strip a trailing dot
		.replace(' ', '')																				// remove readability-spaces
		.split('.')

	const [word, ...rest] = fields;
	for (const [key, val] of Object.entries(obj))
		if (word === key)
			return extract(val, rest.join('.'), dflt);						// recurse into object

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
	if (obj === null || !(obj instanceof Object))
		return obj;

	const temp: any = (obj instanceof Array) ? [] : {};

	for (const key in obj)
		temp[key] = asObject(obj[key]);

	return temp as T;
}

/** deep-compare Objects for equality */
export const isEqual = (obj1: any = {}, obj2: any = {}): boolean => {
	const keys1 = isFunction(obj1.keys) ? Array.from<string>(obj1.keys()) : Object.keys(obj1);
	const keys2 = isFunction(obj2.keys) ? Array.from<string>(obj2.keys()) : Object.keys(obj2);
	const keys = new Set<string>();

	keys1.forEach(key => keys.add(key));
	keys2.forEach(key => keys.add(key));

	return Array.from(keys).every(key => {
		const val1 = obj1[key];
		const val2 = obj2[key];

		if (!isReference(val1) && val1 !== val2)
			console.warn('change: <', key, '> ', val1, ' => ', val2);

		return isReference(val1) && isReference(val2)
			? isEqual(val1, val2)																	// recurse into object
			: val1 === val2
	})
}

/** omit top-level keys from an Object */
export function omit<T extends {}>(obj: T, ...keys: (keyof T)[]) {
	let res = clone<T>(obj);																	// create a safe copy

	keys.forEach(key => Reflect.deleteProperty(res, key));
	return res;
}

/** mutate Object | Array reference with all ownKeys removed */
export function purge<T extends {}>(obj: T) {
	Reflect.ownKeys(obj)
		.forEach(key => Reflect.deleteProperty(obj, key));

	if (isArray(obj))
		Reflect.set(obj, 'length', 0);													// explicit set length

	return obj;																								// return Object reference, even though Object has been mutated
}

/** extract a subset of keys from an object */
export const pick = <T extends Record<string, any>, K extends string>(obj: T, ...keys: K[]): Partial<T> => {
	const ownKeys = Object.getOwnPropertyNames(obj);

	return keys.reduce((acc, key) => {
		if (ownKeys.includes(key))
			acc[key] = obj[key];
		return acc;
	}, {} as T);
}

/** extract a named key from an array of objects */
export const pluck = <T, K extends keyof T>(objs: T[], key: K): T[K][] =>
	objs.map(obj => obj[key]);

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

export const countProperties = (obj = {}) =>
	Object
		.getOwnPropertyNames(obj)
		.length;

/** shallow compare two simple Objects */
export const compareObject = (obj1 = {}, obj2 = {}) => {
	const keys = Object.keys(obj1).sort();

	if (Object.keys(obj2).length !== keys.length)
		return false;

	return JSON.stringify(obj1, keys) === JSON.stringify(obj2, keys);
}

/** extend an object with the properties of another */
export const extend = <T extends {}, U>(obj: T, ...objs: U[]) =>
	Object.assign(obj, ...objs) as T;

/** get a string-array of 'getter' names for a Class */
export const getAccessors = <T>(obj: any = {}) => {
	const getters = Object.getOwnPropertyDescriptors(obj.prototype);

	return Object.entries(getters)
		.filter(([_, descriptor]) => isFunction(descriptor.get))
		.map(([key, _]) => key as keyof T)
}
