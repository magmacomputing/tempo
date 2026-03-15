import { secure } from '#core/shared/utility.library.js';
import { Serializable } from '#core/shared/class.library.js';
import { stringify } from '#core/shared/serialize.library.js';
import { memoizeMethod } from '#core/shared/function.library.js';
import { ownEntries } from '#core/shared/reflection.library.js';
import { asType, isArray, isNumber } from '#core/shared/type.library.js';
import type { Index, Prettify, Entry, Invert, Property, CountOf, KeyOf, ValueOf, EntryOf, LooseKey, WellKnownSymbols } from '#core/shared/type.library.js';

/** used to identify the Enumify type */										const tag = 'Enumify' as const;

/** This is the prototype signature for an Enum object. */	type Proto<T extends Property<any>> = Readonly<{
	/** count of Enum keys */																	count(): CountOf<KeyOf<T>>;
	/** array of Enum keys */																	keys(): KeyOf<T>[];
	/** array of Enum values */																values(): ValueOf<T>[];
	/** tuple of Enum entries */															entries(): EntryOf<T>[];
	/** new Enum with inverted key-values except invert() */	invert(): Prettify<Invert<T> & Omit<Proto<T>, "invert">>;
	/** serialized Enum */																		toString(): string;
	/** JSON representation of Enum */												toJSON(): Property<any>;

	/** key exists in Enum */																	has<K extends LooseKey<keyof T>>(key: K): boolean;
	/** value exists in Enum */																includes<V extends LooseKey<T[keyof T]>>(value: V): boolean;
	/** reverse lookup of Enum key by value */								keyOf<V extends ValueOf<T>>(value: V): Invert<T>[V];
	/** extend the Enum with new values */										extend(value: Property<any> | ReadonlyArray<PropertyKey>): Enum.wrap<T>;

	/** loop over Enum entries */															forEach(fn: (entry: EntryOf<T>, index: number, enumify: Enum.wrap<T>) => void, thisArg?: any): void;
	/** subset of Enum entries */															filter(fn: (entry: EntryOf<T>, index: number, enumify: Enum.wrap<T>) => boolean, thisArg?: any): Enum.wrap<T>;
	/** map of Enum entries */																map<U>(fn: (entry: EntryOf<T>, index: number, enumify: Enum.wrap<T>) => [PropertyKey, U] | U, thisArg?: any): any;

	/** iterator for Enum */[Symbol.iterator](): Iterator<Entry<T extends {} ? T : never>, EntryOf<T>>;
	/** string tag */[Symbol.toStringTag]: typeof tag;
}>

/** define a Descriptor for an Enum's method */
function value<T>(value: T): PropertyDescriptor {
	return Object.assign({ enumerable: false, configurable: false, writable: false, value } as const);
}

/**
 * This is the prototype implementation for an Enum object.  
 * It contains just the methods / symbols we need, without standard Object methods like `hasOwnProperty`, etc.
 */
const ENUM = secure(Object.create(null, {
	count: memoizeMethod('count', function (this: any) { return this.entries().length }),
	keys: memoizeMethod('keys', function (this: any) { return (this as any).entries().map(([key]: [any, any]) => key) }),
	values: memoizeMethod('values', function (this: any) { return (this as any).entries().map(([_, val]: [any, any]) => val) }),
	entries: memoizeMethod('entries', function (this: any) { return ownEntries(this as any, true) }),
	invert: memoizeMethod('invert', function (this: Property<any>) { return enumify(this.entries().reduce((acc: ObjectArg, [key, val]: [PropertyKey, any]) => ({ ...acc, [val]: key }), {} as ObjectArg)) }),
	toString: memoizeMethod('toString', function (this: any) { return stringify(this.toJSON()) }),
	toJSON: memoizeMethod('toJSON', function (this: any) { return Object.fromEntries(this.entries()) }),

	has: value(function (this: Property<any> & Proto<any>, key: PropertyKey) { return this.keys().includes(key) }),
	includes: value(function (this: Property<any> & Proto<any>, search: any) { return this.values().includes(search) }),
	keyOf: value(function (this: Property<any> & Proto<any>, search: any) { return this.invert()[search] }),
	extend: value(function (this: any, value: ObjectArg | ArrayArg) { return enumify.call(this, value) }),

	forEach: value(function (this: Enum.wrap<any>, fn: (entry: [PropertyKey, any], index: number, enumify: Enum.wrap<any>) => void, thisArg?: any) { this.entries().forEach((entry, index) => fn.call(thisArg, entry, index, this)) }),
	filter: value(function (this: Enum.wrap<any>, fn: (entry: [PropertyKey, any], index: number, enumify: Enum.wrap<any>) => boolean, thisArg?: any) { return enumify(this.entries().reduce((acc: ObjectArg, entry, index) => (fn.call(thisArg, entry, index, this) ? Object.assign(acc, { [entry[0]]: entry[1] }) : acc), {} as ObjectArg)) }),
	map: value(function (this: Enum.wrap<any>, fn: (entry: [PropertyKey, any], index: number, enumify: Enum.wrap<any>) => any, thisArg?: any) { return enumify(this.entries().reduce((acc: ObjectArg, entry, index) => { const res = fn.call(thisArg, entry, index, this); return Object.assign(acc, isArray(res) && res.length === 2 ? { [res[0] as any]: res[1] } : { [entry[0]]: res }) }, {} as ObjectArg)) }),

	[Symbol.for('nodejs.util.inspect.custom')]: value(function (this: any) { return this.toJSON() }),
	[Symbol.iterator]: value(function (this: Property<any> & Proto<any>) { return this.entries()[Symbol.iterator](); }),
	[Symbol.toStringTag]: value(tag),
}) as Proto<any>);

