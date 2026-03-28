import { secure } from '#library/utility.library.js';
import { asType, isNumber } from '#library/type.library.js';
import { $Extensible } from '#library/symbol.library.js';
import { ownEntries } from '#library/reflection.library.js';
import { getProxy } from '#library/proxy.library.js';
import { memoizeMethod } from '#library/function.library.js';
import type { Property, Index, KeyOf, ValueOf, EntryOf, Invert, LooseKey } from '#library/type.library.js';
import { Serializable } from '#library/class.library.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T = any> {
		Enumify: { type: 'Enumify', value: Enum.wrap<T> };
	}

	interface IgnoreOfMap extends EnumMethods { }
}

/** Enum methods */
export type EnumMethods<T extends Property<any> = any> = {
	/** number of entries in the Enum */											count(): number;
	/** array of all enumerable property names */							keys(): KeyOf<T>[];
	/** array of all enumerable object values */							values(): ValueOf<T>[];
	/** tuple of enumerable entries */												entries(): EntryOf<T>[];
	/** return an object with the keys and values swapped */	invert(): Invert<T>;
	/** check if a 'key' exists in the Enum */								has(key: LooseKey<KeyOf<T>>): boolean;
	/** check if a 'value' exists in the Enum */							includes(search: LooseKey<ValueOf<T>>): boolean;
	/** return the key for a given value */										keyOf(search: LooseKey<ValueOf<T>>): KeyOf<T>;
	/** iterate through all Enum entries */										forEach(fn: (entry: EntryOf<T>, index: number, enumify: EnumifyType<any>) => void, thisArg?: any): void;
	/** filter Enum entries and return a new Enum */					filter(fn: (entry: EntryOf<T>, index: number, enumify: EnumifyType<any>) => boolean, thisArg?: any): EnumifyType<Partial<T>>;
	/** map Enum entries and return a new Enum */							map(fn: (entry: EntryOf<T>, index: number, enumify: EnumifyType<any>) => any, thisArg?: any): EnumifyType<Property<any>>;
	/** extend an Enum with new entries */										extend<const E extends any[] | Property<any>>(list: E, frozen?: boolean): EnumifyType<any>;
	/** iterate through all Enum entries */										readonly [Symbol.iterator]: () => IterableIterator<EntryOf<T>>;
	/** used to identify the Enumify type */									readonly [Symbol.toStringTag]: 'Enumify';
}

/** Enum properties & methods */
export type EnumifyType<T extends Property<any> = any> = Readonly<T> & EnumMethods<T>;

/** namespace for Enum type-helpers */
export declare namespace Enum {
	/** Enum properties & methods */ type wrap<T = any> = T extends Property<any> ? EnumifyType<T> : any;
	/** Enum methods (filtered) */ type methods<T = any> = keyof EnumifyType<any>;
	/** Enum own properties */ type props<T = any> = Readonly<T>;
}

/** key to use for identifying Enumify objects */
const tag = 'Enumify';

const ENUM = secure(Object.create(null, {
	keys: memoizeMethod('keys', function (this: any) { return ownEntries(this, true).map(([key]: any) => key) }),
	values: memoizeMethod('values', function (this: any) { return ownEntries(this, true).map(([_, val]: any) => val) }),
	entries: memoizeMethod('entries', function (this: any) { return ownEntries(this, true) }),
	invert: memoizeMethod('invert', function (this: any) { return Object.fromEntries(this.entries().map(([key, val]: any) => [val, key])) }),

	has: value(function (this: any, key: PropertyKey) { return this.keys().includes(key as any) }),
	count: value(function (this: any) { return this.keys().length }),
	includes: value(function (this: any, search: any) { return this.values().includes(search) }),
	keyOf: value(function (this: any, search: any) { return this.invert()[search] }),
	extend: value(function (this: any, list: any, frozen?: boolean): any { return (enumify as any).call(this, list, frozen) }),

	forEach: value(function (this: any, fn: (entry: [any, any], index: number, enumify: any) => void, thisArg?: any) { this.entries().forEach((entry: any, index: number) => fn.call(thisArg, entry, index, this)) }),
	filter: value(function (this: any, fn: (entry: [any, any], index: number, enumify: any) => boolean, thisArg?: any): any { return enumify(this.entries().reduce((acc: Property<any>, entry: any, index: number) => (fn.call(thisArg, entry, index, this) ? Object.assign(acc, { [entry[0]]: entry[1] }) : acc), {} as Property<any>)) }),
	map: value(function (this: any, fn: (entry: [any, any], index: number, enumify: any) => any, thisArg?: any): any { return enumify(this.entries().reduce((acc: Property<any>, entry: any, index: number) => Object.assign(acc, { [entry[0]]: fn.call(thisArg, entry, index, this) }), {} as Property<any>)) }),

	[Symbol.iterator]: value(function* (this: any) { for (const entry of this.entries()) yield entry as any }),
	[Symbol.toStringTag]: { enumerable: false, configurable: false, writable: false, value: tag }
}));

function value(val: any) {
	return { enumerable: false, configurable: false, writable: false, value: val }
}

/**
 * # Enumify
 * create a Proxy-based Registry (Enum) from an Object or Array.  
 * Enums are immutable (frozen) and provide methods for iteration, search, and extension.  
 * 
 * @example
 * ```typescript
 * const Status = enumify(['Active', 'Inactive', 'Pending']);
 * console.log(Status.Active); // 0
 * console.log(Status.has('Active')); // true
 * console.log(Status.keys()); // ['Active', 'Inactive', 'Pending']
 * ```
 */
export function enumify<const T extends readonly any[]>(list: T, frozen?: boolean): Enum.wrap<Index<T>>;
export function enumify<const T extends Property<any>>(list: T, frozen?: boolean): Enum.wrap<T>;
export function enumify<T>(this: any, list: T, frozen = true): any {
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
	if (!frozen) Object.defineProperty(target, $Extensible, { value: true, enumerable: false });
	return getProxy(target, true, frozen);	// proxy is ALWAYS frozen (read-only), but target is only 'locked' if requested
}

/** create an entry in the Serialization Registry to describe how to rebuild an Enum */
@Serializable
export class Enumify {
	constructor(list: Property<any>) {
		return enumify(list);
	}
}
