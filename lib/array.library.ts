import { asString } from '#core/shared/string.library.js';
import { extract } from '#core/shared/object.library.js';
import { ownEntries } from '#core/shared/reflect.library.js';
import { cloneify, stringify } from '#core/shared/serialize.library.js';
import { isNumber, isDate, isTempo, isIterable, isString, isObject, isDefined, isArrayLike, nullToValue, isFunction, isUndefined, type Property } from '#core/shared/type.library.js';

/** Coerce {value} into {Array\<value>} ( if not already Array<> ), with optional {fill} Object */
export function asArray<T>(arr: Exclude<ArrayLike<T>, string> | undefined): T[];
export function asArray<T>(arr: T | Exclude<Iterable<T> | undefined, string>): NonNullable<T>[];
export function asArray<T, K>(arr: Iterable<T> | ArrayLike<T>, fill: K): K[];
export function asArray<T, K>(arr: T | Iterable<T> | ArrayLike<T> = [], fill?: K): (T | K)[] {
	switch (true) {
		case isArrayLike<T>(arr):																// allow for {length:nn} objects
		case isIterable<T>(arr) && !isString(arr):							// dont iterate Strings

			return Array.from<T, K>(arr, val => {
				return isUndefined(fill) || val !== void 0
					? val as unknown as K															// if no {fill}, then use {val}
					: cloneify(fill as K)															// clone {fill} to create new Objects
			});

		default:
			return Array.of(arr);
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
export function sortBy<T extends Property<T>>(...keys: (PropertyKey | SortBy)[]) {
	const sortOptions = keys																	// coerce string => SortBy
		.flat()																									// flatten Array-of-Array
		.map(key => isObject(key) ? key : { field: stringify(key) })	// build Array of sort-options

	return (left: T, right: T) => {
		let result = 0;

		sortOptions.forEach(key => {
			if (result === 0) {																		// no need to look further if result !== 0
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

type KeyOf<T> = keyof T
type GroupFn<T> = (itm: T) => KeyOf<T>
/** return an object grouped by key-fields in an array of documents */
// export function byKey<T>(array: T[], mapFn: GroupFn<T>): Record<KeyOf<T>, T[]>
// export function byKey<T>(array: T[], key: KeyOf<T>, ...keys: KeyOf<T>[]): Record<KeyOf<T>, T[]>
export function byKey<T>(array: T[], mapFn: KeyOf<T> | GroupFn<T>, ...keys: KeyOf<T>[]) {
	if (isFunction(mapFn))
		return Object.groupBy(array, mapFn);

	const keyed = [mapFn]																			// assume mapFn is a keyof T
		.concat(keys)																						// append any trailing keyof T[]
		.flat() as unknown as KeyOf<T>[];												// flatten Array-of-Array

	return Object.groupBy(array, itm =>												// group an array into an object with named keys
		keyed
			.map(key => isUndefined(itm[key]) ? '' : stringify(itm[key]))
			.join('.')
	)
}

/** return an object grouped by key-fields in an array of documents, but only the 'last' entry */
// export function byLkp<T>(array: T[], mapFn: GroupFn<T>): Record<KeyOf<T>, T>
// export function byLkp<T>(array: T[], key: KeyOf<T>, ...keys: KeyOf<T>[]): Record<KeyOf<T>, T>
export function byLkp<T>(array: T[], mapFn: KeyOf<T> | GroupFn<T>, ...keys: KeyOf<T>[]) {
	const group = byKey(array, mapFn, ...keys);

	return ownEntries(group)
		.reduce((acc, [key, grp]) => Object.assign(acc, { [key]: grp?.pop() }), {} as Record<string, T>)
}