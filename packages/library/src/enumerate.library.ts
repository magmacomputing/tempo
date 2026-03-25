import { secure } from '#library/utility.library.js';
import { asType, isNumber } from '#library/type.library.js';
import { $Target, $Extensible } from '#library/symbol.library.js';
import { ownEntries } from '#library/reflection.library.js';
import { getProxy } from '#library/proxy.library.js';
import { memoizeMethod } from '#library/function.library.js';
import type { Property, Index, EntryOf } from '#library/type.library.js';

/** key to use for identifying Enumify objects */
const tag = 'Enumify';

const ENUM = secure(Object.create(null, {
	keys: memoizeMethod('keys', function (this: any) { return ownEntries(this, true).map(([key]: any) => key) }),
	values: memoizeMethod('values', function (this: any) { return ownEntries(this, true).map(([_, val]: any) => val) }),
	entries: memoizeMethod('entries', function (this: any) { return ownEntries(this, true) }),
	invert: memoizeMethod('invert', function (this: any) { return Object.fromEntries(this.entries().map(([key, val]: any) => [val, key])) }),

	has: value(function (this: any, key: PropertyKey) { return this.keys().includes(key as any) }),
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
	if (!frozen) target[$Extensible] = true;
	return getProxy(target, frozen);
}

/** create an entry in the Serialization Registry to describe how to rebuild an Enum */
export function registryEnum(name: string, list: any) {
	// Serialization is handled by the overall Library Registry in serialize.library.ts
}

export namespace Enum {
	export type wrap<T> = Readonly<T> & typeof ENUM;
}
