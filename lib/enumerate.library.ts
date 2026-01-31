import { asType, isReference, isUndefined, isArray } from '#core/shared/type.library.js';
import { stringify } from '#core/shared/serialize.library.js';
import { Serializable } from '#core/shared/decorator.library.js';
import { ownKeys, ownValues, ownEntries } from '#core/shared/reflection.library.js';
import type { Index, Prettify, Entry, Invert, Property, OwnOf, CountOf, KeyOf, ValueOf, EntryOf, LooseKey, Secure, Obj } from '#core/shared/type.library.js';

/** used to identify the Enumify type */										const tag = 'Enumify' as const;

/** This is the prototype signature for an Enum object. */	type Proto<T extends Property<any>> = {
	/** count of Enum keys */																	count(): CountOf<keyof T>;
	/** array of Enum keys */																	keys(): KeyOf<T>[];
	/** array of Enum values */																values(): ValueOf<T>[];
	/** tuple of Enum entries */															entries(): EntryOf<T>[];

	/** new Enum with inverted key-values except invert() */	invert(): Prettify<Invert<T> & Omit<Enum.proto<T>, "invert">>;
	/** serialized Enum */																		toString(): string;
	/** key exists in Enum */																	has<K extends LooseKey<keyof T>>(key: K): boolean;
	/** value exists in Enum */																includes<V extends LooseKey<T[keyof T]>>(value: V): boolean;
	/** reverse lookup of Enum key by value */								keyOf<V extends ValueOf<T>>(value: V): Invert<T>[V];

	/** loop over Enum entries */															forEach(fn: (entry: EntryOf<T>, index: number, enumify: Enum.wrap<T>) => void, thisArg?: any): void;
	/** subset of Enum entries */															filter(fn: (entry: EntryOf<T>, index: number, enumify: Enum.wrap<T>) => boolean, thisArg?: any): Enum.wrap<Property<any>>;
	/** map of Enum entries */																map<U>(fn: (entry: EntryOf<T>, index: number, enumify: Enum.wrap<T>) => [PropertyKey, U] | U, thisArg?: any): Enum.wrap<Property<any>>;

	/** iterator for Enum */[Symbol.iterator](): Iterator<Entry<T extends {} ? T : never>, EntryOf<T>>;
	/** string tag */[Symbol.toStringTag](): typeof tag;
}
/** Argument can be an array of PropertyKeys */							type ArrayArg = ReadonlyArray<PropertyKey>
/** Argument can be a JSON object */												type ObjectArg = Record<PropertyKey, any>

/**
 * This is the prototype implementation for an Enum object.  
 * It contains just the methods / symbols we need, without standard Object methods like `hasOwnProperty`, etc.
 */
const MEMO = new WeakMap<object, Property<any>>();
const ENUM = secure(Object.create(null, {
	count: memoize('count', function (this: Property<any>) { return ownKeys(this).length }),
	keys: memoize('keys', function (this: Property<any>) { return ownKeys(this) }),
	values: memoize('values', function (this: Property<any>) { return ownValues(this) }),
	entries: memoize('entries', function (this: Property<any>) { return ownEntries(this) }),

	invert: memoize('invert', function (this: Property<any>) { return enumify(this.entries().reduce((acc: ObjectArg, [key, val]: [PropertyKey, any]) => ({ ...acc, [val]: key }), {} as ObjectArg)) }),
	toString: memoize('toString', function (this: Property<any>) { return stringify({ ...this }) }),
	has: value(function (this: Property<any> & Proto<any>, key: PropertyKey) { return this.keys().includes(key as any) }),
	includes: value(function (this: Property<any> & Proto<any>, search: any) { return this.values().includes(search) }),
	keyOf: value(function (this: Property<any> & Proto<any>, search: any) { return this.invert()[search] }),

	forEach: value(function (this: Property<any> & Proto<any>, fn: (entry: [PropertyKey, any], index: number, enumify: any) => void, thisArg?: any) { this.entries().forEach((entry, index) => fn.call(thisArg, entry, index, this)) }),
	filter: value(function (this: Property<any> & Proto<any>, fn: (entry: [PropertyKey, any], index: number, enumify: any) => boolean, thisArg?: any) { return enumify(this.entries().reduce((acc: ObjectArg, entry, index) => (fn.call(thisArg, entry, index, this) ? Object.assign(acc, { [entry[0]]: entry[1] }) : acc), {} as ObjectArg)) }),
	map: value(function (this: Property<any> & Proto<any>, fn: (entry: [PropertyKey, any], index: number, enumify: any) => any, thisArg?: any) { return enumify(this.entries().reduce((acc: ObjectArg, entry, index) => { const res = fn.call(thisArg, entry, index, this); return Object.assign(acc, isArray(res) && res.length === 2 ? { [res[0] as any]: res[1] } : { [entry[0]]: res }) }, {} as ObjectArg)) }),

	[Symbol.iterator]: value(function (this: Property<any> & Proto<any>) { return this.entries()[Symbol.iterator](); }),
	[Symbol.toStringTag]: value(tag),
}) as Enum.proto<any>)

