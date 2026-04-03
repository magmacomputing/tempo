/**
 * Temporal Cookbook  
 * (using 'Temporal' namespace object)
*/

import '#library/temporal.polyfill.js';											// ensure Temporal is available
import { isNumber } from '#library/type.library.js';

/** return the current Temporal.Now.instant */
export function instant() {
	return Temporal.Now.instant();
}

/** return the current Temporal.Now.plainDateISO */
export function today(timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	return Temporal.Now.plainDateISO(timeZone);
}

/** return the current Unix timestamp (seconds) */
export function unix() {
	return Math.trunc(instant().epochMilliseconds / 1_000);
}

/** return the current Unix timestamp (milliseconds) */
export function epoch() {
	return instant().epochMilliseconds;
}

/** return the January and July offsets (nanoseconds) for a given timezone and year */
export function getOffsets(timeZone: string, year = 2024) {	//** use a fixed reference-year (2024) for stability */
	const jan = Temporal.PlainDate.from({ year, month: 1, day: 1 }).toZonedDateTime(timeZone).offsetNanoseconds;
	const jul = Temporal.PlainDate.from({ year, month: 7, day: 1 }).toZonedDateTime(timeZone).offsetNanoseconds;

	return { jan, jul };
}

/** return whether the given (or current) date is in Daylight Savings */
export function isDST(date?: Temporal.ZonedDateTime | string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	const zdt = (typeof date === 'string')
		? Temporal.ZonedDateTime.from(date)
		: (date ?? instant().toZonedDateTimeISO(timeZone));
	const { jan, jul } = getOffsets(zdt.timeZoneId, zdt.year);

	return zdt.offsetNanoseconds !== Math.min(jan, jul);
}

/**
 * Temporal rejects fractional Duration values, so normalise 
 * fractional parts downwards, e.g. { seconds: 0.1 } → { milliseconds: 100 }.
 * Mutates the provided duration object.
 */
export function normaliseFractionalDurations(payload: Record<string, any>) {
	const SCALE: [string, string, number][] = [
		['hours', 'minutes', 60],
		['minutes', 'seconds', 60],
		['seconds', 'milliseconds', 1_000],
		['milliseconds', 'microseconds', 1_000],
		['microseconds', 'nanoseconds', 1_000],
	]

	for (const [big, small, factor] of SCALE) {
		const v = payload[big];

		if (isNumber(v) && v !== Math.trunc(v)) {
			const whole = Math.trunc(v);
			const frac = v - whole;
			if (whole) payload[big] = whole; else delete payload[big];
			payload[small] = (payload[small] ?? 0) + Math.round(frac * factor);
		}
	}

	return payload;
}
