import { defineTerm, getTermRange, defineRange, resolveCycleWindow } from '../plugin.util.js';
import { isTempo } from '#tempo/tempo.symbol.js';
import { COMPASS } from '#tempo/tempo.enum.js';
import { type Tempo } from '#tempo/tempo.class.js';
import { isNumber } from '#library/type.library.js';
import { asArray } from '#library';

/** definition of fiscal quarter ranges */
const groups = defineRange([
	{ key: 'Q1', day: 1, month: 1, fiscal: 0, sphere: COMPASS.North },
	{ key: 'Q2', day: 1, month: 4, fiscal: 0, sphere: COMPASS.North },
	{ key: 'Q3', day: 1, month: 7, fiscal: 0, sphere: COMPASS.North },
	{ key: 'Q4', day: 1, month: 10, fiscal: 0, sphere: COMPASS.North },

	{ key: 'Q1', day: 1, month: 7, fiscal: 1, sphere: COMPASS.South },
	{ key: 'Q2', day: 1, month: 10, fiscal: 1, sphere: COMPASS.South },
	{ key: 'Q3', day: 1, month: 1, year: 1, fiscal: 0, sphere: COMPASS.South },
	{ key: 'Q4', day: 1, month: 4, year: 1, fiscal: 0, sphere: COMPASS.South },
], 'sphere');

/** resolve the full candidate list for the current context */
function resolve(t: Tempo, anchor?: any): any[] {
	const source: any = anchor ?? t;
	const sphere = isTempo(source) ? source.config.sphere : (source.sphere ?? t.config.sphere);
	const template = (groups as any)[sphere] ?? [];
	if (template.length === 0) return [];

	const yy = isTempo(source) ? source.yy : (source.year ?? source.yy);
	const list = resolveCycleWindow(t, template, anchor);

	list.forEach(itm => {
		if (isNumber(itm.fiscal)) itm.fiscal += itm.year;
	});

	return list;
}

/**
 * ## QuarterTerm
 */
export const QuarterTerm = defineTerm({
	key: 'qtr',
	scope: 'quarter',
	description: 'Fiscal Quarter',
	groups,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const res = resolve(this, anchor);
		const result = getTermRange(this, asArray(res), keyOnly, anchor) as any;
		if (Array.isArray(result)) {
			console.error(`[DEBUG] QuarterTerm.define(keyOnly=${keyOnly}) returned an ARRAY! Length: ${result.length}`);
		}
		return result;
	}
});