/** define a Descriptor for an Enum's method */
function value<T>(value: T): PropertyDescriptor {
	return Object.assign({ enumerable: false, configurable: false, writable: false, value } as const);
}

/** define a Descriptor for an Enum's memoized-method */
function memoize<T>(name: PropertyKey, fn: (this: Property<any>) => T) {
	return value(function (this: Property<any>) {
		let cache = MEMO.get(this);

		if (!cache) {
			cache = Object.create(null) as Property<any>;
			MEMO.set(this, cache);
		}

		if (isUndefined(cache[name])) {													// first time for this method
			cache[name] = fn.call(this);													// evaluate the prototype method
			secure(cache[name]);																	// freeze the returned value
		}

		return cache[name] as T;
	})
}

/** namespace for Enum type-helpers */	export namespace Enum {
	/** Enum property keys */																	export type keys<T extends Property<any>> = KeyOf<T>;
	/** Enum property values */																export type values<T extends Property<any>> = ValueOf<T>;
	/** Enum own properties */																export type props<T extends Property<any>> = Readonly<OwnOf<T>>;
	/** Enum prototype methods */															export type proto<T extends Property<any>> = Proto<T>;
	/** Enum properties & methods */													export type wrap<T extends Property<any>> = Prettify<Enum.props<T> & Enum.proto<T>>;
}

/**
 * The intent of this function is to provide Javascript-supported syntax for an object to behave as a read-only Enum.  
 * It can be used instead of Typescript's Enum (which must be compiled down to plain Javascript, and is not supported in NodeJS)  
 *   
 * usage example:  
 ```javascript
			const SEASON = enumify({ Spring: 'spring', Summer: 'summer', Autumn: 'autumn', Winter: 'winter' });
			type SEASON = ValueOf<typeof SEASON>
	
			SEASON.keys()      // (Spring | Summer | Autumn | Winter)[]  
			SEASON.values()    // (spring | summer | autumn | winter)[]  
			SEASON.entries()   // [['Spring','spring'], ['Summer','summer'], ['Autumn','autumn'], ['Winter','winter']];  
			SEASON.count()     // 4  
			SEASON.keyOf(SEASON.Summer)// 'Summer' (using the Enum value directly)  
			SEASON.keyOf('summer')// 'Summer' (using a string value)  
			SEASON.toString()  // '{"Spring": "spring", "Summer": "summer", "Autumn": "autumn", "Winter": "winter"}'  
			SEASON.invert()    // enumify({spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter'})  
			SEASON.has('xxx')  // false (using an invalid key)
			SEASON.includes('summer') // true (using a string value)
			
			typeof SEASON      // 'Enumify'  
			function getSeason(season: SEASON) { ... } // function accepts both string and Enum values
			for (const [key, value] of SEASON) { ... } // iterate over Enum entries
 ```
 */
export function enumify<const T extends ArrayArg>(list: T): Enum.wrap<Index<T>>;
export function enumify<const T extends ObjectArg>(list: T): Enum.wrap<T>;
export function enumify<T extends PropertyKey>(list: T) {
	const arg = asType(list);
	const stash = {};

	switch (arg.type) {
		case 'Object':
			Object.assign(stash, arg.value);
			break;

		case 'Array':
			arg.value																							// convert Array to an Object with indexes as values
				.reduce((_, itm, idx) => Object.assign(stash, { [itm]: idx }), stash)
			break;

		default:
			throw new Error(`enumify requires an Object or Array as input: received ${arg.type} instead`);
	}

	return secure(Object.create(ENUM, Object.getOwnPropertyDescriptors(stash)));
}

/** create an entry in the Serialization Registry to describe how to rebuild an Enum */
@Serializable
class Enumify {
	constructor(list: Property<any>) {
		return enumify(list);
	}
}

// Useful for those times when a full Enumify object is not needed, but still lock the Object from mutations
/** deep-freeze an Array | Object to make it immutable */
export function secure<const T extends Obj>(obj: T) {
	if (isReference(obj))																			// skip primitive values
		ownValues(obj)																					// retrieve the properties on obj
			.forEach(val => Object.isFrozen(val) || secure(val));	// secure each value, if not already Frozen

	return Object.freeze(obj) as Secure<T>;										// freeze the object itself
}