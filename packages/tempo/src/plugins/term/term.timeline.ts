import { defineTerm, getTermRange, defineRange } from '../tempo.plugin.js';
import type { Tempo } from '#tempo/tempo.class.js';

/** definition of daily time periods */
const { ranges } = defineRange([
	{ key: 'midnight', hour: 0, group: 'standard' },
	{ key: 'early', hour: 4, group: 'standard' },
	{ key: 'morning', hour: 8, group: 'standard' },
	{ key: 'midmorning', hour: 10, group: 'standard' },
	{ key: 'midday', hour: 12, group: 'standard' },
	{ key: 'afternoon', hour: 15, minute: 30, group: 'standard' },
	{ key: 'evening', hour: 18, group: 'standard' },
	{ key: 'night', hour: 20, group: 'standard' },
], 'group');

export const TimelineTerm = defineTerm({
	key: 'per',
	scope: 'period',
	description: 'Daily time period',
	ranges,

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean) {
		return getTermRange(this, ranges, keyOnly);
	}
});
