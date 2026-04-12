import { getTermRange, defineTerm, defineRange, resolveCycleWindow } from '../plugin.util.js';
import { COMPASS } from '../../tempo.enum.js';
import { type Tempo } from '../../tempo.class.js';
import { isTempo } from '../../tempo.symbol.js';

/** definition of fiscal season ranges */
const groups = defineRange([
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

/** resolve the full candidate list for the current context */
function resolve(t: Tempo, anchor?: any) {
	const source: any = anchor ?? t;
	const sphere = isTempo(source) ? source.config.sphere : (source.sphere ?? t.config.sphere ?? COMPASS.North);

	const template = (groups as any)[`meteorological.${sphere}`] ?? [];
	if (template.length === 0) return [];

	const list = resolveCycleWindow(t, template, anchor);

	// append Chinese trait information as an additional metadata field (CN)
	const chinese = (groups as any)['chinese.'] ?? [];
	list.forEach((itm: any) => itm['CN'] = getTermRange(t, chinese, false, anchor));

	return list;
}

/**
 * ## SeasonTerm
 * Meteorological season
 */
export const SeasonTerm = defineTerm({
	key: 'szn',
	scope: 'season',
	description: 'Meteorogical season',
	groups,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		return getTermRange(this, resolve(this, anchor), keyOnly, anchor);
	}
});
