/**
 * This section is for 'Objects as Enums'  
 * https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums  
 *  
 * It is an attempt to make Enum declarations centralized,  
 * so that if Javascript supports this in the future it will be easy to retro-fit.  
 */

type helper<T> = {																					// types for standard Enum methods
	keys: () => (keyof T)[];
	count: () => number;
	values: () => T[keyof T][];
	entries: () => [keyof T, T[keyof T]][];
}

export function enumify<const T extends {}>(obj: T) {
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
		}

		static [Symbol.toStringTag]() {
			return 'Enum';																				// hard-coded to avoid minification mangling
		}
	} as unknown as T & helper<T>
}