/** namespace for Enum type-helpers */
type Methods<T extends Property<any> = any> = Omit<Proto<T>, WellKnownSymbols>
export namespace Enum {
	/** Enum properties & methods */													export type wrap<T extends Property<any>> = props<T> & Methods<T>;
	/** Enum methods (filtered) */														export type methods<T extends Property<any> = any> = keyof Methods<T>;
	/** Enum own properties */																export type props<T extends Property<any>> = Readonly<T>;
}

/** Argument can be an array of PropertyKeys */							type ArrayArg = ReadonlyArray<PropertyKey>
/** Argument can be a JSON object */												type ObjectArg = Record<PropertyKey, any>

/**
 * # Enumify
 * The intent of this function is to provide Javascript-supported syntax for an object to behave as a read-only Enum.  
 * It can be used instead of Typescript's Enum (which must be compiled down to plain Javascript, and is not supported in NodeJS)  
 *   
 * @example
 * ```typescript
 * const SEASON = enumify({ Spring: 'spring', Summer: 'summer', Autumn: 'autumn', Winter: 'winter' });
 * type SEASON = ValueOf<typeof SEASON>
 * ```
 * 
 * | Method | Value |
 * | :--- | :---- |
 * | `SEASON.keys()` | ['Spring', 'Summer', 'Autumn', 'Winter'] |
 * | `SEASON.values()` | ['spring', 'summer', 'autumn', 'winter'] |
 * | `SEASON.entries()` | ['Spring','spring'], ['Summer','summer'], ['Autumn','autumn'], ['Winter','winter']] |
 * | `SEASON.count()` | 4 |
 * | `SEASON.keyOf(SEASON.Summer)` | 'Summer' (using the Enum value directly) |
 * | `SEASON.keyOf('summer')` | 'Summer' (using a string value) |
 * | `SEASON.toString()` | '{"Spring": "spring", "Summer": "summer", "Autumn": "autumn", "Winter": "winter"}' |
 * | `SEASON.invert() ` | enumify({spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter'}) |
 * | `SEASON.has('xxx')` | false (using an invalid key) |
 * | `SEASON.includes('summer')` | true (using a string value) |
 * | `Object.prototype.toString.call(SEASON).slice(8,-1)` | 'Enumify' |
 *
 * @template T - The structure of the enumeration (Array or Object)  
 * if Array, Values will be the array indices.  if Object, keys and values are preserved.
 * @param {T} list - The list of keys (Array) or key-value pairs (Object) to enumify
 * @returns {Enum.wrap<T>} A frozen object enhanced with enumeration methods
 */
export function enumify<const T extends ArrayArg>(list: T): Enum.wrap<Index<T>>;
export function enumify<const T extends ObjectArg>(list: T): Enum.wrap<T>;
export function enumify<T>(this: any, list: T) {
	const proto = this ?? ENUM;
	const arg = asType(list);
	const stash = {};

	switch (arg.type) {
		case 'Enumify':																					// handle already-hydrated Enum (e.g. from deserialisation roundtrip)
		case 'Object':
			Object.assign(stash, arg.value);
			break;

		case 'Array': {
			const base = Math.max(-1, ...(proto as Proto<any>).values().filter(isNumber)) + 1;
			(arg.value as ArrayArg)																// reduce Array to an Object with indexes as values
				.reduce((_, itm, idx) => Object.assign(stash, { [itm]: base + idx }), stash)
			break;
		}

		default:
			throw new Error(`enumify requires an Object or Array as input: received ${arg.type} instead`);
	}

	return secure(Object.create(proto, Object.getOwnPropertyDescriptors(stash)));
}

declare module './type.library.js' {
	interface TypeValueMap<T> {
		Enumify: { type: 'Enumify', value: Enum.wrap<Extract<T, Property<any>>> };
	}

	interface IgnoreOfMap extends Methods<any> { }
}

/** create an entry in the Serialization Registry to describe how to rebuild an Enum */
@Serializable
export class Enumify {
	constructor(list: Property<any>) {
		return enumify(list);
	}
}
