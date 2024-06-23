import { isNumber, isObject } from '@module/shared/type.library.js';
import type { Entry, Index } from '@module/shared/type.library.js';

/**
 * This Class is for 'Objects as Enums'  
 * https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums  
 *  
 * It is an attempt to make Enum declarations centralized,  
 * so that if Javascript supports this in the future, it will be easy to retro-fit. 
 * 
 * The benefits to this approach over Typescript's Enums is that it adds support for methods  
 * (toStringTag, Symbol.iterator, keys, count, values, entries)   
 * as well as string-arguments in functions that match the Enum values  
 * For example:  
 * * const SEASON = enumify({ Spring: 'spring', Summer: 'summer', Autumn: 'autumn', Winter: 'winter' });  
 * * console.log('keys: ', SEASON.keys());  								# 'helper' functions added to Enum  
 * * getSeason('spring');				 														# where we can use a string from the Enum values  
 * * getSeason(SEASON.Spring);	 														# or a member of the Enum  
 * 
 * The drawback to this approach is that we lose some of the Typescript benefits,  
 * like namespace-ing allowable values.  
 * Instead we can declare arguments of a Function without the 'helper' methods.  
 * For example:  
 * * function getSeason(szn: Enum\<typeof SEASON>) { console.log('season: ', szn) }  
 */

type helper<T> = {																					// types for standard Enum methods
	/** array of Enum keys */																	keys(): (keyof T)[];
	/** count of Enum keys */																	count(): number;
	/** array of Enum values */																values(): T[keyof T][];
	/** tuple of Enum entries */															entries(): [keyof T, T[keyof T]][];
	// /** default Iterator for Enum */[Symbol.iterator](): Iterator<T>;
	// /** string tag */[Symbol.toStringTag](): string;
}

export type Enum<T> = Omit<T, keyof helper<T>>

/**
 * add values as Static properties of a Class-based Enum  
 * For example:  
 * * const SEASON = enumify({ Spring: 'spring', Summer: 'summer', Autumn: 'autumn', Winter: 'winter' });  
 * * type szn = Enum\<typeof SEASON>  
 * 
 * or, to auto-assign numeric values:  
 * *	const WEEKDAY = enumify('All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');  
 * *	type dow = Enum\<typeof WEEKDAY>  
 */

/** Enum as static-Class as well as useful methods */
export function enumify<const T extends {}>(...obj: T[]): T & helper<T>;
export function enumify<const T extends readonly string[]>(...obj: T[]): Index<T>;
export function enumify<T extends {}>(...obj: T[]) {
	return class {
		static [key: PropertyKey]: any;													// index signature for Enum key-value pair, plus (if applicable) numeric reverse-lookups
		static #entries = [] as Entry<T>[];											// just original key-value pairs

		static {																								// static block to load properties
			this.#entries = isObject(obj[0])
				? Object.entries(obj[0]) as Entry<T>[]
				: obj.reduce((acc, key, idx) => Object.assign(acc, [key, idx]), [] as Entry<T>[]);

			this.#entries
				.forEach(([key, val]) => this[key.toString()] = val)// add each key:value as static property

			// if (this.#entries.every(([_, value]) => isNumber(value)))																						// if numeric-only values provided, 
			// 	this.#entries																				// create reverse-lookup
			// 		.forEach(([key, val]) => this[val.toString()] = key);
		}

		static count() { return this.#entries.length };
		static keys() { return this.#entries.map(([key, _]) => key) };
		static values() { return this.#entries.map(([_, val]) => val) };
		static entries() { return this.#entries };

		static [Symbol.iterator]() {														// iterator for Enum properties
			const props = this.#entries[Symbol.iterator]();				// tuple of Enum [key, value][]

			return {
				next: () => props.next(),														// iterate through entries()
			}
		}

		static get [Symbol.toStringTag]() {											// hard-coded to avoid minification mangling
			return 'Enum';
		}

		static toString() {																			// method for JSON.stringify()
			return this.#entries
				.reduce((acc, [key, val]) => Object.assign(acc, { [key]: val }), {} as T)
		}
	} as unknown as T extends  string[] ? never : T & helper<T>
}

// const mam = ['a', 'b', 'z'] as const;
// const dab = mam as unknown as Index<typeof mam>

// dab[0]

// const szn = enumify('Spring', 'Summer', 'Autumn', 'Winter') ;

// szn.keys()

// const tm = enumify({ Year: 'year', Month: 'month' });
// tm.keys()

// function blah<const T extends readonly string[]>(...arg: T) {
// 	return arg as unknown as Index<T>
// }

// const gfp = blah('x', 'y', 'z');
// gfp.0

