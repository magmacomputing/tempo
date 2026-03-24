import type { Index, Prettify, Invert, Property, KeyOf, ValueOf, EntryOf, LooseKey, WellKnownSymbols } from '#library/type.library.js';
/** used to identify the Enumify type */ declare const tag: "Enumify";
declare module './type.library.js' {
    interface TypeValueMap<T> {
        Enumify: {
            type: 'Enumify';
            value: Enum.wrap<Extract<T, Property<any>>>;
        };
    }
    interface IgnoreOfMap extends Methods<any> {
    }
}
/** prototype entries with string | symbol keys */
type Proto<T extends Property<any>> = Prettify<{
    /** number of entries in the Enum */ count(): number;
    /** array of all enumerable property names */ keys(): KeyOf<T>[];
    /** array of all enumerable object values */ values(): ValueOf<T>[];
    /** tuple of enumerable entries */ entries(): EntryOf<T>[];
    /** return an object with the keys and values swapped */ invert(): Invert<T>;
    /** check if a 'key' exists in the Enum */ has(key: LooseKey<KeyOf<T>>): boolean;
    /** check if a 'value' exists in the Enum */ includes(search: LooseKey<ValueOf<T>>): boolean;
    /** return the key for a given value */ keyOf(search: LooseKey<ValueOf<T>>): KeyOf<T>;
    /** iterate through all Enum entries */ forEach(fn: (entry: EntryOf<T>, index: number, enumify: wrap<any>) => void, thisArg?: any): void;
    /** filter Enum entries and return a new Enum */ filter(fn: (entry: EntryOf<T>, index: number, enumify: wrap<any>) => boolean, thisArg?: any): wrap<Partial<T>>;
    /** map Enum entries and return a new Enum */ map(fn: (entry: EntryOf<T>, index: number, enumify: wrap<any>) => any, thisArg?: any): wrap<Property<any>>;
    /** extend an existing Enum with new property-entries */ extend<const E extends ArrayArg>(list: E): wrap<Prettify<Omit<T, keyof Index<E>> & Index<E>>>;
    /** extend an existing Enum with new property-entries */ extend<const E extends ObjectArg>(list: E): wrap<Prettify<Omit<T, keyof E> & E>>;
    /** iterate through all Enum entries */ readonly [Symbol.iterator]: () => IterableIterator<EntryOf<T>>;
    /** used to identify the Enumify type */ readonly [Symbol.toStringTag]: typeof tag;
}>;
/** Enum properties & methods */ type wrap<T extends Property<any>> = Enum.props<T> & Methods<T>;
/** Enum methods (filtered) */ type Methods<T extends Property<any> = any> = Omit<Proto<T>, WellKnownSymbols>;
/** allowable arguments for Enumify */ type ArrayArg = string[] | readonly string[];
/** allowable arguments for Enumify */ type ObjectArg = Property<any>;
/** namespace for Enum type-helpers */
export declare namespace Enum {
    /** Enum properties & methods */ type wrap<T extends Property<any>> = props<T> & Methods<T>;
    /** Enum methods (filtered) */ type methods<T extends Property<any> = any> = keyof Methods<T>;
    /** Enum own properties */ type props<T extends Property<any>> = Readonly<T>;
}
/**
 * Create a premium, immutable 'Enum' object with a fluent API.
 * It supports both numerical and string-based indexing, as well as a full suite of helper methods like `keys()`, `values()`, and `forEach()`.
 * Enums created with `enumify` are designed to be extremely high-performance and lightweight.
 *
 * @param list - The array of strings, or object of key-value pairs to transform into an Enum.
 * @returns A frozen Enum object with both properties and helpful iteration methods.
 *
 * @example
 * ```typescript
 * const Status = enumify(['Active', 'Inactive', 'Pending']);
 * console.log(Status.Active); // 0
 * console.log(Status.keys()); // ['Active', 'Inactive', 'Pending']
 * ```
 */
export declare function enumify<const T extends ArrayArg>(list: T): Enum.wrap<Index<T>>;
export declare function enumify<const T extends ObjectArg>(list: T): Enum.wrap<T>;
/** create an entry in the Serialization Registry to describe how to rebuild an Enum */
export declare class Enumify {
    constructor(list: Property<any>);
}
export {};
