import { cloneify } from '#core/shared/serialize.library.js';
import { COMPASS } from '#core/shared/tempo.config/tempo.enum.js';
import { getTermRange, type Range } from '#core/shared/tempo.config/plugins/term.utils.js';
import type { Tempo } from '#core/shared/tempo.class.js';

/** definition of meteorological season ranges */
const ranges = [																						// @link https://www.timeanddate.com/calendar/aboutseasons.html
	[																													// [0] = northern hemisphere
		{ key: 'Spring', day: 20, month: 3, symbol: 'Flower', sphere: COMPASS.North },
		{ key: 'Summer', day: 21, month: 6, symbol: 'Sun', sphere: COMPASS.North },
		{ key: 'Autumn', day: 23, month: 9, symbol: 'Leaf', sphere: COMPASS.North },
		{ key: 'Winter', day: 22, month: 12, symbol: 'Snowflake', sphere: COMPASS.North },
	], [																											// [1] = southern hemisphere
		{ key: 'Spring', day: 1, month: 9, symbol: 'Flower', sphere: COMPASS.South },
		{ key: 'Summer', day: 1, month: 12, symbol: 'Sun', sphere: COMPASS.South },
		{ key: 'Autumn', day: 1, month: 3, symbol: 'Leaf', sphere: COMPASS.South },
		{ key: 'Winter', day: 1, month: 6, symbol: 'Snowflake', sphere: COMPASS.South },
	], [																											// [2] = chinese seasons
		{ key: 'Spring', day: 1, month: 3, symbol: 'Flower', trait: 'A time of renewal and growth' },
		{ key: 'Summer', day: 1, month: 6, symbol: 'Sun', trait: 'A period of heat and fruition' },
		{ key: 'Autumn', day: 1, month: 9, symbol: 'Leaf', trait: 'A time for harvest and contraction' },
		{ key: 'Winter', day: 1, month: 12, symbol: 'Snowflake', trait: 'A period of stillness and consolidation' },
	]
] as Range[][]

export const key = 'szn';
export const scope = 'season';
export const description = 'Meteorlogical season';

/** determine where the current Tempo instance fits within the above range */
export function define(this: Tempo, keyOnly?: boolean) {
	const { config: { sphere } } = this;
	const south = sphere !== COMPASS.North;										// false = North, true = South
	const list = cloneify(ranges[+south]);

	if (!keyOnly) {
		const cn = getTermRange(this, ranges[2], false);				// get the chinese season for the current day/month
		list.forEach(item => item['CN'] = cn)										// add the chinese season to each range item
	}

	return getTermRange(this, list, keyOnly);
}
