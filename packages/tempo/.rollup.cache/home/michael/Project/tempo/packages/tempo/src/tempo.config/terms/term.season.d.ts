import { type Range } from './term.utils.js';
import type { Tempo } from '#core/tempo.class.js';
export declare const key = "szn";
export declare const scope = "season";
export declare const description = "Meteorlogical season";
/** determine where the current Tempo instance fits within the above range */
export declare function define(this: Tempo, keyOnly?: boolean): PropertyKey | Range | undefined;
