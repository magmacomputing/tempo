import { sortKey, isDefined } from '#library';
import type { Tempo } from '#tempo/tempo.class.js';

/** key to use for Global Discovery of Tempo configuration */
export const $Tempo = Symbol.for('$Tempo');

/** key to use for Global Discovery of Tempo Plugins */
export const $Plugins = Symbol.for('$TempoPlugin');

/** key to use for Reactive Plugin Registration */
export const $Register = Symbol.for('$TempoRegister');

/** helper to self-register a Plugin into the Global Discovery registry */
export function registerPlugin(plugin: Tempo.Plugin) {
	const db = (globalThis as any)[$Plugins] ??= {};
	db.plugins ??= [];
	if (!db.plugins.includes(plugin)) db.plugins.push(plugin);
	(globalThis as any)[$Register]?.(plugin)
}

/** helper to self-register a TermPlugin into the Global Discovery registry */
export function registerTerm(term: Tempo.TermPlugin) {
	const db = (globalThis as any)[$Plugins] ??= {};
	db.terms ??= [];
	if (!db.terms.some((t: any) => t.key === term.key)) db.terms.push(term);
	(globalThis as any)[$Register]?.(term)
}

/**
 * # definePlugin
 * Factory to create and self-register a Tempo Plugin.
 * Registration occurs immediately via side-effect.
 */
export const definePlugin = <T extends Tempo.Plugin>(plugin: T): T => {
	registerPlugin(plugin);
	return plugin;
}

/**
 * # defineTerm
 * Factory to create and self-register a Tempo TermPlugin.
 * Registration occurs immediately via side-effect.
 */
export const defineTerm = <T extends Tempo.TermPlugin>(term: T): T => {
	registerTerm(term);
	return term;
}

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
}

const SCHEMA = [
	['year', 'yy'],
	['month', 'mm'],
	['day', 'dd'],
	['hour', 'hh'],
	['minute', 'mi'],
	['second', 'ss'],
	['millisecond', 'ms'],
	['microsecond', 'us'],
	['nanosecond', 'ns']
] as [Temporal.DateUnit | Temporal.TimeUnit, keyof Tempo][];

/**
 * find where a Tempo fits within a range of DateTime
 */
export function getTermRange(tempo: Tempo, list: Range[], keyOnly = true) {
	const sorted = sortKey([...list], 'year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond')
		.toReversed()

	const match = sorted
		.find(range => {
			for (const [rKey, sKey] of SCHEMA) {
				const val = range[rKey];
				if (isDefined(val)) {
					const sVal = tempo[sKey];
					if (sVal > val) return true;
					if (sVal < val) return false;
				}
			}
			return true;																					// fallback if DateTime exactly matches a range criteria
		})
		?? sorted.at(0)																					// fallback to wraparound at first item

	return keyOnly
		? match?.key
		: match;
}
