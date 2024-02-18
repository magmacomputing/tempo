// @ts-nocheck
// no typescript checking to get around the 'this' binding warnings

import { trimAll, toProperCase } from '@module/shared/string.library.js';
import { asArray, keyedBy, sortBy, type SortBy } from '@module/shared/array.library.js';

// Prototype extensions
// Remember to define any imports as a Function declaration (not a Function expression)
// so that they are 'hoisted' prior to extending a prototype

/**
 * extend an Object's prototype to include new method, if no clash
 */
const patch = <T>(proto: T, property: string, method: Function) => {
	if (proto.prototype.hasOwnProperty(property)) {						// if already defined,
		if (trimAll(method) !== trimAll(proto.prototype[property]))	// show error if different method definition
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
// declare global {
// 	interface ObjectConstructor {
// 		entries<T extends {}>(object: T): ReadonlyArray<Entry<T>>
// 	}
// }

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend Array prototype
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
declare global {
	interface Array<T> {
		/** reduce Array to a keyed-Object */										keyedBy<K extends string>(...keys: string[]): Record<K, T[]>;
		/** reduce Array to a keyed-Object */										keyedBy<K extends string>(flatten: true, ...keys: string[]): Record<K, T>;
		/** reduce Array to a keyed-Object */										keyedBy<K extends string>(flatten: false, ...keys: string[]): Record<K, T[]>;

		/** return sorted Array-of-objects */										orderBy(keys: (string | SortBy)[]): T[];
		/** return sorted Array-of-objects */										orderBy(...keys: (string | SortBy)[]): T[];
		/** return sorted Array-of-objects */										sortBy(keys: (string | SortBy)[]): T[];
		/** return sorted Array-of-objects */										sortBy(...keys: (string | SortBy)[]): T[];

		/** return new Array with no repeated elements */				distinct(): T[];
		/** return mapped Array with no repeated elements */		distinct<S>(mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];

		/** clear down an Array */															truncate(): T[];

		/** return cartesian-product of Array of Arrays */			cartesian(): T;
		/** return cartesian-product of Array of Arrays */			cartesian(...args: T[][]): T[];

		/** tap into an Array */																tap(tapfn: (value: T[]) => void, thisArg?: any): T[];
	}
}

function fn(...keys: (string | SortBy)[]) { return this.sort(sortBy(...keys)); }
patch(Array, 'orderBy', fn);																// order array by named keys
patch(Array, 'sortBy', fn);																	// sort array by named keys

patch(Array, 'keyedBy', function (...keys: string[]) {
	return keyedBy(this, ...keys);														// group an array in an object with named keys
});

patch(Array, 'tap', function (fn: Function) {
	fn(this);																									// run an arbitrary function
	return this;																							// then return the original array
})

patch(Array, 'truncate', function () {
	this.fill(null).length = 0;																// wipe the contents, then set the 'length' to zero
	return this;
})

patch(Array, 'distinct', function (selector: (value: any, index: number, array: any[]) => []) {
	return selector
		? this.map(selector).distinct()													// run the mapping selector, then recurse
		: asArray(new Set(this))																// eliminate duplicates
})

patch(Array, 'cartesian', function (...args: any[]) {
	const [a, b = [], ...c] = args.length === 0 ? this : args;
	const cartFn = (a: any[], b: any[]) => (<any[]>[]).concat(...a.map(d => b.map(e => (<any[]>[]).concat(d, e))));

	return b.length
		? this.cartesian(cartFn(a, b), ...c)										// run the cartFn function, then recurse
		: asArray(a || [])																			// return the collated result
})
