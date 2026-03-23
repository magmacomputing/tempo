import type { Obj, KeyOf, ValueOf, EntryOf, Primitives } from '#library/type.library.js';
/** property marker used to unwrap proxies in ownEntries() */
export declare const $Target: unique symbol;
/** mutate Object | Array by excluding values with specified primitive 'types' */
export declare function exclude<T extends Obj>(obj: T, ...types: (Primitives | Lowercase<Primitives>)[]): T;
/** mutate Object | Array reference with properties removed */
export declare function omit<T extends Obj>(obj: T): T;
export declare function omit<T extends Obj>(obj: T, ...keys: PropertyKey[]): T;
/** remove all ownKeys from an Object | Array */
export declare function purge<T extends Obj>(obj: T): T;
/** reset Object */
export declare function reset<T extends Obj>(orig: T, obj?: T): T & {
    [x: number]: any;
    length?: any;
    toString?: (() => string) | (() => string) | undefined;
    toLocaleString?: (() => string) | {
        (): string;
        (locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
    } | undefined;
    pop?: any;
    push?: any;
    concat?: any;
    join?: any;
    reverse?: any;
    shift?: any;
    slice?: any;
    sort?: any;
    splice?: any;
    unshift?: any;
    indexOf?: any;
    lastIndexOf?: any;
    every?: any;
    some?: any;
    forEach?: any;
    map?: any;
    filter?: any;
    reduce?: any;
    reduceRight?: any;
    find?: any;
    findIndex?: any;
    fill?: any;
    copyWithin?: any;
    entries?: any;
    keys?: any;
    values?: any;
    includes?: any;
    flatMap?: any;
    flat?: any;
    at?: any;
    findLast?: any;
    findLastIndex?: any;
    toReversed?: any;
    toSorted?: any;
    toSpliced?: any;
    with?: any;
    keyedBy?: any;
    lookupBy?: any;
    orderBy?: any;
    sortBy?: any;
    distinct?: any;
    clear?: any;
    cartesian?: any;
    tap?: any;
};
/** array of all enumerable PropertyKeys */
export declare function ownKeys<T extends Obj>(json: T): KeyOf<T>[];
/** array of all enumerable object values */
export declare function ownValues<T extends Obj>(json: T): ValueOf<T>[];
/** tuple of enumerable entries with string | symbol keys */
export declare function ownEntries<T extends Obj>(json: T, all?: boolean): EntryOf<T>[];
/** return an Object containing all 'own' and 'inherited' enumerable properties */
export declare function allObject<T extends Obj>(json: T): {
    [k: string]: ValueOf<T>;
};
/** get a string-array of 'getter' names for an object */
export declare const getAccessors: (obj?: any) => (string | symbol)[];
/** get a string-array of 'setter' names for an object */
export declare const setAccessors: (obj?: any) => (string | symbol)[];
/** copy all Own properties (including getters / setters) to a new object */
export declare const copyObject: <T extends Obj>(target: T, source: T) => T;
