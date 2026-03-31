import { sortKey } from '#library/array.library.js';
import { isDefined } from '#library/type.library.js';
import { secure } from '#library/utility.library.js';
import { $Plugins, $Register } from '#tempo/tempo.symbol.js';
import type { Tempo } from '#tempo/tempo.class.js';
import type { Plugin, TermPlugin } from '#tempo/tempo.type.js';

/** helper to self-register a Plugin into the Global Discovery registry */
export function registerPlugin(plugin: Plugin) {
	const db = (globalThis as any)[$Plugins] ??= {};
	db.plugins ??= [];
	if (!db.plugins.includes(plugin)) db.plugins.push(plugin);
	(globalThis as any)[$Register]?.(plugin)
}

/** helper to self-register a TermPlugin into the Global Discovery registry */
export function registerTerm(term: TermPlugin) {
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
export const definePlugin = <T extends Plugin>(plugin: T): T => {
	registerPlugin(plugin);
	return plugin;
}

/**
 * # defineTerm
 * Factory to create and self-register a Tempo TermPlugin.
 * Registration occurs immediately via side-effect.
 */
export const defineTerm = <T extends TermPlugin>(term: T): T => {
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
	label?: string;
	start?: Tempo;
	end?: Tempo;
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
	const chronological = sortKey([...list], 'fiscal', 'year', 'month', 'day', 'hour', 'minute', 'second');
	const match = chronological
		.toReversed()
		.find((range: any) => {
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
		?? chronological.at(-1)!

	const i = chronological.indexOf(match);
	const next = chronological[i + 1] ?? { ...chronological[0], fiscal: (chronological[0].fiscal ?? chronological[0].year) + 1, year: (chronological[0].year ?? chronological[0].fiscal) + 1 };

	const start = tempo.toDateTime().with({
		year: match.year ?? match.fiscal,
		month: match.month ?? 1,
		day: match.day ?? 1,
		hour: match.hour ?? 0,
		minute: match.minute ?? 0,
		second: match.second ?? 0,
		millisecond: match.millisecond ?? 0,
		microsecond: match.microsecond ?? 0,
		nanosecond: match.nanosecond ?? 0,
	}).startOfDay();

	const end = tempo.toDateTime().with({
		year: next.year ?? next.fiscal,
		month: next.month ?? 1,
		day: next.day ?? 1,
		hour: next.hour ?? 0,
		minute: next.minute ?? 0,
		second: next.second ?? 0,
		millisecond: next.millisecond ?? 0,
		microsecond: next.microsecond ?? 0,
		nanosecond: next.nanosecond ?? 0,
	}).startOfDay();

	// Pre-build the Range object with Tempo instances
	const resolved = secure({
		...match,
		start: new (tempo.constructor as any)(start, tempo.config),
		end: new (tempo.constructor as any)(end, tempo.config)
	}) as Range;

	return keyOnly
		? resolved.key
		: resolved;
}

/**
 * find a registered Term and calculate its anchor date
 */
export function resolveTermAnchor(tempo: Tempo, terms: TermPlugin[], name: string, anchor: Tempo.Mutate): Temporal.ZonedDateTime | undefined {
	const ident = name.startsWith('#') ? name.slice(1) : name;
	const term = terms.find((t: TermPlugin) => t.key === ident || t.scope === ident);

	if (term) {
		const range = term.define.call(tempo, false);
		if (range && range.start && range.end) {
			const start = range.start.toDateTime();
			const end = range.end.toDateTime();

			switch (anchor) {
				case 'start':
					return start;

				case 'mid':
					const midNano = (start.epochNanoseconds + end.epochNanoseconds) / 2n;
					const diff = Number(midNano - start.epochNanoseconds);
					return start.add({ nanoseconds: diff });

				case 'end':
					return end.subtract({ nanoseconds: 1 })
			}
		}
	}

	return undefined;
}

/**
 * jump ahead or back by N terms, preserving the relative duration from the start
 */
export function resolveTermShift(tempo: Tempo, terms: TermPlugin[], name: string, steps: number): Temporal.ZonedDateTime | undefined {
	const ident = name.startsWith('#') ? name.slice(1) : name;
	const term = terms.find((t: TermPlugin) => t.key === ident || t.scope === ident);

	if (term && steps !== 0) {
		const currentZdt = tempo.toDateTime();
		const getRange = (t: Tempo) => {
			const res = term.define.call(t, false);
			return Array.isArray(res) ? res : [res];
		};

		let list = getRange(tempo);
		let idx = list.findIndex(r => {
			const start = r.start.toDateTime().epochNanoseconds;
			const end = r.end.toDateTime().epochNanoseconds;
			const now = currentZdt.epochNanoseconds;
			return now >= start && now < end;
		});

		// if we aren't "in" a term (e.g. in a gap), find the "next" or "prev" starting point
		if (idx === -1) {
			if (steps > 0) {
				idx = list.findIndex(r => r.start.toDateTime().epochNanoseconds > currentZdt.epochNanoseconds);
				if (idx !== -1) steps--; // we've already "found" the 1st one
			} else {
				const reversed = [...list].reverse();
				const rIdx = reversed.findIndex(r => r.end.toDateTime().epochNanoseconds < currentZdt.epochNanoseconds);
				if (rIdx !== -1) {
					idx = list.length - 1 - rIdx;
					steps++;
				}
			}
		}

		if (idx === -1) return undefined; // Cannot find a reference point

		const currentRange = list[idx];
		const offset = currentRange.start.toDateTime().until(currentZdt);

		// Traverse the blocks
		let targetIdx = idx + steps;
		while (targetIdx < 0 || targetIdx >= list.length) {
			const pivotDate = targetIdx >= list.length
				? list[list.length - 1].end.toDateTime().add({ nanoseconds: 1 })
				: list[0].start.toDateTime().subtract({ nanoseconds: 1 });

			const pivotTempo = new (tempo.constructor as any)(pivotDate, tempo.config);
			const newList = getRange(pivotTempo);

			if (targetIdx >= list.length) {
				targetIdx -= list.length;
				list = newList;
			} else {
				targetIdx = newList.length + (targetIdx); // targetIdx is negative here
				list = newList;
			}
			// Safety break for infinite loops in buggy plugins
			if (list.length === 0) return undefined;
		}

		const targetRange = list[targetIdx];
		return targetRange.start.toDateTime().add(offset, { overflow: 'constrain' });
	}

	return undefined;
}
