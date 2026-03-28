
import { getOffsets } from '#library/temporal.library.js';

/**
 * International Cookbook  
 * (using 'Intl' namespace objects)
 */

/** return the system's current TimeZone, Calendar, and Locale */
export function getResolvedOptions() {
	return Intl.DateTimeFormat().resolvedOptions();
}

/** return the canonicalized locale string */
export function canonicalLocale(locale: string) {
	try {
		return Intl.getCanonicalLocales(locale.replace('_', '-'))[0];
	} catch (e) {
		return locale;
	}
}

/** return a localized relative time string (e.g., 'in 2 days') */
export function getRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale?: string, style: Intl.RelativeTimeFormatStyle = 'narrow') {
	try {
		return new Intl.RelativeTimeFormat(locale, { style }).format(value, unit);
	} catch (e) {
		return `${value} ${unit}`;
	}
}

/** return a localized list string (e.g., 'A, B, and C') */
export function formatList(list: string[], locale?: string, type: Intl.ListFormatType = 'conjunction', style: Intl.ListFormatStyle = 'long') {
	try {
		return new Intl.ListFormat(locale, { type, style }).format(list);
	} catch (e) {
		return list.join(', ');
	}
}

/** try to infer hemisphere using the timezone's daylight-savings setting */
export function getHemisphere(timeZone: string = getResolvedOptions().timeZone) {
	try {
		const { jan, jul } = getOffsets(timeZone);							// using default reference-year (2024) for stability

		if (jan === jul) return undefined;											// No DST or equatorial

		return jul > jan ? 'north' : 'south';
	} catch (e) {
		return undefined;
	}
}
