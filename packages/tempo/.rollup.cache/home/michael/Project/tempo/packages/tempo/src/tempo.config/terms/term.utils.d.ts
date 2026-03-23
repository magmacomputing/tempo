import type { Tempo } from '#tempo/tempo.class.js';
/** Tempo.Terms lets us know where a DateTime fits within pre-defined Ranges */
/** use this type to define a Range with a DateTime qualifier */
export type Range = {
    key: PropertyKey;
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
    [str: PropertyKey]: any;
};
/**
 * find where a Tempo fits within a range of DateTime
 */
export declare function getTermRange(tempo: Tempo, list: Range[], keyOnly?: boolean): PropertyKey | Range | undefined;
