/**
 * This section is for 'Objects as Enums'  
 * https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums
 */

type helper<T> = {																					// types for standard Enum methods
	keys: () => (keyof T)[];
	count: () => number;
	values: () => T[keyof T][];
	entries: () => [keyof T, T[keyof T]][];
}

export function enumify<T extends {}>(obj: T) {
	return class {
		static [key: string | number | symbol]: any;						// index signature for Enum key-value pair
		static {
			Object.entries(obj)
				.forEach(([key, val]) => this[key] = val as T)
		}

		static keys() { return Object.keys(obj) as (keyof T)[] };
		static count() { return Object.keys(obj).length };
		static values() { return Object.values(obj) as T[keyof T][] };
		static entries() { return Object.entries(obj) as [keyof T, T[keyof T]][] };

		static [Symbol.iterator]() {														// iterate over Enum properties
			const props = this.entries();													// array of Enum key-value pairs
			let idx = -1;

			return {
				next: () => ({
					done: ++idx >= props.length,
					enum: {
						property: props[idx][0],
						value: props[idx][1],
					}
				}),
			}
		}

		static [Symbol.toStringTag]() {
			return 'Enum';																				// hard-coded to avoid minification mangling
		}
	} as unknown as T & helper<T>
}


// // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// /**
//  * This Class is experimental, and not release yet.  
//  * It is an attempt to make Enum declarations centralized,  
//  * so that if Javascript supports this in the future it will be easy to retro-fit.
//  */

// interface Enum {
// 	/** Enum keys */							keys(): string[];
// 	/** Enum values */						values(): unknown[];
// 	/** tuple of Enum entries */	entries(): [string, unknown][];
// }
// class Enum implements Enum {																// base Class for Enum methods
// 	/** Enum keys */
// 	static keys() {
// 		return Object.keys(this);
// 	}
// 	/** Enum values */
// 	static values() {
// 		return Object// 		/** iterate over Enum properties */
// 		static [Symbol.iterator]() {
// 			const props = this.entries();														// array of 'getters'
// 			let idx = -1;

// 			return {
// 				next: () => ({
// 					done: ++idx >= props.length,
// 					value: {
// 						property: props[idx][0],
// 						value: this[props[idx][0]],
// 					}
// 				}),
// 			}
// 		}
// 	} as unknown as T & Enum
// export function enumify<T extends {}>(obj: T) {
// 	return class extends Enum {
// 		static [key: string | number | symbol]: unknown;				// index signature for static properties

// 		static {
// 			for (const [key, val] of allEntries(obj))
// 				this[key] = val;																		// add the dynamic static properties
// 		}

// 		/** iterate over Enum properties */
// 		static [Symbol.iterator]() {
// 			const props = this.entries();														// array of 'getters'
// 			let idx = -1;

// 			return {
// 				next: () => ({
// 					done: ++idx >= props.length,
// 					value: {
// 						property: props[idx][0],
// 						value: this[props[idx][0]],
// 					}
// 				}),
// 			}
// 		}
// 	} as unknown as T & Enum
// }
