import type { ValueOf } from '@module/shared/type.library.js';

/**
 * This Class is for 'Objects as Enums'  
 * https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums  
 *  
 * It is an attempt to make Enum declarations centralized,  
 * so that if Javascript supports this in the future, it will be easy to retro-fit. 
 * 
 * The benefits to this approach over Typescript's enums is that it adds support for methods  
 * (toStringTag, Iterator, keys, count, values, entries)   
 * as well as string-arguments in functions that match the Enum values  
 * For example:  
 * * const SEASON = enumify({ Spring: 'spring', Summer: 'summer', Autumn: 'autumn', Winter: 'winter' });  
 * * console.log('keys: ', SEASON.keys());  # 'helper' functions added to Enum  
 * * getSeason('spring');				 # where we can use a string from the Enum values  
 * * getSeason(SEASON.Spring);	 # or a member of the Enum  
 * 
 * The drawback to this approach is that we lose some of the Typescript benefits,  
 * like namespace-ing allowable values.  
 * Instead we need to declare arguments of a Function without the 'helper' methods.  
 * For example:  
 * * function getSeason(szn: Enum\<typeof SEASON>) { console.log('season: ', szn) }  
 */

type helper<T> = {																					// types for standard Enum methods
	/** array of Enum keys */																	keys: () => (keyof T)[];
	/** count of Enum keys */																	count: () => number;
	/** array of Enum values */																values: () => T[keyof T][];
	/** tuple of Enum entries */															entries: () => [keyof T, T[keyof T]][];
	/** default Iterator for Enum */[Symbol.iterator](): Iterator<T>,
}

/**
 * expose only the Static members of a Class enum  
 * For example:  
 * * const SEASON = enumify({ Spring: 'spring', Summer: 'summer', Autumn: 'autumn', Winter: 'winter' });  
 * * const szn: Enum\<typeof SEASON>;  
 */
export type Enum<T> = ValueOf<Omit<T, keyof helper<T>>>

/** Enum as static-Class as well as useful methods */
export function enumify<const T extends {}>(obj: T) {
	return class {
		static [key: string | number | symbol]: any;						// index signature for Enum key-value pair
		static {																								// static block to load properties
			Object
				.entries(obj)
				.forEach(([key, val]) => this[key] = val as T)
		}

		static keys() { return Object.keys(obj) as (keyof T)[] };
		static count() { return Object.keys(obj).length };
		static values() { return Object.values(obj) as T[keyof T][] };
		static entries() { return Object.entries(obj) as [keyof T, T[keyof T]][] };

		static [Symbol.iterator]() {														// iterator for Enum properties
			const props = this.entries()[Symbol.iterator]();			// tuple of Enum [key, value][]

			return {
				next: () => props.next(),														// iterate through entries()
			}
		}

		static get [Symbol.toStringTag]() {											// hard-coded to avoid minification mangling
			return 'Enum';
		}

		static toString() {																			// method for JSON.stringify()
			return this.entries()
				.reduce((acc, [key, val]) => Object.assign(acc, { [key]: val }), {} as T)
		}
	} as unknown as T & helper<T>
}
