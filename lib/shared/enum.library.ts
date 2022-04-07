import { isNumeric } from '@module/shared/number.library';
import { isNumber } from '@module/shared/type.library';

/**
 * Enums have three types: Numeric (with reverse-mapping), String and Heterogeneous (mixed Number and String) keys.  
 */

/** array of Enum keys */
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

/** Count of Enum keys */
export const enumCount = <T>(enumType: T) => enumKeys(enumType).length;

/** array of Enum values */
export const enumValues = <T>(enumType: T) => enumKeys(enumType).map(key => enumType[key]);

/** array of Enum's [key, value] tuples */
export const enumEntries = <T>(enumType: T) => enumKeys(enumType).map(key => [key, enumType[key]]);