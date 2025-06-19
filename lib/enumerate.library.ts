import { stringify } from '#core/shared/serialize.library.js';
import { isArray, isObject } from '#core/shared/type.library.js';
import { ownKeys, ownValues, ownEntries } from '#core/shared/reflection.library.js';
import type { Index, Prettify, Entry, Invert, Property, Count } from '#core/shared/type.library.js';

/**
 * The intent of this module is to provide a Javascript-supported syntax for an object to behave as an Enum.  
 * It can be used instead of Typescript's Enum (which is not supported in vanilla JS)
 */

/**
 * This is the prototype for an Enum object.  
 * It contains just the methods / symbols we need.
 */
const ENUM = Object.create(null, {
	count: value(function (this: Property<any>) { return ownKeys(this).length }),
	keys: value(function (this: Property<any>) { return ownKeys(this) }),
	values: value(function (this: Property<any>) { return ownValues(this) }),
	entries: value(function (this: Property<any>) { return ownEntries(this) }),
	invert: value(function (this: Property<any>) { return enumify(ownEntries(this).reduce((acc, [key, val]) => ({ ...acc, [val]: key }), {})) }),
	keyOf: value(function (this: Property<any>, search: any) { return ownEntries(this).filter(([, val]) => val === search)[0]?.[0] }),
	toString: value(function (this: Property<any>) { return stringify({ ...this }) }),
	[Symbol.toStringTag]: value('Enumify'),
	[Symbol.iterator]: value(function (this: Property<any>) { return ownEntries(this)[Symbol.iterator](); }),
})

/** define a Descriptor for an Enum's method */
function value(value: PropertyDescriptor["value"]) {
	return Object.assign({ enumerable: false, configurable: false, writable: false } as const, { value } as const);
}

type Entries<T> = Entry<T extends {} ? T : never>
type Enumify<T extends Property<any>> = Readonly<Omit<T, keyof Methods<T>>>				// strip out the helper methods
type Wrap<T extends Property<any>> = T & Methods<T>
/** avoid infinite recursion on invert() method. */
type Depth<T extends Property<any>> = Invert<T> & Omit<Methods<Invert<T>>, "invert">

/** extend the Enum object with 'helper' methods */
type Methods<T extends Property<any>> = {
	/** count of Enum keys */																	count(): Count<keyof T>;
	/** array of Enum keys */																	keys(): (keyof T)[];
	/** array of Enum values */																values(): T[keyof T][];
	/** tuple of Enum entries */															entries(): { [K in keyof T]: [K, T[K]] }[keyof T][];
	/** invert Enum key-values */															invert(): Prettify<Depth<T>>;
	/** reverse lookup of Enum key by value */								keyOf<V extends T[keyof T]>(value: V): Invert<T>[V];
	/** stringify method */																		toString(): string;
	/** string tag */																					[Symbol.toStringTag](): 'Enumify';
	/** Iterator for Enum */																	[Symbol.iterator](): Iterator<Entries<T>, [keyof T, T[keyof T]]>;
}

export namespace Enum {
	export type type<T extends Property<any>> = Enumify<T>
	export type keys<T extends Property<any>> = keyof Enumify<T>
	export type values<T extends Property<any>> = T[keyof Enumify<T>]
}

/**
 * function to return an 'enum-like' object (that we can use until Javascript implements its own)  
 * with useful helper-methods on the prototype
 */
export function enumify<const T extends ReadonlyArray<PropertyKey>>(list: T): Prettify<Wrap<Index<T>>>;
export function enumify<const T extends Record<keyof T, any>>(list: T): Prettify<Wrap<T>>;
export function enumify<const T extends Record<keyof T, any>>(list: T) {
	if (!isArray(list) && !isObject(list))
		throw new Error(`enumify requires an array or object as input`);

	const stash = isArray<PropertyKey>(list)									// refactor Array as an Object
		? list.reduce((acc, itm, idx) => Object.assign(acc, { [itm]: idx }), {})
		: { ...list }

	return Object.create(ENUM, Object.getOwnPropertyDescriptors(stash));
}


/**
 * Example of usage
 * 
 * const SEASON = enumify({ Spring: 'spring', Summer: 'summer', Autumn: 'autumn', Winter: 'winter' });
 * type SEASON = Enum.values<typeof SEASON>
 * 
 * SEASON.keys()																						// Spring | Summer | Autumn | Winter
 * SEASON.values()																					// spring | summer | autumn | winter
 * SEASON.entries()																					// [['Spring','spring'], ['Summer','summer'], ['Autumn','autumn'], ['Winter','winter']];
 * SEASON.count()																						// 4
 * SEASON.keyOf('summer')																		// Summer
 * getType(SEASON)																					// Enumify
 * SEASON.toString()																				// '{"Spring": "spring", "Summer": "summer", "Autumn": "autumn", "Winter": "winter"}'
 * SEASON.invert()																					// enumify({spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter'})
 */