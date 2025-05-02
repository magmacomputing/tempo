import { ownKeys, ownEntries } from '#core/shared/reflect.library.js';
import { isObject, isArray, isReference, isFunction, isDefined, isEmpty, isNullish } from '#core/shared/type.library.js';
import type { Property } from '#core/shared/type.library.js';

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
export const quoteObj = (obj: any) => {
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
		.values()
		.every(key => {
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
