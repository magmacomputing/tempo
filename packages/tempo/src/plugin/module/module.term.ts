import { Temporal } from '@js-temporal/polyfill';

import { isDefined, isObject, isString, isZonedDateTime } from '#library/type.library.js';
import { isNumeric } from '#library/coercion.library.js';
import { $termError } from '../../tempo.symbol.js';
import { getSafeFallbackStep } from '../../tempo.util.js';
import { REGISTRY, getRange, getTermRange, resolveTermShift } from '../plugin.util.js';

/**
 * Resolves a mutation (start/mid/end/add) against a Tempo Term.
 * 
 * @param Tempo - The Tempo constructor (for static access)
 * @param instance - The calling Tempo instance
 * @param mutate - The mutation type: 'set' | 'add' | 'start' | 'mid' | 'end'
 * @param unit - The term identifier (e.g. '#quarter')
 * @param offset - The mutation value (e.g. 1, -2, 'next', 'previous')
 * @param zdt - The current ZonedDateTime state
 * @returns The mutated ZonedDateTime
 */
export function resolveTermMutation(Tempo: any, instance: any, mutate: string, unit: string, offset: any, zdt: any): any {
	if (!isZonedDateTime(zdt)) return zdt;

	const ident = unit.startsWith('#') ? unit.slice(1) : unit;
	const termObj = REGISTRY.terms.find((t: any) => t.key === ident || t.scope === ident);

	if (!termObj) {
		Tempo[$termError](instance.config, unit);
		return null;
	}

	const tz = zdt.timeZoneId;
	const cal = zdt.calendarId;

	// 1. Handle Absolute Mutations (start | mid | end)
	if (mutate === 'start' || mutate === 'mid' || mutate === 'end') {
		const list = getRange(termObj, instance, zdt);
		const range = (getTermRange(instance, list, false, zdt) as any);
		if (!range) throw new Error(`Cannot resolve range for Term: ${unit}`);

		switch (mutate) {
			case 'start': return range.start.toDateTime().withTimeZone(tz).withCalendar(cal);
			case 'mid': {
				const startNs = range.start.toDateTime().epochNanoseconds as bigint;
				const endNs = range.end.toDateTime().epochNanoseconds as bigint;
				const midNs = startNs + (endNs - startNs) / BigInt(2);
				return Temporal.Instant.fromEpochNanoseconds(midNs).toZonedDateTimeISO(tz).withCalendar(cal);
			}
			case 'end': return range.end.toDateTime().subtract({ nanoseconds: 1 }).withTimeZone(tz).withCalendar(cal);
		}
	}

	// 2. Handle Relative Mutations (add | set)
	if (isString(offset)) {
		let jump = zdt;
		// Determine the shifted target by recursively calling .set on a temporary strict instance
		let next = new instance.constructor(jump, { ...instance.config, mode: 'strict' }).set({ [unit]: offset }).toDateTime();

		let iterations = 0;
		while (next.epochNanoseconds <= zdt.epochNanoseconds) {
			if (++iterations > 20) {
				const range = termObj.define.call(new instance.constructor(jump, { ...instance.config, mode: 'strict' }), false);
				const step = getSafeFallbackStep(range as any, termObj.scope ?? (unit === '#period' ? 'period' : undefined));
				jump = jump.add(step);
				next = new instance.constructor(jump, { ...instance.config, mode: 'strict' }).set({ [unit]: offset }).toDateTime();
				break;
			}

			const range = termObj.define.call(new instance.constructor(jump, { ...instance.config, mode: 'strict' }), false);
			if (isObject(range) && (range as any).end) {
				jump = (range as any).end.toDateTime();
			} else {
				const step = (unit === '#period' || termObj.scope === 'period') ? { days: 1 } : { years: 1 };
				jump = jump.add(step);
			}
			next = new instance.constructor(jump, { ...instance.config, mode: 'strict' }).set({ [unit]: offset }).toDateTime();
		}
		return next;
	}

	// 3. Handle Numeric Shifts
	if (isNumeric(offset)) {
		const res = resolveTermShift(instance, REGISTRY.terms, unit, offset as number);
		if (isDefined(res)) return res.toDateTime().withTimeZone(tz).withCalendar(cal);

		// failure to resolve shift
		Tempo[$termError](instance.config, unit);
		return null;
	}

	return zdt;
}

/**
 * Resolves a term identifier (e.g. '#quarter') to its current value (start of cycle).
 * 
 * @param Tempo - The Tempo constructor (for static access)
 * @param instance - The calling Tempo instance
 * @param term - The term identifier
 * @param zdt - The current ZonedDateTime state
 * @returns The resolved ZonedDateTime or undefined if not a term
 */
export function resolveTermValue(Tempo: any, instance: any, term: string, zdt: any): any {
	if (!term.startsWith('#')) return undefined;

	const ident = term.slice(1);
	const termObj = REGISTRY.terms.find((t: any) => t.key === ident || t.scope === ident);

	if (!termObj) {
		Tempo[$termError](instance.config, term);
		return undefined;
	}

	const list = getRange(termObj, instance, zdt);
	const range = (getTermRange(instance, list, false, zdt) as any);

	if (!range) return undefined;
	if (!isZonedDateTime(zdt)) return undefined;

	const tz = zdt.timeZoneId;
	const cal = zdt.calendarId;

	return range.start.toDateTime().withTimeZone(tz).withCalendar(cal);
}
