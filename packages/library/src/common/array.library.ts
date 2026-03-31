import { asString } from '#library/coercion.library.js';
import { extract } from '#library/object.library.js';
import { ownEntries } from '#library/reflection.library.js';
import { stringify } from '#library/serialize.library.js';
import { isNumber, isDate, isTempo, isObject, isDefined, isUndefined, isFunction, nullToValue } from '#library/type.library.js';
import type { Property } from '#library/type.library.js';

// adapted from https://jsbin.com/insert/4/edit?js,output
/** insert a value into an Array by its sorted position */
export const sortInsert = <T, K extends keyof T>(arr: T[] = [], val: T, key?: K) => {
	const obj = isObject(val) && isDefined(key);							// array of Objects
	let low = 0, high = arr.length;

	while (low < high) {
		const mid = (low + high) >>> 1;												// divide by 2
		const source = obj
			? arr[mid]![key]																			// array of Object values
			: arr[mid]!																					// assume Primitive values
		const target = obj
			? val[key]
			: val

		if (source < target)
			low = mid + 1
		else high = mid
	}

	arr.splice(low, 0, val);																	// mutate original Array
	return arr;
}

/** sort Array-of-Objects by multiple keys */
export interface SortBy {
	field: string;
	dir?: 'asc' | 'desc';
	index?: number | '*';
	default?: any;
}
/** provide a sort-function to order a set of keys */
export function sortBy<T extends Property<T>>(...keys: (PropertyKey | SortBy)[]) {
	const sortOptions = keys																	// coerce string => SortBy
		.flat()																								// flatten Array-of-Array
		.map(key => isObject(key) ? key : { field: stringify(key) })	// build Array of sort-options

	return (left: T, right: T) => {
		let result = 0 as -1 | 0 | 1;													// 0 = same, -1 = left<right, +1 = left>right

		sortOptions.forEach(key => {
			if (result === 0) {																	// no need to look further if result !== 0
				const dir = key.dir === 'desc' ? -1 : 1;
				const field = key.field + (key.index ? `[${key.index}]` : '');
				const valueA = extract(left, field, nullToValue(key.default, 0));
				const valueB = extract(right, field, nullToValue(key.default, 0));

				switch (true) {
					case isNumber(valueA) && isNumber(valueB):
					case isDate(valueA) && isDate(valueB):
					case isTempo(valueA) && isTempo(valueB):
						result = dir * (valueA - valueB);
						break;

					default:
						result = dir * asString(valueA)?.localeCompare(asString(valueB));
						break;
				}
			}
		})

		return result;
	}
}

/** return an array sorted-by a series of keys */
export function sortKey<T extends Property<any>>(array: T[], ...keys: (PropertyKey | SortBy)[]) {
	return array.sort(sortBy(...keys));
}

type GroupFn<T extends Property<T>> = (value: T, index?: number) => PropertyKey

/** group array of objects by the return value of the passed callback. */
export function byKey<T extends Property<any>>(arr: T[], grpFn: GroupFn<T>): Record<PropertyKey, T[]>;
/** group array of objects according to a list of key fields. */
export function byKey<T extends Property<any>>(arr: T[], ...keys: (keyof T)[]): Record<PropertyKey, T[]>;
export function byKey<T extends Property<any>>(arr: T[], fnKey: GroupFn<T> | keyof T, ...keys: (keyof T)[]) {
	if (isFunction(fnKey))
		return Object.groupBy(arr, fnKey);

	const keyed = [fnKey]																		// mapFn is a keyof T
		.concat(keys)																					// append any trailing keyof T[]
		.flat();																								// flatten Array-of-Array

	return Object.groupBy(arr, itm =>												// group an array into an object with named keys
		keyed
			.map(key => isUndefined(itm[key]) ? '' : stringify(itm[key]))
			.join('.')
	)
}

/** group array of objects by the return value of the passed callback, but only the 'last' entry */
export function byLkp<T extends Property<any>>(arr: T[], grpFn: GroupFn<T>): Record<PropertyKey, T>;
/**  group array of objects according to a list of key fields, but only the 'last' entry */
export function byLkp<T extends Property<any>>(arr: T[], ...keys: (keyof T)[]): Record<keyof T, T>;
export function byLkp<T extends Property<any>>(arr: T[], fnKey: GroupFn<T> | keyof T, ...keys: (keyof T)[]) {
	const group = isFunction(fnKey)
		? byKey(arr, fnKey)																		// group by the callback function
		: byKey(arr, fnKey, ...keys);													// group by the list of keys

	return ownEntries(group)
		.reduce((acc, [key, grp]) => Object.assign(acc, { [key]: grp?.pop() }), {} as Record<PropertyKey, T>)
}

/** return an array with no repeated elements */
export function distinct<T>(arr: T[]): T[];
/** return a mapped array with no repeated elements */
export function distinct<T, S>(arr: T[], mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];
export function distinct<T>(arr: T[], mapfn?: (value: any, index: number, array: any[]) => any) {
	return mapfn
		? distinct(arr.map(mapfn))
		: Array.from(new Set(arr));
}

/** clear down an Array */
export function clear<T>(arr: T[]) {
	arr.fill(null as any).length = 0;
	return arr;
}

/** return cartesian-product of Array of Arrays */
export function cartesian<T>(...args: T[][]): T[][] {
	const [a, b = [], ...c] = args;
	const cartFn = (a: any[], b: any[]) => ([] as any[]).concat(...a.map(d => b.map(e => ([] as any[]).concat(d, e))));

	return b.length
		? cartesian(cartFn(a, b), ...c)
		: (a || []) as T[][];
}

/** tap into an Array */
export function tap<T>(arr: T[], fn: (value: T[]) => void) {
	fn(arr);
	return arr;
}