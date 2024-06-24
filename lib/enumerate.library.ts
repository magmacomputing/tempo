import { isNumeric } from '@module/shared/number.library.js';
import { isNumber } from '@module/shared/type.library.js';

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
			// .sort(([, val1], [, val2]) => val1 = val2)						// 	sort by the number-values, and
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
	/** array of Enum keys */																	keys(): (keyof T)[];
	/** count of Enum keys */																	count(): number;
	/** array of Enum values */																values(): T[keyof T][];
	/** tuple of Enum entries */															entries(): [keyof T, T[keyof T]][];
	// /** default Iterator for Enum */[Symbol.iterator](): Iterator<T>;
	// /** string tag */[Symbol.toStringTag](): string;
}
export type Enum<T> = Omit<T, keyof helper<T>>

export function enumify<const T extends {}>(factor: T) {
	const entries = enumEntries(factor);											// define once, use in entries(), enum(), iterator()

	return Object.assign({}, factor, {
		keys: () => enumKeys(factor),
		count: () => enumCount(factor),
		values: () => enumValues(factor),
		entries: () => entries,
		enum: () => entries.reduce((acc, [key, val]) => Object.assign(acc, { [key]: val }), {} as T),
		get [Symbol.toStringTag]() { return 'Enum' },
		get [Symbol.iterator]() {
			const list = entries[Symbol.iterator]();
			return {
				next: () => list.next(),														// iterate through entries()
			}
		},
	})
}