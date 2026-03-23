/** Coerce {value} into {value[]} ( if not already ), with optional {fill} Object */
export declare function asArray<T>(arr: Exclude<ArrayLike<T>, string> | undefined): T[];
export declare function asArray<T>(arr: T | Exclude<Iterable<T> | undefined, string>): NonNullable<T>[];
export declare function asArray<T, K>(arr: Iterable<T> | ArrayLike<T>, fill: K): K[];
/** stringify if not nullish */
export declare function asString<T>(str?: T): string;
/** convert String | Number | BigInt to Number */
export declare function asNumber(str?: string | number | bigint): number;
/** convert String | Number to BigInt */
export declare function asInteger<T extends string | number | bigint>(str?: T): bigint;
/** test if can convert String to Numeric */
export declare function isNumeric(str?: string | number | bigint): boolean;
/** return as Number if possible, else original String */
export declare const ifNumeric: (str: string | number | bigint, stripZero?: boolean) => string | number;
