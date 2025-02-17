import { ownEntries } from '@core/shared/reflect.library.js';
import { isArray } from '@core/shared/type.library.js';
import type { Entry, Index } from '@core/shared/type.library.js';

/** extend the Enum object with 'helper' methods */
type helper<T> = {
	/** original Enum as Readonly Record */										enum(): T;
	/** count of Enum keys */																	count(): number;
	/** array of Enum keys */																	keys(): (keyof T)[];
	/** array of Enum values */																values(): T[keyof T][];
	/** tuple of Enum entries */															entries(): [keyof T, T[keyof T]][];
	/** reverse lookup of Enum key by value */								keyOf(val: T[keyof T]): keyof T;
	/** Iterator for Enum */[Symbol.iterator](): Iterator<Entry<T extends {} ? T : never>>;
	/** string tag */[Symbol.toStringTag](): string;
}
export type Enumify<T> = Readonly<Omit<T, keyof helper<T>>>
type Wrap<T> = Readonly<T & helper<T>>

/**
 * an 'enum-like' object that we can use (until Javascript implements one)
 */
export function enumify<const T extends (string | number)[]>(...list: T[]): Wrap<Index<T>>;
export function enumify<const T extends ReadonlyArray<string | number>>(...list: T[]): Wrap<Index<T>>;
export function enumify<const T extends Record<keyof T, any>>(list: T): Wrap<T>;
export function enumify<const T extends Record<keyof T, any>>(list: T) {
	const stash = isArray(list)																// clone original Enum as an Object
		? (list as (string | number)[]).reduce((acc, itm, idx) => Object.assign(acc, { [itm]: idx }), {})
		: { ...list }
	const entries = ownEntries(stash);												// define once; use in entries(), keyOf, iterator()
	const reverse = entries																		// build a reverse-keyof object
		.reduce((acc, [key, val]) => Object.assign(acc, { [val]: key }), {} as Record<string | number, T>);

	const enumType = Object.defineProperties(stash, {					// helper methods
		enum: { value: () => ({ ...stash }) },									// without helper methods
		count: { value: () => entries.length },
		keys: { value: () => entries.map(([key, _]) => key) },
		values: { value: () => entries.map(([_, val]) => val) },
		entries: { value: () => entries },
		keyOf: { value: (val: string | number) => reverse[val] },
		[Symbol.toStringTag]: ({ get: () => 'Enumify' }),
		[Symbol.iterator]: {
			value: () => {
				const iterator = entries[Symbol.iterator]();
				return { next: () => iterator.next(), }							// iterate through entries()
			}
		}
	})

	return Object.freeze(enumType);														// block mutations
}
