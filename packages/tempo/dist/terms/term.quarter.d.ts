import { type Range } from './term.utils.js';
import type { Tempo } from '.././tempo.class.js';
export declare const key = "qtr";
export declare const scope = "quarter";
export declare const description = "Fiscal Quarter";
/** determine where the current Tempo instance fits within the above range */
export declare function define(this: Tempo, keyOnly?: boolean): PropertyKey | Range | undefined;
