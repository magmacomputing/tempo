import { secure } from '#core/shared/utility.library.js';
import { Serializable } from '#core/shared/class.library.js';
import { stringify } from '#core/shared/serialize.library.js';
import { memoizeMethod } from '#core/shared/function.library.js';
import { ownEntries } from '#core/shared/reflection.library.js';
import { getProxy } from './proxy.library.js';
import { asType, isArray, isNumber } from '#core/shared/type.library.js';
import type { Index, Prettify, Invert, Property, KeyOf, ValueOf, EntryOf, LooseKey, WellKnownSymbols } from '#core/shared/type.library.js';

/** used to identify the Enumify type */										const tag = 'Enumify' as const;

declare module './type.library.js' {
	interface TypeValueMap<T> {
		Enumify: { type: 'Enumify', value: Enum.wrap<Extract<T, Property<any>>> };
	}
	interface IgnoreOfMap extends Methods<any> { }
}

/** prototype entries with string | symbol keys */
type Proto<T extends Property<any>> = Prettify<{
	/** number of entries in the Enum */											count(): number;
	/** array of all enumerable property names */							keys(): KeyOf<T>[];
	/** array of all enumerable object values */							values(): ValueOf<T>[];
	/** tuple of enumerable entries */												entries(): EntryOf<T>[];
	/** return an object with the keys and values swapped */	invert(): Invert<T>;
	/** check if a 'key' exists in the Enum */								has(key: LooseKey<KeyOf<T>>): boolean;
	/** check if a 'value' exists in the Enum */							includes(search: LooseKey<ValueOf<T>>): boolean;
	/** return the key for a given value */										keyOf(search: LooseKey<ValueOf<T>>): KeyOf<T>;
	/** iterate through all Enum entries */										forEach(fn: (entry: EntryOf<T>, index: number, enumify: wrap<any>) => void, thisArg?: any): void;
	/** filter Enum entries and return a new Enum */					filter(fn: (entry: EntryOf<T>, index: number, enumify: wrap<any>) => boolean, thisArg?: any): wrap<Partial<T>>;
	/** map Enum entries and return a new Enum */							map(fn: (entry: EntryOf<T>, index: number, enumify: wrap<any>) => any, thisArg?: any): wrap<Property<any>>;
	/** extend an existing Enum with new property-entries */	extend<const E extends ArrayArg>(list: E): wrap<Prettify<Omit<T, keyof Index<E>> & Index<E>>>;
	/** extend an existing Enum with new property-entries */	extend<const E extends ObjectArg>(list: E): wrap<Prettify<Omit<T, keyof E> & E>>;
	/** iterate through all Enum entries */										readonly [Symbol.iterator]: () => IterableIterator<EntryOf<T>>;
	/** used to identify the Enumify type */									readonly [Symbol.toStringTag]: typeof tag;
}>

/** Enum properties & methods */														type wrap<T extends Property<any>> = Enum.props<T> & Methods<T>;
/** Enum methods (filtered) */															type Methods<T extends Property<any> = any> = Omit<Proto<T>, WellKnownSymbols>;
/** Enum object type for `this` context */									type Context = Proto<Property<any>> & Property<any>;

/** allowable arguments for Enumify */											type ArrayArg = string[] | readonly string[];
/** allowable arguments for Enumify */											type ObjectArg = Property<any>;

/** helper method to create a property descriptor */
function value<T>(val: T): PropertyDescriptor {
	return {
		enumerable: false,
		configurable: false,
		writable: false,
		value: val
	};
}

/** namespace for Enum type-helpers */
export namespace Enum {
	/** Enum properties & methods */													export type wrap<T extends Property<any>> = props<T> & Methods<T>;
	/** Enum methods (filtered) */														export type methods<T extends Property<any> = any> = keyof Methods<T>;
	/** Enum own properties */																export type props<T extends Property<any>> = Readonly<T>;
}

