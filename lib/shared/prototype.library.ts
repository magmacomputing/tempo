// @ts-nocheck

import { clean, toProperCase } from '@module/shared/string.library';
import { asArray, keyedBy, sortBy, type SortBy } from '@module/shared/array.library';

// Prototype extensions
// Remember to define any imports as a Function declaration (not a function expression)
// so that they are 'hoisted' prior to extending a prototype

/**
 * extend an Object's prototype to include new method, if possible
 */
const patch = (proto: StringConstructor | ArrayConstructor, property: string, method: Function) => {
	if (!proto.prototype.hasOwnProperty(property)) {
		Object.defineProperty(proto.prototype, property, {
			configurable: false,
			enumerable: false,
			writable: false,
			value: method,
		})
	} else {																									// if already defined with different body, show error
		if (clean(method.toString()) !== clean((proto.prototype as any)[property]?.toString()))
			console.error(`${proto.name}.${property} already defined`);
	}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend String prototype
declare global {
	interface String {
		/** remove redundant spaces to a new string */					trimAll(pat?: RegExp): string;

		/** upper-case first letter of a word */								toProperCase(): string;
	}
}

patch(String, 'trimAll', function (pat?: RegExp) { return clean(this.replace(pat, '')); });
patch(String, 'toProperCase', function () { return toProperCase(this) });

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend Array prototype
declare global {
	interface Array<T> {
		/** reduce Array to a keyed-Object */										keyedBy<K extends string>(key: string): Record<K, T[]>;
		keyedBy(...keys: string[]): Record<string, T[]>;
		keyedBy<K extends string>(flatten: true, key: string): Record<K, T>;
		keyedBy(flatten: true, ...keys: string[]): Record<string, T>;
		keyedBy<K extends string>(flatten: false, key: string): Record<K, T[]>;
		keyedBy(flatten: false, ...keys: string[]): Record<string, T[]>;

		/** return sorted Array-of-objects */										orderBy(keys: (string | SortBy)[]): T[];
		/** return sorted Array-of-objects */										orderBy(...keys: (string | SortBy)[]): T[];
		/** return sorted Array-of-objects */										sortBy(keys: (string | SortBy)[]): T[];
		/** return sorted Array-of-objects */										sortBy(...keys: (string | SortBy)[]): T[];

		/** return new Array with no repeated elements */				distinct(): T[];
		/** return mapped Array with no repeated elements */		distinct<S>(mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];

		/** clear down an Array */															truncate(): T[];

		/** return cartesian-product of Array of Arrays */			cartesian(): T;
		cartesian(...args: T[][]): T[];

		/** tap into an Array */																tap(tapfn: (value: T[]) => void, thisArg?: any): T[];
	}
}

function fn(...keys: any[]) { return this.sort(sortBy(...keys)); }
patch(Array, 'orderBy', fn);
patch(Array, 'sortBy', fn);
patch(Array, 'keyedBy', function (...keys: any[]) { return keyedBy(this, ...keys); });
patch(Array, 'tap', function (fn: Function) {
	fn(this);
	return this;
});
patch(Array, 'truncate', function () {
	this.fill(null).length = 0;
	return this;
})
patch(Array, 'distinct', function (selector: (value: any, index: number, array: any[]) => []) {
	return selector
		? this.map(selector).distinct()
		: asArray(new Set(this))
})
patch(Array, 'cartesian', function (...args: any[]) {
	const [a, b = [], ...c] = args.length === 0 ? this : args;
	const cartFn = (a: any[], b: any[]) => (<any[]>[]).concat(...a.map(d => b.map(e => (<any[]>[]).concat(d, e))));

	return b.length
		? this.cartesian(cartFn(a, b), ...c)
		: asArray(a || [])
})
