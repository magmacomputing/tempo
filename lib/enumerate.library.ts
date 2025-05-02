import { asArray } from '#core/shared/array.library.js';
import { ownEntries } from '#core/shared/reflect.library.js';
import { isArray, type Index, type Prettify, type Entry } from '#core/shared/type.library.js';

/**
 * The intent of this module is to provide a Javascript-supported syntax for 
 * an object to behave as an Enum.  
 * It can be used instead of Typescript's enum (which is not supported in vanilla NodeJS)
 */

/**
 * This is the prototype for an Enumify object  
 * It will contain only the methods we define.
 */
const ENUM = Object.create(null, {
	count: value(function (this: {}) { return Object.keys(this).length }),
	keys: value(function (this: {}) { return Object.freeze(Object.keys(this)) }),
	values: value(function (this: {}) { return Object.freeze(Object.values(this)) }),
	entries: value(function (this: {}) { return Object.freeze(Object.entries(this)) }),
	inverse: value(function (this: {}) { return Object.freeze(Object.entries(this).map(([key, val]) => [val, key])) }),
	keyOf: value(function (this: {}, search: string | number) { return Object.entries(this).filter(([, val]) => val === search)[0]?.[0] }),
	toString: value(function (this: {}) { return JSON.stringify(this) }),
	[Symbol.toStringTag]: value('Enumify'),
	[Symbol.iterator]: value(function (this: {}) {
		const iterator = Object.entries(this)[Symbol.iterator]();
		return { next: () => Object.freeze(iterator.next()), }
	})
})

/** extend the Enum object with 'helper' methods */
type helper<T> = {
	// /** original Enum as Readonly Record */										enum(): T;
	/** count of Enum keys */																	count(): number;
	/** array of Enum keys */																	keys(): (keyof T)[];
	/** array of Enum values */																values(): T[keyof T][];
	/** tuple of Enum entries */															entries(): Entry<T extends {} ? T : never>;// [keyof T, T[keyof T]][];
	/** inverse of Enum */																		inverse(): Record<T[keyof T] & string | number, T>;
	/** reverse lookup of Enum key by value */								keyOf(value: T[keyof T]): keyof T;
	/** stringify method */																		toString(): string;
	/** Iterator for Enum */[Symbol.iterator](): Iterator<Entry<T extends {} ? T : never>>;
	/** string tag */[Symbol.toStringTag](): 'Enumify';
}
type Enumify<T> = Readonly<Omit<T, keyof helper<T>>>				// strip out the helper methods
type keyOf<T> = keyof Enumify<T>
export namespace Enum {
	export type type<T> = Enumify<T>
	export type keys<T> = keyOf<T>
	export type values<T> = T[keyOf<T>]
}

type Wrap<T> = Readonly<T & helper<T>>

/** add a \{value} function to an Object's property */
function value(value: PropertyDescriptor["value"]) {
	return Object.assign({ enumerable: false, configurable: false, writable: false } as const, { value } as const);
}

/**
 * an 'enum-like' object (that we can use until Javascript implements its own)  
 * with useful helper-methods
 */
export function enumify<const T extends ReadonlyArray<string | number>>(...list: T[]): Prettify<Wrap<Index<T>>>;
export function enumify<const T extends Record<keyof T, any>>(list: T): Prettify<Wrap<T>>;
export function enumify<const T extends Record<keyof T, any>>(list: T, opts?: Record<string, any>) {
	const stash = isArray(list)																// refactor Array as an Object
		? (asArray(list) as (string | number)[]).reduce((acc, itm, idx) => Object.assign(acc, { [itm]: idx }), {})
		: { ...list }

	return Object.freeze(Object.assign(Object.create(ENUM, { ...stash })));
	// const entries = ownEntries(stash);												// define once; use in entries(), keyOf, iterator()
	// const inverse = entries																		// build a reverse-keyof object
	// 	.reduce((acc, [key, val]) => Object.assign(acc, { [val]: key }), {} as Record<string | number, T>);

	// Object.defineProperties(stash, {													// add the helper methods
	// 	count: value(() => entries.length),
	// 	enum: value(() => Object.freeze({ ...stash })),
	// 	keys: value(() => Object.freeze(entries.map(([key, _]) => key))),
	// 	values: value(() => Object.freeze(entries.map(([_, val]) => val))),
	// 	entries: value(() => Object.freeze(entries.map(([key, val]) => [key, val]))),
	// 	inverse: value(() => Object.freeze({ ...inverse })),
	// 	keyOf: value((val: string | number) => inverse[val]),
	// 	toString: value(() => JSON.stringify({ ...stash })),
	// 	[Symbol.toStringTag]: value('Enumify'),
	// 	[Symbol.iterator]: value(() => {
	// 		const iterator = entries[Symbol.iterator]();
	// 		return { next: () => Object.freeze(iterator.next()), }
	// 	}),
	// })

	// return Object.freeze(stash);															// block mutations
}