/**
 * private instance of the Enum Prototype, which is then Used to create each new Object-Enum  
*/
const ENUM = secure(Object.create(null, {
	count: memoizeMethod('count', function (this: Context) { return this.entries().length }),
	keys: memoizeMethod('keys', function (this: Context) { return this.entries().map(([key]: any) => key as any) }),
	values: memoizeMethod('values', function (this: Context) { return this.entries().map(([_, val]: any) => val) }),
	entries: memoizeMethod('entries', function (this: Context) { return ownEntries(this, true) as any }),
	invert: memoizeMethod('invert', function (this: Context) { return enumify(this.entries().reduce((acc: ObjectArg, [key, val]: [PropertyKey, any]) => ({ ...acc, [val]: key }), {} as ObjectArg)) }),
	toString: memoizeMethod('toString', function (this: Context) { return stringify(this.toJSON()) }),

	has: value(function (this: Context, key: PropertyKey) { return this.keys().includes(key as any) }),
	includes: value(function (this: Context, search: any) { return this.values().includes(search) }),
	keyOf: value(function (this: Context, search: any) { return this.invert()[search] }),
	extend: value(function (this: Context, list: any): any { return (enumify as any).call(this, list) }),

	forEach: value(function (this: Context, fn: (entry: [any, any], index: number, enumify: any) => void, thisArg?: any) { this.entries().forEach((entry: any, index: number) => fn.call(thisArg, entry, index, this)) }),
	filter: value(function (this: Context, fn: (entry: [any, any], index: number, enumify: any) => boolean, thisArg?: any): any { return enumify(this.entries().reduce((acc: ObjectArg, entry: any, index: number) => (fn.call(thisArg, entry, index, this) ? Object.assign(acc, { [entry[0]]: entry[1] }) : acc), {} as ObjectArg)) }),
	map: value(function (this: Context, fn: (entry: [any, any], index: number, enumify: any) => any, thisArg?: any): any { return enumify(this.entries().reduce((acc: ObjectArg, entry: any, index: number) => { const res = fn.call(thisArg, entry, index, this); return Object.assign(acc, isArray(res) && res.length === 2 ? { [res[0] as any]: res[1] } : { [entry[0]]: res }) }, {} as ObjectArg)) }),

	[Symbol.iterator]: value(function (this: Context) { return this.entries()[Symbol.iterator](); }),
	[Symbol.toStringTag]: value(tag),
})) as Proto<any>;

/**
 * Create a premium, immutable 'Enum' object with a fluent API.  
 * It supports both numerical and string-based indexing, as well as a full suite of helper methods like `keys()`, `values()`, and `forEach()`.  
 * Enums created with `enumify` are designed to be extremely high-performance and lightweight.  
 * 
 * @param list - The array of strings, or object of key-value pairs to transform into an Enum.   
 * @returns A frozen Enum object with both properties and helpful iteration methods.  
 * 
 * @example
 * ```typescript
 * const Status = enumify(['Active', 'Inactive', 'Pending']);
 * console.log(Status.Active); // 0
 * console.log(Status.keys()); // ['Active', 'Inactive', 'Pending']
 * ```
 */
export function enumify<const T extends ArrayArg>(list: T): Enum.wrap<Index<T>>;
export function enumify<const T extends ObjectArg>(list: T): Enum.wrap<T>;
export function enumify<T>(this: any, list: T): any {
	const proto = this ?? ENUM;
	const arg = asType(list);
	let stash = {};

	switch (arg.type) {
		case 'Enumify':
		case 'Object':
			Object.assign(stash, arg.value);
			break;

		case 'Array':
			(arg.value as string[]).forEach((key, index) => {
				if (isNumber(key))
					throw new Error('Enumify: numeric keys are not supported');
				Object.assign(stash, { [key]: index });
			});
			break;

		default:
			throw new Error(`Enumify: invalid argument type: ${arg.type}`);
	}

	const target = Object.create(proto, Object.getOwnPropertyDescriptors(stash));
	return getProxy(target);
}

/** create an entry in the Serialization Registry to describe how to rebuild an Enum */
@Serializable
export class Enumify {
	constructor(list: Property<any>) {
		return enumify(list);
	}
}
