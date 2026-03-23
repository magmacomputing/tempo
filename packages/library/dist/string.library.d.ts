/**
 * clean a string to remove some standard control-characters (tab, line-feed, carriage-return) and trim redundant spaces.
 * allow for optional RegExp to specify additional match
 */
export declare function trimAll(str: string | number, pat?: RegExp): string;
/** every word has its first letter capitalized */
export declare function toProperCase<T extends string>(...str: T[]): T;
export declare const toCamelCase: <T extends string>(sentence: T) => T;
export declare const randomString: (len?: number) => string;
/** use sprintf-style formatting on a string */
export declare function sprintf(fmt: string, ...msg: any[]): string;
export declare function sprintf(...msg: any[]): string;
/** apply a plural suffix, if greater than '1' */
export declare const plural: (val: string | number | Record<string, string>, word: string, plural?: string) => string | ((num: string, word: string) => string);
/** strip a plural suffix, if endsWith 's' */
export declare const singular: (val: string) => string;
/** make an Object's values into a Template Literals, and evaluate */
export declare const makeTemplate: (templateString: Object) => (templateData: Object) => any;
export declare const toLower: <T>(str: T) => string | T;
export declare const toUpper: <T>(str: T) => string | T;
/** assert string is within bounds */
type StrLen<Min, Max = Min> = string & {
    __value__: never;
};
export declare const strlen: <Min extends number, Max extends number>(str: unknown, min: Min, max?: Max) => StrLen<Min, Max>;
/**
 * pad a string with leading character
 * @param		nbr	input value to pad
 * @param		len	fill-length (default: 2)
 * @param		fill	character (default \<space> for string and \<zero> for number)
 * @returns	fixed-length string padded on the left with fill-character
 */
export declare const pad: (nbr?: string | number | bigint, len?: number, fill?: string | number) => string;
/** pad a string with non-blocking spaces, to help right-align a display */
export declare const padString: (str: string | number | bigint, pad?: number) => string;
export {};
