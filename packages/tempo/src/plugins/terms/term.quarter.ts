import { defineTerm, getTermRange, type Range } from '#tempo/plugins/tempo.plugin.js';
import { cloneify } from '#library/serialize.library.js';
import { COMPASS } from '#tempo/tempo.enum.js';
import type { Tempo } from '#tempo/tempo.class.js';

/** definition of fiscal quarter ranges */
const ranges = [
	[																													// [0] = northern hemisphere
		{ key: 'Q1', day: 1, month: 1, fiscal: 0, sphere: COMPASS.North },
		{ key: 'Q2', day: 1, month: 4, fiscal: 0, sphere: COMPASS.North },
		{ key: 'Q3', day: 1, month: 7, fiscal: 0, sphere: COMPASS.North },
		{ key: 'Q4', day: 1, month: 10, fiscal: 0, sphere: COMPASS.North },
	], [																											// [1] = southern hemisphere
		{ key: 'Q1', day: 1, month: 7, fiscal: 1, sphere: COMPASS.South },
		{ key: 'Q2', day: 1, month: 10, fiscal: 1, sphere: COMPASS.South },
		{ key: 'Q3', day: 1, month: 1, fiscal: 0, sphere: COMPASS.South },
		{ key: 'Q4', day: 1, month: 4, fiscal: 0, sphere: COMPASS.South },
	]
] as Range[][]

export const QuarterTerm = defineTerm({
	key: 'qtr',
	scope: 'quarter',
	description: 'Fiscal Quarter',

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean) {
		const { yy, config: { sphere } } = this;
		const south = sphere !== COMPASS.North;									// false = North, true = South
		const list = cloneify(ranges[+south]);									// deep clone the range

		list.forEach(itm => itm.fiscal += yy);									// calc the fiscal-year for quarter

		return getTermRange(this, list, keyOnly);								// return the range
	}
});