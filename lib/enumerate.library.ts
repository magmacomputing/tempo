import { isArray, isObject } from '#core/shared/type.library.js';
import { ownKeys, ownValues, ownEntries } from '#core/shared/reflect.library.js';
import type { Index, Prettify, Entry, ReverseMap, Property, Count } from '#core/shared/type.library.js';

/**
 * The intent of this module is to provide a Javascript-supported syntax for 
 * an object to behave as an Enum.  
 * It can be used instead of Typescript's enum (which is not supported in vanilla JS)
 */

/**
 * This is the prototype for an Enumify object.  
 * It contains just the methods we need.
 */
const ENUM = Object.create(null, {
	count: value(function (this: Property<any>) { return ownKeys(this).length }),
	keys: value(function (this: Property<any>) { return ownKeys(this) }),
	values: value(function (this: Property<any>) { return ownValues(this) }),
	entries: value(function (this: Property<any>) { return ownEntries(this) }),
	// invert: value(function (this: Property<any>) { return enumify(ownEntries(this).reduce((acc, [key, val]) => { acc[val] = key; return acc; }, {} as any)) }),
	keyOf: value(function (this: Property<any>, search: any) { return ownEntries(this).filter(([, val]) => val === search)[0]?.[0] }),
	toString: value(function (this: Property<any>) { return JSON.stringify(this) }),
	[Symbol.toStringTag]: value('Enumify'),
	[Symbol.iterator]: value(function (this: Property<any>) { return ownEntries(this)[Symbol.iterator](); }),
});

/** add a \{value} object to an Object's property */
function value(value: PropertyDescriptor["value"]) {
	return Object.assign({ enumerable: false, configurable: false, writable: false } as const, { value } as const);
}

/** extend the Enum object with 'helper' methods */
type Entries<T> = Entry<T extends {} ? T : never>
// type KeyOfTuple<T, V> = Prettify<T extends [unknown, V] ? T : never>
type KeyOfTuple<T, V> = { [K in keyof T]: [T[K], T] }
type Enumify<T extends Property<any>> = Readonly<Omit<T, keyof Methods<T>>>				// strip out the helper methods
type KeyOf<T extends Property<any>> = keyof Enumify<T>
type Wrap<T extends Property<any>> = Readonly<T & Methods<T>>
type Methods<T extends Property<any>> = {
	/** count of Enum keys */																	count(): Count<keyof T>;
	/** array of Enum keys */																	keys(): (keyof T)[];
	/** array of Enum values */																values(): T[keyof T][];
	/** tuple of Enum entries */															entries(): { [K in keyof T]: [K, T[K]] }[keyof T][];
	// /** reverse of Enum */																		invert(): Prettify<Wrap<ReverseMap<Enumify<T>>>>
	// /** reverse lookup of Enum key by value */								keyOf<V extends T[keyof T]>(value: V): Prettify<ReverseMap<T>>[V]
	/** stringify method */																		toString(): string;
	/** string tag */[Symbol.toStringTag](): 'Enumify';
	/** Iterator for Enum */[Symbol.iterator](): Iterator<Entries<T>, [keyof T, T[keyof T]]>;
}

export namespace Enum {
	export type type<T extends Property<any>> = Enumify<T>
	export type keys<T extends Property<any>> = KeyOf<T>
	export type values<T extends Property<any>> = T[KeyOf<T>]
}

/**
 * function to return an 'enum-like' object (that we can use until Javascript implements its own)  
 * with useful helper-methods on the prototype
 */
export function enumify<const T extends ReadonlyArray<string | number>>(list: T): Prettify<Wrap<Index<T>>>;
export function enumify<const T extends Record<keyof T, any>>(list: T): Prettify<Wrap<T>>;
export function enumify<const T extends Record<keyof T, any>>(list: T) {
	if (!isArray(list) && !isObject(list))
		throw new Error(`enumify requires an array or object as the argument`);

	const stash = isArray(list)																// refactor Array as an Object
		? (list as PropertyKey[]).reduce((acc, itm, idx) => Object.assign(acc, { [itm]: idx }), {})
		: { ...list }

	return Object.create(ENUM, Object.getOwnPropertyDescriptors(stash));
}
