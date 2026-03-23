import { type SortBy } from '#library/array.library.js';
import type { Property } from '#library/type.library.js';
/**
 * extend an Object's prototype to include new method, if no clash
 */
export declare const patch: <T extends Record<"prototype" | "name", any>>(proto: T, property: string, method: Function) => void;
declare global {
    interface String {
        /** remove redundant spaces to a new string */ trimAll(pat?: RegExp): string;
        /** upper-case first letter of a word */ toProperCase(): string;
    }
}
type GroupFn<T extends Property<any>> = (value: T, index?: number) => PropertyKey;
type SortFn<T> = (left: T, right: T) => -1 | 0 | 1;
declare global {
    interface Array<T> {
        /** reduce Array to a keyed Object[] */ keyedBy(...keys: (keyof T)[]): Record<PropertyKey, T[]>;
        /** reduce Array to a keyed Object[], mapped */ keyedBy<S extends Property<T>>(grpfn: GroupFn<S>): Record<PropertyKey, T[]>;
        /** reduce Array to a keyed single-Object */ lookupBy(...keys: (keyof T)[]): Record<PropertyKey, T>;
        /** reduce Array to a keyed single-Object, mapped */ lookupBy<S extends Property<T>>(grpfn: GroupFn<S>): Record<PropertyKey, T>;
        /** return ordered Array */ orderBy(...keys: (PropertyKey | SortBy)[]): T[];
        /** return ordered Array, mapped */ orderBy<V extends keyof T>(mapfn: SortFn<V>): V[];
        /** return sorted Array */ sortBy(...keys: (PropertyKey | SortBy)[]): T[];
        /** return ordered Array, mapped */ sortBy<V extends keyof T>(mapfn: SortFn<V>): V[];
        /** return new Array with no repeated elements */ distinct(): T[];
        /** return mapped Array with no repeated elements */ distinct<S>(mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];
        /** clear down an Array */ clear(): T[];
        /** return cartesian-product of Array of Arrays */ cartesian(): T;
        /** return cartesian-product of Array of Arrays */ cartesian(...args: T[][]): T[];
        /** tap into an Array */ tap(tapfn: (value: T[]) => void, thisArg?: any): T[];
    }
}
export {};
