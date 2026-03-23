/**
 * return an object's type as a ProperCase string.
 * if instance, return Class name
 */
export declare const getType: (obj?: any, ...instances: Instance[]) => keyof TypeValueMap<any>;
/** return TypeValue<T> object */
export declare const asType: <T>(value?: T, ...instances: Instance[]) => TypeValue<T>;
/** assert value is one of a list of Types */
export declare const isType: <T>(obj: unknown, ...types: Type[]) => obj is T;
/** Type-Guards: assert \<obj> is of \<type> */
export declare const isPrimitive: (obj?: unknown) => obj is Primitive;
export declare const isReference: (obj?: unknown) => obj is Object;
export declare const isIterable: <T>(obj: unknown) => obj is Iterable<T>;
export declare const isString: <T>(obj?: T) => obj is Extract<T, string>;
export declare const isNumber: <T>(obj?: T) => obj is Extract<T, number>;
export declare const isInteger: <T>(obj?: T) => obj is Extract<T, bigint>;
export declare const isIntegerLike: <T>(obj?: T) => obj is Extract<T, string>;
export declare const isDigit: <T>(obj?: T) => obj is Extract<T, number | bigint>;
export declare const isBoolean: <T>(obj?: T) => obj is Extract<T, boolean>;
export declare const isArray: <T>(obj: unknown) => obj is T[];
export declare const isArrayLike: <T>(obj: any) => obj is ArrayLike<T>;
export declare const isObject: <T>(obj?: T) => obj is Extract<T, object>;
export declare const isDate: <T>(obj?: T) => obj is Extract<T, Date>;
export declare const isRegExp: <T>(obj?: T) => obj is Extract<T, RegExp>;
export declare const isRegExpLike: <T>(obj?: T) => obj is Extract<T, string>;
export declare const isSymbol: <T>(obj?: T) => obj is Extract<T, symbol>;
export declare const isSymbolFor: <T>(obj?: T) => obj is Extract<T, symbol>;
export declare const isPropertyKey: (obj?: unknown) => obj is PropertyKey;
export declare const isNull: <T>(obj?: T) => obj is Extract<T, null>;
export declare const isNullish: <T>(obj: T) => obj is Extract<T, Nullish>;
export declare const isUndefined: <T>(obj?: T) => obj is undefined;
export declare const isDefined: <T>(obj: T) => obj is NonNullable<T>;
export declare const isClass: <T>(obj?: T) => obj is Extract<T, Function>;
export declare const isFunction: <T>(obj?: T) => obj is Extract<T, Function>;
export declare const isPromise: <T>(obj?: T) => obj is Extract<T, Promise<any>>;
export declare const isMap: <T, K = any, V = any>(obj?: T) => obj is Extract<T, Map<K, V>>;
export declare const isSet: <T, K = any>(obj?: T) => obj is Extract<T, Set<K>>;
export declare const isError: <T>(err?: T) => err is Extract<T, Error>;
export declare const isTemporal: <T>(obj: T) => obj is Extract<T, Temporals>;
export declare const isTempo: <T>(obj?: T) => obj is Extract<T, GetType<"Tempo">>;
export declare const isEnum: <T, E extends Property<any>>(obj?: T) => obj is Extract<T, GetType<"Enumify", E>>;
export declare const isPledge: <T, P = any>(obj?: T) => obj is Extract<T, GetType<"Pledge", P>>;
export declare const nullToZero: <T>(obj: T) => 0 | NonNullable<T>;
export declare const nullToEmpty: <T>(obj: T) => "" | NonNullable<T>;
export declare const nullToValue: <T, R>(obj: T, value: R) => R | NonNullable<T>;
/** object has no values */
export declare const isEmpty: <T>(obj?: T) => boolean;
export declare function assertCondition(condition: boolean, message?: string): asserts condition;
export declare function assertString(str: unknown): asserts str is string;
export declare function assertNever(val: never): asserts val is never;
/** infer T of a <T | T[]> */ export type TValue<T> = T extends Array<infer A> ? A : NonNullable<T>;
/** cast <T | undefined> as <T | T[]> */ export type TValues<T> = TValue<T> | Array<TValue<T>> | Extract<T, undefined>;
/** cast <T | T[]> as T[] */ export type TArray<T> = Array<TValue<T>>;
/** bottom value */ export type Nullish = null | undefined | void;
/** Generic Record */ export type Property<T> = Record<PropertyKey, T>;
/** Generic Record or Array */ export type Obj = Property<any> | Array<any>;
type SafeRecursion = 50;
type SafeCount<T, Acc extends any[] = [], Last = LastInUnion<T>> = Acc['length'] extends SafeRecursion ? number : 0 extends (1 & T) ? number : [
    T
] extends [never] ? Acc['length'] : SafeCount<Exclude<T, Last>, [...Acc, any]>;
/** Own properties of an Array, Object, Map or Enum */
export type WellKnownSymbols = {
    [K in keyof SymbolConstructor]: SymbolConstructor[K] extends symbol ? SymbolConstructor[K] : never;
}[keyof SymbolConstructor];
/** Augmentable map of method/property names to exclude from KeyOf/ValueOf/OwnOf */
export interface IgnoreOfMap {
}
type IgnoreOf = WellKnownSymbols | keyof IgnoreOfMap;
export type CountOf<T> = SafeCount<T>;
export type OwnOf<T extends Obj> = T extends Array<any> ? {
    [K in number]: T[number];
} : Omit<T, IgnoreOf>;
export type KeyOf<T extends Obj> = T extends Array<any> ? number : Exclude<Extract<keyof T, string | symbol>, IgnoreOf>;
export type ValueOf<T extends Obj> = T extends Array<any> ? T[number] : T[KeyOf<T>];
export type EntryOf<T extends Obj> = [KeyOf<T>, ValueOf<T>];
/** extracts only the Literal string keys (not index signatures) from an object/interface */
export type LiteralKey<T> = {
    [K in keyof T]: string extends K ? never : K;
}[keyof T] & string;
/** remove readonly from all keys */
export type Mutable<T> = {
    -readonly [K in keyof T]: T[K];
};
/** mark some fields as Optional */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/** Remove 'optional' on keys as well as 'undefined' on values */
export type NonOptional<T> = {
    [K in keyof T]-?: Exclude<T[K], undefined>;
};
/** Record with only one-key */
export type OneKey<K extends keyof any, V, KK extends keyof any = K> = {
    [P in K]: {
        [Q in P]: V;
    } & {
        [Q in Exclude<KK, P>]?: undefined;
    } extends infer O ? {
        [Q in keyof O]: O[Q];
    } : never;
}[K];
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export type ParseInt<T> = T extends `${infer N extends number}` ? N : never;
export type Plural<T extends string> = `${T}s`;
type toName<T extends Primitive> = T extends string ? "String" : T extends number ? "Number" : T extends bigint ? "BigInt" : T extends boolean ? "Boolean" : T extends symbol ? "Symbol" : T extends void ? "Void" : T extends undefined ? "Undefined" : T extends null ? "Null" : never;
type Primitive = string | number | bigint | boolean | symbol | void | undefined | null;
export type Primitives = toName<Primitive>;
/** Generic constructor type */
export type Constructor<T = any> = new (...args: any[]) => T;
type Instance = {
    type: string;
    class: Function;
};
export type Temporals = typeof Temporal extends {
    Now: any;
} ? Exclude<keyof typeof Temporal, 'Now'> : never;
export interface TypeValueMap<T = any> {
    String: {
        type: 'String';
        value: string;
    };
    Number: {
        type: 'Number';
        value: number;
    };
    BigInt: {
        type: 'BigInt';
        value: bigint;
    };
    Boolean: {
        type: 'Boolean';
        value: boolean;
    };
    Object: {
        type: 'Object';
        value: Extract<T, Property<unknown>>;
    };
    Array: {
        type: 'Array';
        value: Array<T>;
    };
    ArrayLike: {
        type: 'ArrayLike';
        value: ArrayLike<T>;
    };
    Undefined: {
        type: 'Undefined';
        value: undefined;
    };
    Null: {
        type: 'Null';
        value: null;
    };
    Void: {
        type: 'Void';
        value: void;
    };
    Empty: {
        type: 'Empty';
        value: unknown;
    };
    Date: {
        type: 'Date';
        value: Date;
    };
    Function: {
        type: 'Function';
        value: Function;
    };
    AsyncFunction: {
        type: 'AsyncFunction';
        value: Function;
    };
    Class: {
        type: 'Class';
        value: T;
    };
    Promise: {
        type: 'Promise';
        value: Promise<T>;
    };
    RegExp: {
        type: 'RegExp';
        value: RegExp;
    };
    Blob: {
        type: 'Blob';
        value: Blob;
    };
    Map: {
        type: 'Map';
        value: Map<any, T>;
    };
    Set: {
        type: 'Set';
        value: Set<T>;
    };
    WeakSet: {
        type: 'WeakSet';
        value: WeakSet<Property<unknown>>;
    };
    WeakMap: {
        type: 'WeakMap';
        value: WeakMap<Property<unknown>, T>;
    };
    WeakRef: {
        type: 'WeakRef';
        value: any;
    };
    Symbol: {
        type: 'Symbol';
        value: symbol;
    };
    Error: {
        type: 'Error';
        value: Error;
    };
    Temporal: {
        type: 'Temporal';
        value: Temporals;
    };
    'Temporal.Instant': {
        type: 'Temporal.Instant';
        value: Temporal.Instant;
    };
    'Temporal.ZonedDateTime': {
        type: 'Temporal.ZonedDateTime';
        value: Temporal.ZonedDateTime;
    };
    'Temporal.PlainDateTime': {
        type: 'Temporal.PlainDateTime';
        value: Temporal.PlainDateTime;
    };
    'Temporal.PlainDate': {
        type: 'Temporal.PlainDate';
        value: Temporal.PlainDate;
    };
    'Temporal.PlainTime': {
        type: 'Temporal.PlainTime';
        value: Temporal.PlainTime;
    };
    'Temporal.PlainYearMonth': {
        type: 'Temporal.PlainYearMonth';
        value: Temporal.PlainYearMonth;
    };
    'Temporal.PlainMonthDay': {
        type: 'Temporal.PlainMonthDay';
        value: Temporal.PlainMonthDay;
    };
}
export type Type = keyof TypeValueMap<any>;
export type TypeValue<T> = TypeValueMap<T>[keyof TypeValueMap<T>];
/** late-binding Type utility for augmented modules */
export type GetType<K extends string, T = any> = K extends keyof TypeValueMap<T> ? TypeValueMap<T>[K]['value'] : any;
type TupleEntry<T extends readonly unknown[], I extends unknown[] = [], R = never> = T extends readonly [infer Head, ...infer Tail] ? TupleEntry<Tail, [...I, unknown], R | [`${I["length"]}`, Head]> : R;
type ObjectEntry<T extends Property<any>> = T extends object ? {
    [K in keyof T]: [T[K]] extends [never] ? never : [K, Required<T>[K]];
}[keyof T] extends infer E ? E extends [infer K extends string | number, infer V] ? [`${K}`, V] : E extends [infer K extends symbol, infer V] ? [K, V] : never : never : never;
/** if T extends readonly[] => [number, T],   if T extends {} => [key:string, T] */
export type Entry<T extends Property<any>> = T extends readonly [unknown, ...unknown[]] ? TupleEntry<T> : T extends ReadonlyArray<infer U> ? [`${number}`, U] : ObjectEntry<T>;
/** Object.entries<T> as [number,T][] */
export type Entries<T extends Property<T>> = ReadonlyArray<Entry<T>>;
/** invert key-value object */
export type Inverse<T> = {
    [K in keyof T as (T[K] & PropertyKey)]: K;
};
/** assign array indexes as values in an object */
export type Index<T extends readonly any[]> = {
    [K in Entry<T> as `${K[1]}`]: ParseInt<K[0]>;
};
/** reverse a Tuple */
export type Reverse<T extends any[], R extends any[] = []> = ReturnType<T extends [infer F, ...infer L] ? () => Reverse<L, [F, ...R]> : () => R>;
/** reverse a Record */
export type Invert<T extends Record<keyof T, keyof any>> = {
    [K in keyof T as T[K]]: K;
};
type EnumerateMin<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number] : EnumerateMin<N, [...Acc, Acc["length"]]>;
type EnumerateMax<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? ([...Acc, Acc["length"]])[number] : EnumerateMax<N, [...Acc, Acc["length"]]>;
/** declare expected range of values */
export type IntRange<Lower extends number, Upper extends number> = Exclude<EnumerateMax<Upper>, EnumerateMin<Lower>>;
declare const __brand: unique symbol;
type Brand<B> = {
    [__brand]: B;
};
export type Branded<T, B> = T & Brand<B>;
export type EmptyObject = {
    [__brand]?: never;
};
type Length<T extends string, Count extends number[] = []> = T extends `${string}${infer Tail}` ? Length<Tail, [...Count, 0]> : Count["length"];
type Compare<First extends number, Second extends number, Count extends number[] = []> = First extends Second ? 0 : Count["length"] extends First ? -1 : Count["length"] extends Second ? 1 : Compare<First, Second, [...Count, 0]>;
export type MaxLength<T extends string, Max extends number> = Compare<Length<T>, Max> extends -1 | 0 ? T : never;
export type MinLength<T extends string, Min extends number> = Compare<Min, Length<T>> extends -1 | 0 ? T : never;
export type InRange<T extends string, Min extends number, Max extends number> = MinLength<T, Min> & MaxLength<T, Max>;
/**
 * return a substring of a string-type
 * eg: Substr<Monday|Tuesday|Wednesday, 3> returns Mon|Tue|Wed
 * U is the original string union
 * Max is the number of chars to return
 * Start is the offset (starting from '1')
 */
