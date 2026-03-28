import { defineTerm, getTermRange, type Range } from '../tempo.plugin.js';
import type { Tempo } from '#tempo/tempo.class.js';

/** definition of daily time periods */
const ranges = [
	{ key: 'midnight', hour: 0 },
	{ key: 'early', hour: 4 },
	{ key: 'morning', hour: 8 },
	{ key: 'midmorning', hour: 10 },
	{ key: 'midday', hour: 12 },
	{ key: 'afternoon', hour: 15, minute: 30 },
	{ key: 'evening', hour: 18 },
	{ key: 'night', hour: 20 },
] as Range[]

export const TimelineTerm = defineTerm({
	key: 'per',
	scope: 'period',
	description: 'Daily time period',

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean) {
		return getTermRange(this, ranges, keyOnly);
	}
});
