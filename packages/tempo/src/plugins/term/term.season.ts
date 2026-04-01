import { getTermRange, type Range, defineTerm } from '../tempo.plugin.js';
import { cloneify } from '#library/serialize.library.js';
import { COMPASS } from '#tempo/tempo.enum.js';
import type { Tempo } from '#tempo/tempo.class.js';

/** definition of fiscal season ranges */
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

export const SeasonTerm = defineTerm({
	key: 'szn',
	scope: 'season',
	description: 'Meteorlogical season',

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean) {
		const { config: { sphere } } = this;
		const south = sphere !== COMPASS.North;										// false = North, true = South
		const list = cloneify(ranges[+south]);

		if (!keyOnly)
			list
				.forEach(item => item['CN'] = getTermRange(this, ranges[2], false));

		return getTermRange(this, list, keyOnly);
	}
});