export type Substring<U extends string, Max extends number, Start extends number = 1> = Substr<U, Max, Start>;
/**
 * internal Type for Substring<> to recurse
 * Str is the string to build and return
 * Offset is an internal array used to assist with determining start-point of T
 */
type Substr<U, Max, Start, Str extends string = '', Offset extends number[] = [0]> = U extends `${infer NextChar}${infer Rest}` ? Offset["length"] extends Start ? Length<Str> extends Max ? Str : Substr<Rest, Start, Max, `${Str}${NextChar}`, Offset> : Substr<Rest, Start, Max, Str, [...Offset, 0]> : Str;
type UnionToIntersection<U> = (U extends unknown ? (arg: U) => 0 : never) extends (arg: infer I) => 0 ? I : never;
type LastInUnion<U> = UnionToIntersection<U extends unknown ? (x: U) => 0 : never> extends (x: infer L) => 0 ? L : never;
/**
 * convert a Union to a Tuple.
 * usage: UnionToTuple<A | B> = [A, B]
 */
export type UnionToTuple<T, Acc extends any[] = [], Last = LastInUnion<T>> = Acc['length'] extends SafeRecursion ? T[] : [
    T
] extends [never] ? Acc : UnionToTuple<Exclude<T, Last>, [Last, ...Acc]>;
/** Deep Readonly object for type safety */
export type Secure<T> = T extends (infer R)[] ? SecureArray<R> : T extends Function ? T : T extends object ? SecureObject<T> : T;
export interface SecureArray<T> extends ReadonlyArray<Secure<T>> {
}
export type SecureObject<T> = {
    readonly [K in keyof T]: Secure<T[K]>;
};
type LooseString = (string & {});
type LooseProperty = (PropertyKey & {});
/** Loose union */
export type LooseUnion<T extends string> = T | LooseString;
/** Loose property key */
export type LooseKey<K extends PropertyKey = string> = K | LooseProperty;
/** Extend an object with a generic-signature */
export type Extend<T, K extends PropertyKey = string, V = any> = T & {
    [P in K]: V;
};
export {};
