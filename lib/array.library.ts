import { isTempo } from '@module/shared/tempo.class.js';
import { asString } from '@module/shared/string.library.js';
import { getPath } from '@module/shared/object.library.js';
import { cloneify } from '@module/shared/serialize.library.js';
import { asType, isNumber, isDate, isIterable, isString, isArrayLike, nullToValue } from '@module/shared/type.library.js';

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

// insert a value into an Array by its sorted position
export const sortInsert = <T>(arr: T[] = [], val: T) => {
	let low = 0, high = arr.length;
	let clone = asArray(arr);

	while (low < high) {
		const mid = (low + high) >>> 1;													// divide by 2
		if (clone[mid] < val)
			low = mid + 1
		else high = mid
	}

	return clone.splice(low, 0, val);
}

/** sort Array-of-Objects by multiple keys */
export interface SortBy {
	field: string;
	dir?: 'asc' | 'desc';
	index?: number | '*';
	default?: any;
}
/** return a function that will apply a series of sort-keys */
export function sortBy<T>(...keys: (string | SortBy)[]) {
	const sortOptions = keys																	// coerce string => SortBy
		.flat()																									// flatten Array-of-Array
		.map(key => isString(key) ? { field: key } : key)				// build Array of sort-options

	return (a: Record<string, T>, b: Record<string, T>) => {
		let result = 0;

		sortOptions.forEach(key => {
			if (result === 0) {																		// no need to look further if result !== 0
				const dir = key.dir === 'desc' ? -1 : 1;
				const valueA = getPath<number>(a, key.field, nullToValue(key.default, 0), key.index);
				const valueB = getPath<number>(b, key.field, nullToValue(key.default, 0), key.index);

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

/** Group documents by key-fields */
export function keyedBy<T extends Record<PropertyKey, string>>(array: T[], key: string) {
	return Object.groupBy(array, (itm) => itm[key]);
}
