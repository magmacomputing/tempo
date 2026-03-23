import type { TValues } from '#library/type.library.js';
/** show Hex value of a number */
export declare const toHex: (num?: TValues<number>, len?: number) => string;
/** apply an Ordinal suffix */
export declare const suffix: (idx: number) => string;
/** split a value into an array */
export declare function split<T extends number>(nbr: T, chr?: string, zero?: boolean): number[];
export declare function split<T extends string>(nbr: T, chr?: string, zero?: boolean): (string | number)[];
/** fix a string to set decimal precision */
export declare const fix: (nbr?: string | number, max?: number) => string;
/** remove ':' from an HH:MI string, return as number */
export declare const asTime: (hhmi: string | number) => number;
/** format a value as currency */
export declare const asCurrency: (str: string | number, scale?: number, currency?: string) => string;
