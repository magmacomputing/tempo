import { type Range } from './term.utils.js';
import type { Tempo } from '.././tempo.class.js';
export declare const key = "zdc";
export declare const scope = "zodiac";
export declare const description = "Astrological Zodiac sign";
/** determine where the current Tempo instance fits within the above ranges */
export declare function define(this: Tempo, keyOnly?: boolean): PropertyKey | Range | undefined;
