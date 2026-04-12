import { Temporal } from '@js-temporal/polyfill';

import { isDefined, isObject, isString, isZonedDateTime } from '#library/type.library.js';
import { isNumeric } from '#library/coercion.library.js';
import { $termError } from '../../tempo.symbol.js';
import { getSafeFallbackStep } from '../../tempo.util.js';
import { REGISTRY, getRange, getTermRange, resolveTermShift, findTermPlugin } from '../plugin.util.js';

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

	const [termPart, rangePart] = unit.startsWith('#') 
		? unit.slice(1).split('.') 
		: [unit, undefined];

	const termObj = findTermPlugin(termPart);

	if (!termObj) {
		Tempo[$termError](instance.config, unit);
		return null;
	}

	const tz = zdt.timeZoneId;
	const cal = zdt.calendarId;

	// 1. Handle Absolute Mutations (start | mid | end)
	if (mutate === 'start' || mutate === 'mid' || mutate === 'end') {
		let list = getRange(termObj, instance, zdt);

		// If a range part was specified, filter the list
		if (rangePart) {
			list = list.filter(r => r.key?.toLowerCase() === rangePart.toLowerCase());
		}

		if (list.length === 0) {
			Tempo[$termError](instance.config, unit);
			return null;
		}

		const range = (getTermRange(instance, list, false, zdt) as any);
		if (!range) {
			Tempo[$termError](instance.config, unit);
			return null;
		}

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
	if (isString(offset) && !offset.startsWith('#')) {
		let jump = zdt;
		// Determine the shifted target by recursively calling .set on a temporary strict instance
		let next = new instance.constructor(jump, { ...instance.config, mode: 'strict' }).set({ [unit]: offset }).toDateTime();

		let iterations = 0;
		while (next.epochNanoseconds <= zdt.epochNanoseconds) {
			if (++iterations > 50) {													// Safety-Valve: prevent infinite look-ahead
				const range = termObj.define.call(new instance.constructor(jump, { ...instance.config, mode: 'strict' }), false);
				const step = getSafeFallbackStep(range as any, termObj.scope ?? (unit === '#period' ? 'period' : undefined));
				jump = jump.add(step);
			} else {
				const range = termObj.define.call(new instance.constructor(jump, { ...instance.config, mode: 'strict' }), false);
				if (isObject(range) && (range as any).end) {
					jump = (range as any).end.toDateTime();
				} else {
					const step = (unit === '#period' || termObj.scope === 'period') ? { days: 1 } : { years: 1 };
					jump = jump.add(step);
				}
			}
			next = new instance.constructor(jump, { ...instance.config, mode: 'strict' }).set({ [unit]: offset }).toDateTime();
		}
		return next;
	}

	// 3. Handle Numeric Shifts or Term Shifting
	if (isNumeric(offset) || (isString(offset) && offset.startsWith('#'))) {
		const shiftValue = isNumeric(offset) ? Number(offset) : 1;
		let jump = zdt;
		let remaining = Math.abs(shiftValue);
		const direction = shiftValue > 0 ? 1 : -1;

		let iterations = 0;
		while (remaining > 0) {
			if (++iterations > 100) {												// Safety-Valve: prevent infinite shift
				Tempo[$termError](instance.config, unit);
				return null;
			}

			let list = getRange(termObj, instance, jump);

			// If a range part was specified, filter the list
			if (rangePart) {
				list = list.filter(r => r.key?.toLowerCase() === rangePart.toLowerCase());
			}

			if (list.length === 0) {
				Tempo[$termError](instance.config, unit);
				return null;
			}

			const res = resolveTermShift(new instance.constructor(jump, instance.config), list, unit, direction);
			if (isDefined(res)) {
				jump = res.toDateTime();
				remaining--;
			} else {
				// if we hit the edge of the current list, jump to the end of the current cycle and try again
				const current = (getTermRange(instance, list, false, jump) as any);
				if (!current) {
					Tempo[$termError](instance.config, unit);
					return null;
				}
				
				const nextJump = (direction > 0) ? current.end.toDateTime() : current.start.toDateTime().subtract({ nanoseconds: 1 });
				if (nextJump.epochNanoseconds === jump.epochNanoseconds) {			// detect zero-progress stall
					jump = (direction > 0) ? jump.add({ days: 1 }) : jump.subtract({ days: 1 });
				} else {
					jump = nextJump;
				}
			}
		}

		return jump.withTimeZone(tz).withCalendar(cal);
	}

	return zdt;
}

/**
 * Resolves a term identifier (e.g. '#quarter') to its current value (start of cycle).
 */
export function resolveTermValue(Tempo: any, instance: any, term: string, zdt: any): any {
	if (!term.startsWith('#')) return undefined;

	const [termPart, rangePart] = term.slice(1).split('.');
	const termObj = findTermPlugin(termPart);

	if (!termObj) {
		Tempo[$termError](instance.config, term);
		return undefined;
	}

	let list = getRange(termObj, instance, zdt);

	// If a range part was specified, filter the list
	if (rangePart) {
		list = list.filter(r => r.key?.toLowerCase() === rangePart.toLowerCase());
	}

	if (list.length === 0) return undefined;

	const range = (getTermRange(instance, list, false, zdt) as any);
	if (!range) return undefined;
	if (!isZonedDateTime(zdt)) return undefined;

	const tz = zdt.timeZoneId;
	const cal = zdt.calendarId;

	return range.start.toDateTime().withTimeZone(tz).withCalendar(cal);
}
