import { trimAll, toProperCase } from '#core/shared/string.library.js';
import { asArray, byKey, byLkp, sortKey, type SortBy } from '#core/shared/array.library.js';
import type { Property } from '#core/shared/type.library.js';

// Prototype extensions
// Remember to define any imports as a Function Declaration (not a Function Expression)
// so that they are 'hoisted' prior to extending a prototype

/**
 * extend an Object's prototype to include new method, if no clash
 */
export const patch = <T extends Record<'prototype' | 'name', any>>(proto: T, property: string, method: Function) => {
	if (proto.prototype.hasOwnProperty(property)) {						// if already defined,
		if (trimAll(method.toString()) !== trimAll(proto.prototype?.[property]?.toString()))
			console.warn(`${proto.name}.${property} already defined`);	// show warning if different method definition
	} else {
		Object.defineProperty(proto.prototype, property, {
			configurable: false,
			enumerable: false,
			writable: false,
			value: method,
		})
	}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend String prototype
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
declare global {
	interface String {
		/** remove redundant spaces to a new string */					trimAll(pat?: RegExp): string;

		/** upper-case first letter of a word */								toProperCase(): string;
	}
}

patch(String, 'trimAll', function (this: string, pat?: RegExp) { return trimAll(this, pat); });
patch(String, 'toProperCase', function (this: string) { return toProperCase(this) });

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend Array prototype
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
type GroupFn<T extends Property<any>> = (value: T, index?: number) => PropertyKey	// function to return a key for grouping
type SortFn<T> = (left: T, right: T) => -1 | 0 | 1					// function to sort an array of objects

declare global {
	interface Array<T> {
		/** reduce Array to a keyed Object[] */									keyedBy(...keys: (keyof T)[]): Record<PropertyKey, T[]>;
		/** reduce Array to a keyed Object[], mapped */					keyedBy<S extends Property<T>>(grpfn: GroupFn<S>): Record<PropertyKey, T[]>;
		/** reduce Array to a keyed single-Object */						lookupBy(...keys: (keyof T)[]): Record<PropertyKey, T>;
		/** reduce Array to a keyed single-Object, mapped */		lookupBy<S extends Property<T>>(grpfn: GroupFn<S>): Record<PropertyKey, T>;

		/** return ordered Array */															orderBy(...keys: (PropertyKey | SortBy)[]): T[];
		/** return ordered Array, mapped */											orderBy<V extends keyof T>(mapfn: SortFn<V>): V[];
		/** return sorted Array */															sortBy(...keys: (PropertyKey | SortBy)[]): T[];
		/** return ordered Array, mapped */											sortBy<V extends keyof T>(mapfn: SortFn<V>): V[];

		/** return new Array with no repeated elements */				distinct(): T[];
		/** return mapped Array with no repeated elements */		distinct<S>(mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];

		/** clear down an Array */															clear(): T[];

		/** return cartesian-product of Array of Arrays */			cartesian(): T;
		/** return cartesian-product of Array of Arrays */			cartesian(...args: T[][]): T[];

		/** tap into an Array */																tap(tapfn: (value: T[]) => void, thisArg?: any): T[];
	}
}

function sorted(this: any[], ...keys: (PropertyKey | SortBy)[]) { return sortKey(this, ...keys); }
patch(Array, 'orderBy', sorted);														// order array by named keys
patch(Array, 'sortBy', sorted);															// sort array by named keys

function keyed(this: Property<any>[], ...keys: PropertyKey[]) { return byKey(this, ...keys); }
function lookup(this: Property<any>[], ...keys: PropertyKey[]) { return byLkp(this, ...keys); }
patch(Array, 'keyedBy', keyed);															// reduce array by named keys
patch(Array, 'lookupBy', lookup);														// reduce array by named keys, only one entry per key

patch(Array, 'tap', function (this: any[], fn: Function) {
	fn(this);																									// run an arbitrary function
	return this;																							// then return the original array
})

patch(Array, 'clear', function (this: any[]) {
	this.fill(null).length = 0;																// wipe the contents, then set the 'length' to zero
	return this;
})

patch(Array, 'distinct', function (this: any[], mapfn: (value: any, index: number, array: any[]) => []) {
	return mapfn
		? this.map(mapfn).distinct()														// run the mapping selector, then recurse
		: Array.from(new Set(this))															// eliminate duplicates
})

patch(Array, 'cartesian', function (this: any[], ...args: any[]) {
	const [a, b = [], ...c] = args.length === 0 ? this : args;
	const cartFn = (a: any[], b: any[]) => asArray<any>([]).concat(...a.map(d => b.map(e => asArray<any>([]).concat(d, e))));

	return b.length
		? this.cartesian(cartFn(a, b), ...c)										// run the cartFn function, then recurse
		: asArray(a || [])																			// return the collated result
})
