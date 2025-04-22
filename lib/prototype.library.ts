// @ts-nocheck
// no typescript checking to get around the 'this' binding warnings

import { stringify } from '#core/shared/serialize.library.js';
import { trimAll, toProperCase } from '#core/shared/string.library.js';
import { asArray, byKey, byLkp, sortKey, type SortBy } from '#core/shared/array.library.js';

// Prototype extensions
// Remember to define any imports as a Function Declaration (not a Function Expression)
// so that they are 'hoisted' prior to extending a prototype

/**
 * extend an Object's prototype to include new method, if no clash
 */
const patch = <T>(proto: T, property: string, method: Function) => {
	if (proto.prototype.hasOwnProperty(property)) {						// if already defined,
		if (trimAll(method.toString()) !== trimAll(proto.prototype[property].toString()))	// show warning if different method definition
			console.warn(`${proto.name}.${property} already defined`);
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

patch(String, 'trimAll', function (pat?: RegExp) { return trimAll(this, pat); });
patch(String, 'toProperCase', function () { return toProperCase(this) });

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend Object prototype
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
declare global {
	interface ObjectConstructor {
	}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend Array prototype
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
declare global {
	interface Array<T> {
		/** reduce Array to a keyed Object[] */									keyedBy<S extends string>(...keys: (keyof T)[]): Record<S, T[]>;
		/** reduce Array to a keyed Object[], mapped */					keyedBy<S extends string>(mapfn: (value: T, index: number) => Record<S, T[]>);
		/** reduce Array to a keyed single-Object */						lookupBy<S extends string>(...keys: (keyof T)[]): Record<S, T>;
		/** reduce Array to a keyed single-Object, mapped */		lookupBy<S extends string>(mapfn: (value: T, index: number) => Record<S, T>);

		/** return ordered Array-of-objects */									orderBy(...keys: (PropertyKey | SortBy)[]): T[];
		/** return ordered Array-of-objects, mapped */					orderBy<K extends keyof T>(mapfn: (value: T, index: number, array: T[]) => K, thisArg?: any): K[];
		/** return sorted Array-of-objects */										sortBy(...keys: (PropertyKey | SortBy)[]): T[];
		/** return ordered Array-of-objects, mapped */					sortBy<K extends keyof T>(mapfn: (value: T, index: number, array: T[]) => K, thisArg?: any): K[];

		/** return new Array with no repeated elements */				distinct(): T[];
		/** return mapped Array with no repeated elements */		distinct<S>(mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];

		/** Clear down an Array */															truncate(): T[];

		/** return cartesian-product of Array of Arrays */			cartesian(): T;
		/** return cartesian-product of Array of Arrays */			cartesian(...args: T[][]): T[];

		/** tap into an Array */																tap(tapfn: (value: T[]) => void, thisArg?: any): T[];
	}
}

function sorted(...keys: (PropertyKey | SortBy)[]) { return sortKey(this, ...keys); }
patch(Array, 'orderBy', sorted);														// order array by named keys
patch(Array, 'sortBy', sorted);															// sort array by named keys

function keyed(key: Function | (keyof T), ...keys: (keyof T)[]) { return byKey(this, key, ...keys); }
function lookup(key: Function | (keyof T), ...keys: (keyof T)[]) { return byLkp(this, key, ...keys); }
patch(Array, 'keyedBy', keyed);															// reduce array by named keys
patch(Array, 'lookupBy', lookup);														// reduce array by named keys, only one entry per key

patch(Array, 'tap', function (fn: Function) {
	fn(this);																									// run an arbitrary function
	return this;																							// then return the original array
})

patch(Array, 'truncate', function () {
	this.fill(null).length = 0;																// wipe the contents, then set the 'length' to zero
	return this;
})

patch(Array, 'distinct', function (mapfn: (value: any, index: number, array: any[]) => []) {
	return mapfn
		? this.map(mapfn).distinct()														// run the mapping selector, then recurse
		: Array.from(new Set(this))															// eliminate duplicates
})

patch(Array, 'cartesian', function (...args: any[]) {
	const [a, b = [], ...c] = args.length === 0 ? this : args;
	const cartFn = (a: any[], b: any[]) => (<any[]>[]).concat(...a.map(d => b.map(e => (<any[]>[]).concat(d, e))));

	return b.length
		? this.cartesian(cartFn(a, b), ...c)										// run the cartFn function, then recurse
		: asArray(a || [])																			// return the collated result
})
