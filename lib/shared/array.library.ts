import { asString } from '@module/shared/string.library';
import { getPath } from '@module/shared/object.library';
import { cloneify } from '@module/shared/serialize.library';
import { asType, isNumber, isDate, isIterable, isString, isBoolean, isArrayLike, nullToValue } from '@module/shared/type.library';

/** Coerce value into value[], if not already value[], with optional fill Object */
export function asArray<T>(arr: Exclude<ArrayLike<T>, string> | undefined): T[];
export function asArray<T>(arr: T | Exclude<Iterable<T> | undefined, string>): NonNullable<T>[];
export function asArray<T, K>(arr: Iterable<T> | ArrayLike<T>, fill: K): K[];
export function asArray<T, K>(arr: T | Iterable<T> | ArrayLike<T> = [], fill?: K): (T | K)[] {
	switch (true) {
		case isArrayLike<T>(arr):																// allow for {length:nn} objects
		case isIterable<T>(arr) && !isString(arr):							// dont iterate Strings
			const args = asType(fill);														// get type of fill-parameter

			return Array.from<T, K>(arr as T[], val => {
				return args.type === 'Undefined' || val !== void 0
					? val as unknown as K															// if no 'fill', then use val
					: cloneify(fill as K)															// clone 'fill' to create new Objects
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

	clone.splice(low, 0, val);
	return clone;
}

/** sort Array-of-Objects by multiple keys */
export interface SortBy {
	field: string;
	dir?: 'asc' | 'desc';
	index?: number | '*';
	default?: any;
}
/** return a function that will apply a series of sort-keys */
export const sortBy = <T>(...keys: (string | SortBy)[] | [arg: (string | SortBy)[]]) => {
	const sortOptions = keys
		.flat()																									// flatten Array-of-Array
		.map(key => isString(key) ? { field: key } : key)				// build Array of sort-options

	return (a: Record<string, T>, b: Record<string, T>) => {
		let result = 0;

		sortOptions.forEach(key => {
			if (result === 0) {																		// stop looking if result !== 0
				const dir = key.dir === 'desc' ? -1 : 1;
				const valueA = getPath<any>(a, key.field, nullToValue(key.default, 0), key.index);
				const valueB = getPath<any>(b, key.field, nullToValue(key.default, 0), key.index);

				switch (true) {
					case isNumber(valueA) && isNumber(valueB):
					case isDate(valueA) && isDate(valueB):
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
export function keyedBy<T, K extends string>(table: T[], key: string): Record<K, T[]>;
export function keyedBy<T>(table: T[], ...keys: string[]): Record<string, T[]>;
export function keyedBy<T, K extends string>(table: T[], flatten: true, key: string): Record<K, T>;
export function keyedBy<T>(table: T[], flatten: true, ...keys: string[]): Record<string, T>;
export function keyedBy<T, K extends string>(table: T[], flatten: false, key: string): Record<K, T[]>;
export function keyedBy<T>(table: T[], flatten: false, ...keys: string[]): Record<string, T[]>;
export function keyedBy<T, K extends string>(table: T[], ...keys: [...K[]] | [boolean, ...K[]]) {
	let flatten = false;
	if (isBoolean(keys[0])) {
		flatten = keys[0];
		keys.splice(0, 1);
	}

	return table.reduce((acc, row) => {
		const group = (keys as K[])
			.map(key => getPath(row, key)).join(':') as K;

		if (flatten)
			acc[group] = row;																			// only return last match
		else
			((acc[group] as T[]) ??= []).push(row);								// return all matches in Array

		return acc;
	}, {} as Record<K, T | T[]>);
}
