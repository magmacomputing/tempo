import { isTempo } from '@module/shared/tempo.class.js';
import { asString } from '@module/shared/string.library.js';
import { getPath } from '@module/shared/object.library.js';
import { cloneify, stringify } from '@module/shared/serialize.library.js';
import { asType, isNumber, isDate, isIterable, isString, isObject, isDefined, isArrayLike, nullToValue } from '@module/shared/type.library.js';

/** Coerce {value} into {Array\<value>} ( if not already Array<> ), with optional {fill} Object */
export function asArray<T>(arr: Exclude<ArrayLike<T>, string> | undefined): T[];
export function asArray<T>(arr: T | Exclude<Iterable<T> | undefined, string>): NonNullable<T>[];
export function asArray<T, K>(arr: Iterable<T> | ArrayLike<T>, fill: K): K[];
export function asArray<T, K>(arr: T | Iterable<T> | ArrayLike<T> = [], fill?: K): (T | K)[] {
	switch (true) {
		case isArrayLike<T>(arr):																// allow for {length:nn} objects
		case isIterable<T>(arr) && !isString(arr):							// dont iterate Strings
			const args = asType(fill);														// get type of {fill} parameter

			return Array.from<T, K>(arr as T[], val => {
				return args.type === 'Undefined' || val !== void 0
					? val as unknown as K															// if no {fill}, then use val
					: cloneify(fill as K)															// clone {fill} to create new Objects
			});

		default:
			return Array.of<T>(arr as T);
	}
}

/** insert a value into an Array by its sorted position */
export const sortInsert = <T, K extends string>(arr: T[] = [], val: T, key?: K) => {
	const obj = isObject(val) && isDefined(key);							// array of Objects
	let low = 0, high = arr.length;

	while (low < high) {
		const mid = (low + high) >>> 1;													// divide by 2
		const source = obj
			? (arr[mid] as Record<string, typeof val>)[key]				// array of Object values
			: arr[mid]																						// assume Primitive values
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
export function sortBy<T extends Record<PropertyKey, any>>(...keys: (PropertyKey | SortBy)[]) {
	const sortOptions = keys																	// coerce string => SortBy
		.flat()																									// flatten Array-of-Array
		.map(key => isObject(key) ? key : { field: stringify(key) })	// build Array of sort-options

	return (left: T, right: T) => {
		let result = 0;

		sortOptions.forEach(key => {
			if (result === 0) {																		// no need to look further if result !== 0
				const dir = key.dir === 'desc' ? -1 : 1;
				const valueA = getPath<number>(left, key.field, nullToValue(key.default, 0), key.index);
				const valueB = getPath<number>(right, key.field, nullToValue(key.default, 0), key.index);

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
export function sortKey<T extends Record<PropertyKey, any>>(array: T[], ...keys: (PropertyKey | SortBy)[]) {
	return array.sort(sortBy(...keys));
}

/** group documents by key-fields */
export function groupKey<T extends Record<PropertyKey, any>>(array: T[], ...keys: (keyof T)[]) {
	const keyed = keys.flat();																// flatten Array-of-Array
	return Object.groupBy(array, itm =>												// group an array into an object with named keys
		keyed
			.map(key => stringify(itm[key]))
			.join('.')
	)
}
