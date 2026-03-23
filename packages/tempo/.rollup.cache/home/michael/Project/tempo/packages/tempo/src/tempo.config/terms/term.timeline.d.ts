import { type Range } from './term.utils.js';
import type { Tempo } from '#tempo/tempo.class.js';
export declare const key = "per";
export declare const scope = "period";
export declare const description = "Daily time period";
/** determine where the current Tempo instance fits within the above range */
export declare function define(this: Tempo, keyOnly?: boolean): PropertyKey | Range | undefined;
