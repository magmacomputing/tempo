import type { Extend, Property } from './type.library.js';
/** Get nested value */
export declare function extract<T>(obj: any, path: string | number, dflt?: T): T;
/** remove quotes around property names */
export declare const unQuoteObj: (obj: any) => string;
/** copy enumerable properties to a new Object */
export declare const asObject: <T>(obj?: Record<PropertyKey, any>) => T;
/** deep-compare object values for equality */
export declare const isEqual: (obj1?: any, obj2?: any) => boolean;
/** find all methods on an Object */
export declare const getMethods: (obj: any, all?: boolean) => PropertyKey[];
/** extract only defined values from Object */
export declare function ifDefined<T extends Property<any>>(obj: T): T;
/** extract a subset of keys from an object */
export declare const pick: <T extends Property<T>, K extends string>(obj: T, ...keys: K[]) => Partial<T>;
/** extract a named key from an array of objects */
export declare const pluck: <T, K extends keyof T>(objs: T[], key: K) => T[K][];
/** extend an object with the properties of another */
export declare const extend: <T extends {}, U>(obj: T, ...objs: U[]) => T;
export declare const countProperties: (obj?: {}) => number;
/**
 * helper to define objects with fixed literal properties
 * and a loose index signature for further extensions.
 * @example
 * ```
 * const obj = looseIndex<string,string>()({ foo: 'bar', bar: 'foo' });
 * type obj = typeof obj
 * ```
 */
export declare function looseIndex<K extends PropertyKey = string, V = any>(): <const T extends object>(obj: T | (() => T)) => Extend<T, K, V>;
export declare function looseIndex<const T extends object>(obj: T | (() => T)): Extend<T, string, any>;
export declare namespace looseIndex {
    var stringSymbol: <const T extends object>(obj: T | (() => T)) => Extend<T, string, symbol>;
    var symbolRegExp: <const T extends object>(obj: T | (() => T)) => Extend<T, symbol, RegExp>;
    var symbolString: <const T extends object>(obj: T | (() => T)) => Extend<T, symbol, string>;
    var stringString: <const T extends object>(obj: T | (() => T)) => Extend<T, string, string>;
}
