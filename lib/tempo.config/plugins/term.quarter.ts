import { cloneify } from '#core/shared/serialize.library.js';
import { COMPASS } from '#core/shared/tempo.config/tempo.enum.js';
import { getTermRange, type Range } from '#core/shared/tempo.config/plugins/term.utils.js';
import type { Tempo } from '#core/shared/tempo.class.js';

/** definition of fiscal quarter ranges */
const ranges = [
	[																													// [0] = northern hemisphere
		{ key: 'Q1', day: 1, month: 1, fiscal: 0 },
		{ key: 'Q2', day: 1, month: 4, fiscal: 0 },
		{ key: 'Q3', day: 1, month: 7, fiscal: 0 },
		{ key: 'Q4', day: 1, month: 10, fiscal: 0 },
	], [																											// [1] = southern hemisphere
		{ key: 'Q1', day: 1, month: 7, fiscal: 1 },
		{ key: 'Q2', day: 1, month: 10, fiscal: 1 },
		{ key: 'Q3', day: 1, month: 1, fiscal: 0 },
		{ key: 'Q4', day: 1, month: 4, fiscal: 0 },
	]
] as Range[][]

export const key = 'qtr';
export const scope = 'quarter';
export const description = 'Fiscal Quarter';

/** determine where the current Tempo instance fits within the above range */
export function define(this: Tempo, key?: boolean) {
	const { yy, config: { sphere } } = this;
	const south = sphere !== COMPASS.North;										// false = North, true = South
	const list = cloneify(ranges[+south]);										// deep clone the range

	list.forEach(itm => itm.fiscal += yy);										// calc the fiscal-year for quarter

	return getTermRange(this, list, key);
}
