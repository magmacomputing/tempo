import { Temporal } from '@js-temporal/polyfill';
import { isDefined, isFunction, isString } from '#library/type.library.js';
import { secure } from '#library/utility.library.js';
import { type Tempo } from '../tempo.class.js';
import { SCHEMA, getLargestUnit } from '../tempo.util.js';
import { sortKey, byKey } from '#library/array.library.js';
import { $Register, $Plugins, isTempo, $Interpreter, $logError, $logDebug } from '../tempo.symbol.js';
import type { TermPlugin, Range, ResolvedRange, Plugin, Extension } from './plugin.type.js';

/** 
 * # REGISTRY
 * Internal registry for registered components.
 */
export const REGISTRY = {
	terms: [] as TermPlugin[],
	extends: [] as Extension[]
}

/** internal helper to resolve the class-host from either an instance or the class itself */
function getHost(t: any): any {
	const $T = Symbol.for('$Target');
	const isFn = typeof t === 'function';
	if (isFn) return t?.[$T] ?? t;
	const host = (t as any)?.constructor ?? (isDefined(t) ? Reflect.get(Object(t), 'constructor') : Object);
	const target = host?.[$T] ?? host;
	return typeof target === 'function' ? target : Object;
}

/**
 * ## interpret
 * Utility to safely delegate calls to the Tempo Interpreter with catch-support.
 */
export function interpret(t: any, module: string, methodOrFallback?: any, ...args: any[]) {
	const host = getHost(t);
	const hostLogic = host[$Interpreter]?.[module];

	try {
		if (!isFunction(hostLogic)) throw new Error(`${module} plugin not loaded`);

		// Resolve the specific logic (either the module itself or a sub-method)
		const logic = isString(methodOrFallback) ? hostLogic[methodOrFallback] : hostLogic;
		if (!isFunction(logic)) throw new Error(`${module} ${methodOrFallback} method not loaded`);

		return logic.apply(t, args);
	} catch (err) {
		host[$logError](t.config, err);
	}

	return (isFunction(methodOrFallback) ? methodOrFallback() : undefined);
}

/**
 * ## defineTerm
 * Helper to register a Term plugin.
 */
export const defineTerm = <T extends TermPlugin>(term: T): T => {
	registerTerm(term);
	return term;
}

/**
 * ## defineModule
 * Used to register an internal modularization component.
 */
export const defineModule = <T extends Plugin>(module: T): T => {
	registerPlugin(module);
	return module;
}

/**
 * ## defineInterpreterModule
 * Used to register a module that attaches methods to the Tempo $Interpreter registry.
 */
export const defineInterpreterModule = (name: string, logic: Function) =>
	defineModule((options: any, TempoClass: any) => {
		TempoClass[$Interpreter] ??= {};

		if (isDefined(TempoClass[$Interpreter][name]) && TempoClass[$Interpreter][name] !== logic) {
			throw new Error(`Tempo Interpreter Module clash: '${name}' logic is already defined.`);
		}

		TempoClass[$Interpreter][name] = logic;
	});

/**
 * ## defineExtension
 * Used to register a class-augmenting extension.
 */
export const defineExtension = <T extends Plugin>(extension: T): T => {
	registerPlugin(extension);
	return extension;
}

/**
 * ## defineRange
 * Factory to normalize and group Term ranges for efficient lookup.
 */
export function defineRange<T extends Range>(ranges: T[], ...keys: (keyof T)[]) {
	return byKey(ranges, ...keys);
}

/**
 * find where a Tempo fits within a range of DateTime
 */
export function getTermRange(tempo: Tempo, list: Range[], keyOnly = true, anchor?: any): string | ResolvedRange | undefined {
	const chronological = sortKey([...list], 'year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond');

	if (chronological.length === 0) return undefined;

	const match = chronological
		.toReversed()
		.find((range: any) => {
			for (const [rKey, sKey] of SCHEMA) {
				const val = range[rKey];

				if (isDefined(val)) {
					const source: any = anchor ?? tempo;
					const sVal = isTempo(source) ? source[sKey] : source[sKey] ?? source[rKey];

					if (sVal === undefined) continue;
					if (sVal > val) return true;
					if (sVal < val) return false;
				}
			}

			return true;																					// fallback if DateTime exactly matches a range criteria
		})
		?? chronological.at(-1)!

	const i = chronological.indexOf(match);
	const next = chronological[i + 1];

	const zdt = anchor ?? (tempo as any).toDateTime();

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
				obj[u] = (i <= 2) ? 1 : 0;													// year, month, day reset to 1; time units reset to 0
			} else {
				obj[u] = (anchor as any)[u];
			}
		}
		// @ts-ignore
		const zdt = Temporal.ZonedDateTime.from({ ...obj, timeZone: anchor.timeZoneId, calendar: anchor.calendarId });
		// @ts-ignore
		return new tempo.constructor(zdt, (tempo as any).config);
	}

	const start = resolve(match, zdt);
	let end: Tempo;

	if (next) {
		end = resolve(next, zdt);
	} else {
		end = resolve(match, zdt.add({ [`${rolloverUnit}s`]: 1 } as any));
	}

	if (keyOnly) return match.key;

	const result = {
		...match,
		start,
		end
	} as ResolvedRange;
	return result;
}

