import type { Prettify, Property } from '#library/type.library.js';
import type { Tempo } from '../tempo.class.js';

/**
 * ## TermPlugin
 * Interface for term-driven parsing and resolution.
 */
export interface TermPlugin {
	key: string;
	scope?: string;
	description?: string;
	groups?: any;
	ranges?: any[];
	resolve?: (this: Tempo, anchor?: any) => Range[];
	define: (this: Tempo, keyOnly?: boolean, anchor?: any) => string | Range | Range[] | undefined;
}

/** mapping of terms to their resolved values */
export type Terms = Property<any>;

/**
 * ## Range
 * term definition range — must have at least one duration component.
 */
export type Range = Prettify<{
	key: string;
	group?: string;																						// categorization marker (e.g. 'western', 'chinese', 'fiscal')
	[meta: string]: any;
} & (
		{ year: number } | { month: number } | { week: number } | { day: number } |
		{ hour: number } | { minute: number } | { second: number } |
		{ millisecond: number } | { microsecond: number } | { nanosecond: number }
	) & {
		year?: number;
		month?: number;
		week?: number;
		day?: number;
		hour?: number;
		minute?: number;
		second?: number;
		millisecond?: number;
		microsecond?: number;
		nanosecond?: number;
	}>;

/**
 * ## ResolvedRange
 * A range that has been resolved to full start/end boundaries.
 */
export type ResolvedRange = Range & {
	start: Tempo;
	end: Tempo;
	scope?: string;
	label?: string;
	unit?: string;
	rollover?: string;
	[str: string]: any;
}

/**
 * ## Plugin
 * extend the functionality of the Tempo class.
 */
export type Plugin = (options: any, TempoClass: typeof Tempo, factory: (val: any) => Tempo) => void;

/**
 * ## Module
 * Internal extensions to the Tempo class (same signature as Plugin).
 */
export type Module = Plugin;

/**
 * ## Extension
 * Class-augmenting extensions to the Tempo class (same signature as Plugin).
 */
export type Extension = Plugin;
