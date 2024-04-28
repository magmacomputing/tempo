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
	const enumEntries = Object.entries(enumType as T)					// only numeric Enum values
		.filter(([, val]) => isNumber(val)) as [keyof T, number][];

	const enumKeys = Object.keys(enumType as T)								// only non-numeric Enum keys
		.filter(key => !isNumeric(key)) as (keyof T)[];

	return (enumEntries.length !== enumKeys.length)						// if not-Numeric Enum
		? enumKeys																							// 	String/Heterogeneous Enum
		: enumEntries																						// else
			// .sort(([, val1], [, val2]) => val1 = val2)						// 	sort by the number-values, and
			.map(([key,]) => key)																	// 	return the keys
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

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * This section is for 'Objects as Enums'  
 * https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
*/

// type Enum<E> = E[keyof E];
// type Enum<E> = Record<keyof E, E[keyof E]>
// type Enum<E> = Record<keyof  E, unknown>
type Enum<T> = {
	[id in keyof T]: T[keyof T];
};

export const objCount = <T>(enumType: Enum<T>) =>
	Object.keys(enumType).length;

export const objKeys = <T>(enumType: Enum<T>) =>
	Object.keys(enumType) as unknown as keyof T;

export const objValues = <T>(enumType: Enum<T>) =>
	Object.values(enumType) as T[keyof T];

export const objEntries = <T>(enumType: Enum<T>) =>
	Object.entries(enumType) as [keyof T, T[keyof T]];
