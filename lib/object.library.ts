import { ownKeys, ownEntries } from '#core/shared/reflection.library.js';
import { isObject, isArray, isReference, isFunction, isDefined, isEmpty, isNullish } from '#core/shared/type.library.js';
import type { Extend, Property } from '#core/shared/type.library.js';

/** Get nested value */
export function extract<T>(obj: any, path: string | number, dflt?: T): T {
	if (isEmpty(path))
		return obj as T;																				// finished searching
	if (!isObject(obj) && !isArray(obj))
		return obj as T;

	return path
		.toString()
		.replace(/\[([^\[\]]*)\]/g, '.$1.')											// convert [indexes] to properties
		.split('.')
		.filter(field => !isEmpty(field))												// remove empty fields
		.reduce((acc, field) => acc?.[field] ?? null, obj) ?? dflt
}

/** remove quotes around property names */
export const unQuoteObj = (obj: any) => {
	return JSON.stringify(obj)
		?.replace(/"([^"]+)":/g, '$1: ')
		?.replace(/,/g, ', ')
}

/** copy enumerable properties to a new Object */
export const asObject = <T>(obj?: Record<PropertyKey, any>) => {
	if (isNullish(obj) || !isObject(obj))
		return obj as T;

	const temp: any = isArray(obj) ? [] : {};

	ownKeys(obj)
		.forEach(key => temp[key] = asObject(obj[key]));

	return temp as T;
}

/** deep-compare object values for equality */
export const isEqual = (obj1: any = {}, obj2: any = {}): boolean => {
	const keys = new Set<PropertyKey>();											// union of unique keys from both Objects
	const keys1 = isFunction(obj1.keys) ? Array.from<PropertyKey>(obj1.keys()) : ownKeys(obj1);
	const keys2 = isFunction(obj2.keys) ? Array.from<PropertyKey>(obj2.keys()) : ownKeys(obj2);

	keys1.forEach(key => keys.add(key));
	keys2.forEach(key => keys.add(key));

	return [...keys]																					// cast as Array
		.every(key => {
			const val1 = obj1[key];
			const val2 = obj2[key];

			return isReference(val1) && isReference(val2)
				? isEqual(val1, val2)																// recurse into object
				: val1 === val2
		})
}

/** find all methods on an Object */
export const getMethods = (obj: any, all = false) => {
	const properties = new Set<PropertyKey>();
	let currentObj = obj;

	do {
		Object
			.getOwnPropertyNames(currentObj)
			.map(key => properties.add(key))
	} while (all && (currentObj = Object.getPrototypeOf(currentObj)));

	return [...properties.keys()]
		.filter(key => isFunction(obj[key]));
}

/** extract only defined values from Object */
export function ifDefined<T extends Property<any>>(obj: T) {
	return ownEntries(obj)
		.reduce((acc, [key, val]) => {
			if (isDefined<any>(val))
				acc[key] = val;
			return acc as T;
		}, {} as T)
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

/** extract a named key from an array of objects */
export const pluck = <T, K extends keyof T>(objs: T[], key: K): T[K][] =>
	objs.map(obj => obj[key]);

/** extend an object with the properties of another */
export const extend = <T extends {}, U>(obj: T, ...objs: U[]) =>
	Object.assign(obj, ...objs) as T;

export const countProperties = (obj = {}) =>
	ownKeys(obj).length

/** 
 * helper to define objects with fixed literal properties  
 * and a loose index signature for further extensions.  
 * @example
 * ```
 * const obj = looseIndex<string,string>()({ foo: 'bar', bar: 'foo' });
 * type obj = typeof obj
 * ```
 */
export function looseIndex<K extends PropertyKey = string, V = any>(): <const T extends object>(obj: T | (() => T)) => Extend<T, K, V>;
export function looseIndex<const T extends object>(obj: T | (() => T)): Extend<T, string, any>;
export function looseIndex(arg?: any): any {
	if (isDefined(arg)) return isFunction(arg) ? arg() : arg;
	return (obj: any) => isFunction(obj) ? obj() : obj;
}

/** loose object with symbols values */
looseIndex.stringSymbol = looseIndex<string, symbol>();
/** loose object with symbol keys and RegExp values */
looseIndex.symbolRegExp = looseIndex<symbol, RegExp>();
/** loose object with symbol keys and string values */
looseIndex.symbolString = looseIndex<symbol, string>();
/** loose object with string keys and string values */
looseIndex.stringString = looseIndex<string, string>();