/**
 * # getRange
 * Resolve the full list of candidates for a term, passing an anchor to prevent recursion.
 */
export function getRange(term: TermPlugin, t: Tempo, anchor?: any, group?: string): Range[] {
	let res: any;

	try {
		res = term.resolve ? term.resolve.call(t, anchor) : term.define.call(t, false, anchor);
	} catch (err: any) {
		if (err.message.includes('Class constructor')) {
			return [];
		}
		throw err;
	}

	let list = (res == null) ? [] : (Array.isArray(res) ? res : [res]);

	if (group) {
		// find the registered ranges for this term and filter by group
		const meta: any = (term as any).groups ?? (term as any).ranges;
		if (meta) {
			const source = Array.isArray(meta) ? meta : Object.values(meta).flat(Infinity);
			list = (source as any[]).filter(r => r.group === group);
		}
	}

	return secure(list) as Range[];
}

/**
 * Resolve a term to a specific boundary based on a mutation.
 */
export function resolveTermAnchor(tempo: Tempo, terms: any[], offset: string, mutate: string): any {
	const ident = offset.startsWith('#') ? offset.slice(1) : offset;
	const termObj = terms.find(t => t.key === ident || t.scope === ident);
	if (!termObj) return undefined;

	const anchor = (tempo as any).toDateTime();
	const list = getRange(termObj, tempo, anchor);
	const range = (getTermRange(tempo, list, false, anchor) as any);
	if (!range) return undefined;

	if (mutate === 'start') return range.start;
	if (mutate === 'mid') {
		const startNs = range.start.toDateTime().epochNanoseconds as bigint;
		const endNs = range.end.toDateTime().epochNanoseconds as bigint;
		const midNs = startNs + (endNs - startNs) / BigInt(2);
		// @ts-ignore
		return new tempo.constructor(Temporal.Instant.fromEpochNanoseconds(midNs).toZonedDateTimeISO((range.start as any).tz).withCalendar((range.start as any).cal), (tempo as any).config);
	}
	if (mutate === 'end') return range.end.subtract({ nanoseconds: 1 });

	return undefined;
}

/**
 * Resolve a term shift.
 */
export function resolveTermShift(tempo: Tempo, terms: any[], offset: string, shift: number): any {
	const ident = offset.startsWith('#') ? offset.slice(1) : offset;
	const termObj = terms.find(t => t.key === ident || t.scope === ident);
	if (!termObj) return undefined;

	const anchor = (tempo as any).toDateTime();
	const list = getRange(termObj, tempo, anchor);
	const range = (getTermRange(tempo, list, false, anchor) as any);
	if (!range) return undefined;

	// find index in list (matching both key and year for accurate cycle identification)
	const isMultiCycle = list.some(r => isDefined(r.year));
	const idx = list.findIndex(r => r.key === range.key && (isMultiCycle ? r.year === range.year : true));
	if (idx === -1) return undefined;

	const targetIdx = idx + shift;
	const target = list[targetIdx];
	if (!target) return undefined;

	// resolve target range
	const res = (getTermRange(tempo, [target], false) as any);
	return res.start;
}

/**
 * ## resolveCycleWindow
 * Helper to generate a 3-cycle candidate window (-1, 0, +1 years) around an anchor.
 */
export function resolveCycleWindow(t: Tempo, template: Range[], anchor?: any) {
	const source: any = anchor ?? t;													// anchor used to resolve relative cycle year
	const yy = isTempo(source) ? source.yy : (source.year ?? source.yy);
	const mm = isTempo(source) ? source.mm : (source.month ?? source.mm);
	const dd = isTempo(source) ? source.dd : (source.day ?? source.dd);

	const startItem = template[0];
	const startMm = startItem.month ?? 1;
	const startDd = startItem.day ?? 1;

	let baseYear = yy;

	// Anchor check: if anchor is before cycle start in current year, its 'active' cycle started last year.
	if (mm < startMm || (mm === startMm && dd < startDd))
		baseYear--;

	const list: Range[] = [];
	for (const offset of [-1, 0, 1]) {
		const yy = baseYear + offset;
		template.forEach(itm => {
			const clone = { ...itm };

			// calculate absolute year from relative year offset
			if (isDefined(itm.year)) clone.year = itm.year + yy;
			else clone.year = yy;

			list.push(clone);
		});
	}

	return list;
}

/**
 * ## registerTerm
 * Registration hook for Term plugins.
 */
export function registerTerm(term: TermPlugin) {
	const db = (globalThis as any)[$Plugins] ??= {};
	db.terms ??= [];

	if (!db.terms.some((t: any) => t.key === term.key)) {
		db.terms.push(term);
	}

	if (!REGISTRY.terms.find(t => t.key === term.key)) {
		REGISTRY.terms.push(term);
	}

	(globalThis as any)[$Register]?.(term);
}

/**
 * ## registerPlugin
 * Registration hook for general plugins.
 */
export function registerPlugin(plugin: any) {
	const db = (globalThis as any)[$Plugins] ??= {};
	db.plugins ??= [];

	if (!db.plugins.includes(plugin)) {
		db.plugins.push(plugin);
	}

	if (!REGISTRY.extends.includes(plugin)) {
		REGISTRY.extends.push(plugin);
	}

	(globalThis as any)[$Register]?.(plugin);
}
