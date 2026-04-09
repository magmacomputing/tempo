import { isDefined } from '#library/type.library.js';
import type { Tempo } from './tempo.class.js';
import type { Range, DateTimeUnit } from './tempo.type.js';

/** internal schema for Temporal units and their Tempo property aliases */
export const SCHEMA = [
	['year', 'yy'],
	['month', 'mm'],
	['day', 'dd'],
	['hour', 'hh'],
	['minute', 'mi'],
	['second', 'ss'],
	['millisecond', 'ms'],
	['microsecond', 'us'],
	['nanosecond', 'ns']
] as [DateTimeUnit, keyof Tempo][];

/** helper to find the largest Temporal unit defined in a Range list */
export function getLargestUnit(list: Range | Range[]): DateTimeUnit | undefined {
	const items = Array.isArray(list) ? list : [list];
	return SCHEMA.find(([u]) => items.some(r => isDefined(r[u])))?.[0];
}

/** helper to determine a safe forward step for infinite-loop recovery */
export function getSafeFallbackStep(range: Range | Range[], scope?: string): Temporal.DurationLike {
	const items = Array.isArray(range) ? range : [range];
	const first = items[0] as any;

	// prioritize stashed 'rollover' metadata (calculated by getTermRange) if available
	const rolloverUnit = first?.rollover || (() => {
		const unit = getLargestUnit(items);
		const unitIndex = SCHEMA.findIndex(([u]) => u === unit);
		const rolloverIndex = Math.max(0, unitIndex - 1);
		return (unitIndex !== -1) ? SCHEMA[rolloverIndex][0] : undefined;
	})();

	if (rolloverUnit) return { [`${rolloverUnit}s`]: 1 } as any;
	return scope === 'period' ? { days: 1 } : { years: 1 };
}
