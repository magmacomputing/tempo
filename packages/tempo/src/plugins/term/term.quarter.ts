import { isDefined } from '#library/type.library.js';

import { defineTerm, getTermRange, defineRange } from '../tempo.plugin.js';
import { COMPASS } from '#tempo/tempo.enum.js';
import type { Tempo } from '#tempo/tempo.class.js';

/** definition of fiscal quarter ranges */
const { ranges, groups } = defineRange([
	{ key: 'Q1', day: 1, month: 1, year: 0, fiscal: 0, sphere: COMPASS.North },
	{ key: 'Q2', day: 1, month: 4, year: 0, fiscal: 0, sphere: COMPASS.North },
	{ key: 'Q3', day: 1, month: 7, year: 0, fiscal: 0, sphere: COMPASS.North },
	{ key: 'Q4', day: 1, month: 10, year: 0, fiscal: 0, sphere: COMPASS.North },

	{ key: 'Q3', day: 1, month: 1, year: 0, fiscal: 0, sphere: COMPASS.South },
	{ key: 'Q4', day: 1, month: 4, year: 0, fiscal: 0, sphere: COMPASS.South },
	{ key: 'Q1', day: 1, month: 7, year: 0, fiscal: 1, sphere: COMPASS.South },
	{ key: 'Q2', day: 1, month: 10, year: 0, fiscal: 1, sphere: COMPASS.South },
], 'sphere');

export const QuarterTerm = defineTerm({
	key: 'quarter',
	scope: 'quarter',
	description: 'Fiscal Quarter',
	ranges,

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean) {
		const { yy, config: { sphere = '' } } = this;
		const list = (groups[sphere] ?? []).map(r => ({ ...r }));

		list.forEach((itm: any) => {
			if (isDefined(itm.year)) itm.year += yy;
			if (isDefined(itm.fiscal)) itm.fiscal += yy;
		});

		return getTermRange(this, list, keyOnly);								// return the range
	}
});