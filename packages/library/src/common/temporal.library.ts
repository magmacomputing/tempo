/**
 * Temporal Cookbook  
 * (using 'Temporal' namespace object)
*/

import '#library/temporal.polyfill.js';											// ensure Temporal is available

/** return the current Temporal.Instant */
export function now() {
	return Temporal.Now.instant();
}

/** return the current Temporal.PlainDate */
export function today(timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	return Temporal.Now.plainDateISO(timeZone);
}

/** return the current Unix timestamp (seconds) */
export function unix() {
	return Math.trunc(now().epochMilliseconds / 1_000);
}

/** return the current Unix timestamp (milliseconds) */
export function epoch() {
	return now().epochMilliseconds;
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
		: (date ?? now().toZonedDateTimeISO(timeZone));
	const { jan, jul } = getOffsets(zdt.timeZoneId, zdt.year);

	return zdt.offsetNanoseconds !== Math.min(jan, jul);
}
