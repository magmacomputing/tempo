import { getTermRange, defineTerm, defineRange } from '../tempo.plugin.js';
import { COMPASS } from '#tempo/tempo.enum.js';
import type { Tempo } from '#tempo/tempo.class.js';

/** definition of fiscal season ranges */
const { ranges, groups } = defineRange([
	// Meteorological (North)
	{ key: 'Spring', day: 20, month: 3, symbol: 'Flower', group: 'meteorological', sphere: COMPASS.North },
	{ key: 'Summer', day: 21, month: 6, symbol: 'Sun', group: 'meteorological', sphere: COMPASS.North },
	{ key: 'Autumn', day: 23, month: 9, symbol: 'Leaf', group: 'meteorological', sphere: COMPASS.North },
	{ key: 'Winter', day: 22, month: 12, symbol: 'Snowflake', group: 'meteorological', sphere: COMPASS.North },

	// Meteorological (South)
	{ key: 'Spring', day: 1, month: 9, symbol: 'Flower', group: 'meteorological', sphere: COMPASS.South },
	{ key: 'Summer', day: 1, month: 12, symbol: 'Sun', group: 'meteorological', sphere: COMPASS.South },
	{ key: 'Autumn', day: 1, month: 3, symbol: 'Leaf', group: 'meteorological', sphere: COMPASS.South },
	{ key: 'Winter', day: 1, month: 6, symbol: 'Snowflake', group: 'meteorological', sphere: COMPASS.South },

	// Chinese
	{ key: 'Spring', day: 1, month: 3, symbol: 'Flower', group: 'chinese', trait: 'A time of renewal and growth' },
	{ key: 'Summer', day: 1, month: 6, symbol: 'Sun', group: 'chinese', trait: 'A period of heat and fruition' },
	{ key: 'Autumn', day: 1, month: 9, symbol: 'Leaf', group: 'chinese', trait: 'A time for harvest and contraction' },
	{ key: 'Winter', day: 1, month: 12, symbol: 'Snowflake', group: 'chinese', trait: 'A period of stillness and consolidation' },
], 'group', 'sphere');

export const SeasonTerm = defineTerm({
	key: 'szn',
	scope: 'season',
	description: 'Meteorlogical season',
	ranges,

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean) {
		const { config: { sphere = '' } } = this;
		const meteorological = groups[`meteorological.${sphere}`] ?? [];
		const list = meteorological.map(r => ({ ...r }));

		if (!keyOnly)
			list
				.forEach((item: any) => item['CN'] = getTermRange(this, groups['chinese.'], keyOnly));

		return getTermRange(this, list, keyOnly);
	}
});
