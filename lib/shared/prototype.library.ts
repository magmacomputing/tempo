import { toProperCase } from '@module/shared/string.library';
import { asArray, keyedBy, sortBy, type SortBy } from '@module/shared/array.library';

// Prototype extensions

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend String prototype
declare global {
	interface String {
		/** remove redundant spaces to a new string */
		trimAll(pat?: RegExp): string;

		/** upper-case first letter of a word */
		toProperCase(): string;

		// replaceAll(searchValue: string | RegExp, replaceValue: string): string;
	}
}

if (!String.prototype.hasOwnProperty('trimAll')) {
	Object.defineProperty(String.prototype, 'trimAll', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (pat: RegExp) {
			return this
				.replace(pat, '')
				.replace(/\s{2,}/g, ' ')
				.replace(/\t/g, ' ')
				.replace(/(\r\n|\n|\r)/g, '')
				.trim()
		},
	})
}
else console.error('Cannot extend String.trimAll');

// if (!String.prototype.hasOwnProperty('replaceAll')) {
// 	Object.defineProperty(String.prototype, 'replaceAll', {
// 		enumerable: false,
// 		configurable: false,
// 		writable: false,
// 		value: function (str: string, newStr: string) {

// 			return Object.prototype.toString.call(str).toLowerCase() === '[object regexp]'
// 				? this.replace(str, newStr)													// if a regex pattern
// 				: this.replace(new RegExp(str, 'g'), newStr);				// if a string
// 		}
// 	})
// }
// else console.error('Cannot extend String.replaceAll')

if (!String.prototype.hasOwnProperty('toProperCase')) {
	Object.defineProperty(String.prototype, 'toProperCase', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function () {
			return toProperCase(this);
		}
	})
}
else console.error('Cannot extend String.toProperCase');

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// extend Array prototype
declare global {
	interface Array<T> {
		/** return reduced Array as keyed-Object */
		keyedBy<K extends string>(key: string): Record<K, T[]>;
		keyedBy(...keys: string[]): Record<string, T[]>;
		keyedBy<K extends string>(flatten: true, key: string): Record<K, T>;
		keyedBy(flatten: true, ...keys: string[]): Record<string, T>;
		keyedBy<K extends string>(flatten: false, key: string): Record<K, T[]>;
		keyedBy(flatten: false, ...keys: string[]): Record<string, T[]>;

		/** return sorted Array-of-objects */
		orderBy(keys: (string | SortBy)[]): T[];
		orderBy(...keys: (string | SortBy)[]): T[];
		sortBy(keys: (string | SortBy)[]): T[];
		sortBy(...keys: (string | SortBy)[]): T[];

		/** return new Array with no repeated elements */
		distinct(): T[];
		/** return mapped Array with no repeated elements */
		distinct<S>(mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];

		/** Clear down an Array */
		truncate(): T[];

		/** return cartesian-product of Array of Arrays */
		cartesian(): T;
		cartesian(...args: T[][]): T[];

		/** Tap into an Array */
		tap(tapfn: (value: T[]) => void, thisArg?: any): T[];
	}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

if (!Array.prototype.hasOwnProperty('keyedBy')) {
	Object.defineProperty(Array.prototype, 'keyedBy', {
		configurable: false,
		enumerable: false,
		writable: false,
		value: function (...keys: any[]) {
			return keyedBy(this, ...keys);
		},
	})
}
else console.error('Cannot extend Array.keyedBy');

if (!Array.prototype.hasOwnProperty('orderBy')) {
	const obj = {
		configurable: false,
		enumerable: false,
		writable: false,
		value: function (...keys: any[]) {
			return this.sort(sortBy(...keys));
		},
	} as PropertyDescriptor & ThisType<any[]>
	Object.defineProperty(Array.prototype, 'orderBy', obj);
	Object.defineProperty(Array.prototype, 'sortBy', obj);
}
else console.error('Cannot extend Array.orderBy/sortBy');

if (!Array.prototype.hasOwnProperty('truncate')) {
	Object.defineProperty(Array.prototype, 'truncate', {
		configurable: false,
		enumerable: false,
		writable: false,
		value: function () {
			this.fill(null).length = 0;
			return this;
		}
	})
}
else console.error('Cannot extend Array.truncate');

if (!Array.prototype.hasOwnProperty('distinct')) {
	Object.defineProperty(Array.prototype, 'distinct', {
		configurable: false,
		enumerable: false,
		writable: false,
		value: function (selector: (value: any, index: number, array: any[]) => []) {
			return selector
				? this.map(selector).distinct()
				: asArray(new Set(this))
		}
	})
}
else console.error('Cannot extend Array.distinct');

if (!Array.prototype.hasOwnProperty('cartesian')) {
	Object.defineProperty(Array.prototype, 'cartesian', {
		configurable: false,
		enumerable: false,
		writable: false,
		value: function (...args: any[]) {
			const [a, b = [], ...c] = args.length === 0 ? this : args;
			const cartFn = (a: any[], b: any[]) => (<any[]>[]).concat(...a.map(d => b.map(e => (<any[]>[]).concat(d, e))));

			return b.length
				? this.cartesian(cartFn(a, b), ...c)
				: asArray(a || [])
		}
	})
}
else console.error('Cannot extend Array.cartesian');

if (!Array.prototype.hasOwnProperty('tap')) {
	Object.defineProperty(Array.prototype, 'tap', {
		configurable: false,
		enumerable: false,
		writable: false,
		value: function (fn: Function) { fn(this); return this; }
	})
}
else console.error('Cannot extend Array.tap');