import { isNumeric } from '@module/shared/number.library.js';
import { Entry, isNumber } from '@module/shared/type.library.js';

/**
 * Typescript Enums have three types:  
 * a. Numeric (with reverse-mapping),
 * b. String and 
 * c. Heterogeneous (mixed Number and String) keys.  
 * 
 * https://www.typescriptlang.org/docs/handbook/enums.html  
 * 
 * if Object.values(enum) contains only numeric values, 
 * we presume type a.   otherwise, type b. or type c.
 */

/** array of Enum keys */
export const enumKeys = <T extends {}>(enumType: T) => {
	const entries = Object.entries(enumType as T)							// only numeric Enum values
		.filter(([, val]) => isNumber(val)) as [keyof T, number][];

	const keys = Object.keys(enumType as T)										// only non-numeric Enum keys
		.filter(key => !isNumeric(key)) as (keyof T)[];

	return (entries.length !== keys.length)										// if not-Numeric Enum
		? keys																									// 	String/Heterogeneous Enum
		: entries																								// else just the numeric Enum values
			.map(([key,]) => key);																// 	return the keys
}

/** count of Enum keys */
export const enumCount = <T extends {}>(enumType: T) =>			// Enum length
	enumKeys(enumType).length;

/** array of Enum values */
export const enumValues = <T extends {}>(enumType: T) =>		// Enum values
	enumKeys(enumType)
		.map(key => enumType[key]);

/** array of Enum tuples [key, value] */
export const enumEntries = <T extends {}>(enumType: T) =>		// Enum entries
	enumKeys(enumType)
		.map(key => [key, enumType[key]] as [keyof T, T[keyof T]]);

/** extend the Enum type with 'helper' methods */
type helper<T> = {
	/** original Enum */																			enum(): T;
	/** array of Enum keys */																	keys(): (keyof T)[];
	/** count of Enum keys */																	count(): number;
	/** array of Enum values */																values(): T[keyof T][];
	/** tuple of Enum entries */															entries(): [keyof T, T[keyof T]][];
	/** reverse lookup of Enum key by value */								lookup(val: T[keyof T]): keyof T | undefined;
	/** default Iterator for Enum */[Symbol.iterator](): Iterator<Entry<T extends {} ? T : never>>;
	/** string tag */[Symbol.toStringTag](): string;
}
export type Enum<T> = Omit<T, keyof helper<T>>

export function enumify<const T extends Record<keyof T, keyof any>>(list: T) {
	const stash = { ...list };																// clone original Enum
	const entries = enumEntries(stash);												// define once: use in entries(), iterator()

	return Object.defineProperties(stash, {																					// helper methods
		keys: { value: () => enumKeys(list) },
		count: { value: () => enumCount(list) },
		values: { value: () => enumValues(list) },
		entries: { value: () => entries },
		enum: { value: () => stash as T },
		lookup: { value: (val: K in keyof T as T[K]) => entries.find(entry => entry[1] === val) },
		[Symbol.toStringTag]: ({ get: () => 'Enum' }),
		[Symbol.iterator]: {
			value: () => {
				const iterator = entries[Symbol.iterator]();
				return { next: () => iterator.next(), }							// iterate through entries()
			}
		}
	}) as T & helper<T>
}
