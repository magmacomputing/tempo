import { isDefined } from '#core/shared/type.library.js';
import type { Tempo } from '#core/shared/tempo.class.js';
import type { Temporal } from '@js-temporal/polyfill';

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
] as [Temporal.DateTimeUnit, keyof Tempo][];

/**
 * find where a Tempo fits within a range of DateTime
 */
export function getTermRange(tempo: Tempo, list: Range[], keyOnly = true) {
	const sorted = [...list]
		.sortBy('year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond')
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
