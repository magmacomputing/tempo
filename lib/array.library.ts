import { isNumber, isDate, isIterable, isString, nullToValue, isBoolean } from '@module/shared/type.library';
import { asString } from '@module/shared/string.library';
import { isNumeric } from '@module/shared/number.library';
import { getPath } from '@module/shared/object.library';

/** Coerce value into value[], if not already value[] */
export const asArray = <T>(arr: T | Iterable<T> = [], str = false) => {
	switch (true) {
		case isIterable<T>(arr):
			return Array.from<T>(arr as T[]);

		case isString(arr) && str:															// special case, to split String by character
			return Array.from<T>(arr as T[]);

		default:
			return Array.of<T>(arr as T);
	}
}

/**
 * Enums have three types: Numeric (with reverse-mapping), String and Heterogeneous (mixed Number and String) keys.  
 */
export const enumKeys = <T>(enumType: T) => {
	const enumEntries = Object.entries(enumType).filter(([, val]) => isNumber(val)) as [keyof T, number][];
	const enumKeys = Object.keys(enumType).filter(key => !isNumeric(key)) as (keyof T)[];

	if (enumEntries.length === enumKeys.length) {							// if Numeric Enum
		return enumEntries
			.sort(([, val1], [, val2]) => val1 - val2)						// sort by the number-values
			.map(([key,]) => key)																	// then return the keys			
	} else {
		return enumKeys;																				// else String/Heterogeneous Enum
	}
}
export const enumCount = <T>(enumType: T) => enumKeys(enumType).length;
export const enumValues = <T>(enumType: T) => enumKeys(enumType).map(key => enumType[key]);
export const enumEntries = <T>(enumType: T) => enumKeys(enumType).map(key => [key, enumType[key]]);

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

/** sort Object by multiple keys */
export interface SortBy {
	field: string;//| FieldPath;
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
