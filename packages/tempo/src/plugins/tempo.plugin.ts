import { sortKey } from '#library/array.library.js';
import { isDefined } from '#library/type.library.js';
import { secure } from '#library/utility.library.js';
import { $Plugins, $Register } from '#tempo/tempo.symbol.js';
import { SCHEMA, getLargestUnit } from '#tempo/tempo.util.js';
import type { Tempo } from '#tempo/tempo.class.js';
import type { Plugin, TermPlugin, Range, ResolvedRange } from '#tempo/tempo.type.js';

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

/**
 * find where a Tempo fits within a range of DateTime
 */
export function getTermRange(tempo: Tempo, list: Range[], keyOnly = true): string | ResolvedRange | undefined {
	const chronological = sortKey([...list], 'year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond');

	if (chronological.length === 0) return undefined;

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
	const zdt = tempo.toDateTime();

	// determine the largest unit defined in the range list, and use the unit above it as rollover
	const unit = getLargestUnit(list);
	const unitIndex = SCHEMA.findIndex(([u]) => u === unit);
	const rolloverIndex = Math.max(0, unitIndex - 1);
	const rolloverUnit = SCHEMA[rolloverIndex][0];

	const resolve = (range: Range, anchor: Temporal.ZonedDateTime) => {
		const obj: any = {};
		for (let i = 0; i < SCHEMA.length; i++) {
			const [u] = SCHEMA[i];
			if (isDefined(range[u])) {
				obj[u] = range[u];
			} else if (i > rolloverIndex) {
				obj[u] = (i <= 2) ? 1 : 0;										// year, month, day reset to 1; time units reset to 0
			} else {
				obj[u] = (anchor as any)[u];
			}
		}
		return anchor.with(obj);
	};

	const startAnchor = (() => {
		const candidate = resolve(match, zdt);
		return candidate.epochNanoseconds > zdt.epochNanoseconds
			? zdt.subtract({ [`${rolloverUnit}s` as any]: 1 })
			: zdt
	})();
	const start = resolve(match, startAnchor);

	const nextRange = chronological[i + 1];
	const end = isDefined(nextRange)
		? resolve(nextRange, startAnchor)
		: resolve(chronological[0], startAnchor.add({ [`${rolloverUnit}s` as any]: 1 }))

	// Pre-build the Range object with Tempo instances
	const resolved = secure({
		...match,
		start: new (tempo.constructor as any)(start, tempo.config),
		end: new (tempo.constructor as any)(end, tempo.config),
		unit,
		rollover: rolloverUnit
	}) as ResolvedRange;

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
		const [range] = getRange(term, tempo);
		if (range && range.start && range.end) {
			const start = range.start.toDateTime();
			const end = range.end.toDateTime();

			switch (anchor) {
				case 'start':
					return start;

				case 'mid':
					return new Temporal.ZonedDateTime((start.epochNanoseconds + end.epochNanoseconds) / 2n, start.timeZoneId, start.calendarId);

				case 'end':
					return end.subtract({ nanoseconds: 1 })
			}
		}
	}

	return undefined;
}

/** helper to normalize term definition ranges */
function getRange(term: TermPlugin, t: Tempo): Range[] {
	const res = term.define.call(t, false);
	const list = (res == null) ? [] : (Array.isArray(res) ? res : [res]);
	return list.filter((r): r is Range => Boolean(r));
}

/**
 * jump ahead or back by N terms, preserving the relative duration from the start
 */
export function resolveTermShift(tempo: Tempo, terms: TermPlugin[], name: string, steps: number): Temporal.ZonedDateTime | undefined {
	const ident = name.startsWith('#') ? name.slice(1) : name;
	const term = terms.find((t: TermPlugin) => t.key === ident || t.scope === ident);

	if (term && steps !== 0) {
		const currentZdt = tempo.toDateTime();

		let list = getRange(term, tempo);
		let idx = list.findIndex(r => {
			if (!r.start || !r.end) return false;
			const start = r.start.toDateTime().epochNanoseconds;
			const end = r.end.toDateTime().epochNanoseconds;
			const now = currentZdt.epochNanoseconds;
			return now >= start && now < end;
		});

		// if we aren't "in" a term (e.g. in a gap), find the "next" or "prev" starting point
		if (idx === -1) {
			if (steps > 0) {
				idx = list.findIndex(r => r.start && r.start.toDateTime().epochNanoseconds > currentZdt.epochNanoseconds);
				if (idx !== -1) steps--;														// we've already "found" the 1st one
			} else {
				const reversed = [...list].reverse();
				const rIdx = reversed.findIndex(r => r.end && r.end.toDateTime().epochNanoseconds < currentZdt.epochNanoseconds);

				if (rIdx !== -1) {
					idx = list.length - 1 - rIdx;
					steps++;
				}
			}
		}

		if (idx === -1) return undefined;												// Cannot find a reference point

		const currentRange = list[idx];
		if (!currentRange.start) return undefined;
		const offset = currentRange.start.toDateTime().until(currentZdt);

		// Traverse the blocks
		let targetIdx = idx + steps;
		let safeguard = 0;
		while (targetIdx < 0 || targetIdx >= list.length) {
			if (safeguard++ > 10000) return undefined;						// Safety break for infinite loops in buggy plugins

			const pivotDate = targetIdx >= list.length
				? list[list.length - 1]?.end?.toDateTime().add({ nanoseconds: 1 })
				: list[0]?.start?.toDateTime().subtract({ nanoseconds: 1 });

			if (!pivotDate) return undefined;

			const pivotTempo = new (tempo.constructor as any)(pivotDate, tempo.config);
			const newList = getRange(term, pivotTempo);

			if (targetIdx >= list.length) {
				targetIdx -= list.length;
				list = newList;
			} else {
				targetIdx = newList.length + (targetIdx);						// targetIdx is negative here
				list = newList;
			}

			if (list.length === 0) return undefined;							// Safety break for infinite loops in buggy plugins
		}

		const targetRange = list[targetIdx];
		if (!targetRange?.start) return undefined;

		return targetRange.start.toDateTime().add(offset, { overflow: 'constrain' });
	}

	return undefined;
}
