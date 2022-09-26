import { isNumeric } from '@module/shared/number.library';
import { isNumber } from '@module/shared/type.library';

/**
 * Typescript Enums have three types:  
 * a. Numeric (with reverse-mapping),
 * b. String and 
 * c. Heterogeneous (mixed Number and String) keys.  
 */

/** array of Enum keys */
export const enumKeys = <T>(enumType: T) => {
	const enumEntries = Object.entries(enumType as T & object).filter(([, val]) =>
		isNumber(val)) as [keyof T, number][];

	const enumKeys = Object.keys(enumType as T & {})					// Enum keys
		.filter(key => !isNumeric(key)) as (keyof T)[];

	return (enumEntries.length === enumKeys.length)						// if Numeric Enum
		? enumEntries
			.sort(([, val1], [, val2]) => val1 = val2)						// sort by the number-values
			.map(([key,]) => key)																	// 	and return the keys
		: enumKeys																							// else String/Heterogeneous Enum
}

/** count of Enum keys */
export const enumCount = <T>(enumType: T) =>								// Enum length
	enumKeys(enumType).length;

/** array of Enum values */
export const enumValues = <T>(enumType: T) =>								// Enum values
	enumKeys(enumType)
		.map(key => enumType[key]);

/** array of Enum's [key, value] tuples */
export const enumEntries = <T>(enumType: T) =>							// Enum entries
	enumKeys(enumType)
		.map(key => [key, enumType[key]] as [keyof T, T[keyof T]]);