import type { Property } from './type.library.js';
/** insert a value into an Array by its sorted position */
export declare const sortInsert: <T, K extends keyof T>(arr: T[] | undefined, val: T, key?: K) => T[];
/** sort Array-of-Objects by multiple keys */
export interface SortBy {
    field: string;
    dir?: 'asc' | 'desc';
    index?: number | '*';
    default?: any;
}
/** provide a sort-function to order a set of keys */
export declare function sortBy<T extends Property<T>>(...keys: (PropertyKey | SortBy)[]): (left: T, right: T) => 0 | 1 | -1;
/** return an array sorted-by a series of keys */
export declare function sortKey<T extends Property<any>>(array: T[], ...keys: (PropertyKey | SortBy)[]): T[];
type GroupFn<T extends Property<T>> = (value: T, index?: number) => PropertyKey;
/** group array of objects by the return value of the passed callback. */
export declare function byKey<T extends Property<any>>(arr: T[], grpFn: GroupFn<T>): Record<PropertyKey, T[]>;
/** group array of objects according to a list of key fields. */
export declare function byKey<T extends Property<any>>(arr: T[], ...keys: (keyof T)[]): Record<PropertyKey, T[]>;
/** group array of objects by the return value of the passed callback, but only the 'last' entry */
export declare function byLkp<T extends Property<any>>(arr: T[], grpFn: GroupFn<T>): Record<PropertyKey, T>;
/**  group array of objects according to a list of key fields, but only the 'last' entry */
export declare function byLkp<T extends Property<any>>(arr: T[], ...keys: (keyof T)[]): Record<keyof T, T>;
export {};
