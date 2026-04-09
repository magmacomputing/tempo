import { defineTerm, getTermRange, defineRange } from '../plugin.util.js';
import type { Tempo } from '#tempo/tempo.class.js';

/** definition of daily time periods */
const groups = defineRange([
	{ key: 'midnight', hour: 0, group: 'standard' },
	{ key: 'early', hour: 4, group: 'standard' },
	{ key: 'morning', hour: 8, group: 'standard' },
	{ key: 'midmorning', hour: 10, group: 'standard' },
	{ key: 'midday', hour: 12, group: 'standard' },
	{ key: 'afternoon', hour: 15, minute: 30, group: 'standard' },
	{ key: 'evening', hour: 18, group: 'standard' },
	{ key: 'night', hour: 20, group: 'standard' },
], 'group');

function resolve(t: Tempo, anchor?: any) {
	const template = groups["standard"] ?? [];

	return template;
}

export const TimelineTerm = defineTerm({
	key: 'per',
	scope: 'period',
	description: 'Daily time period',
	groups,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		return getTermRange(this, groups['standard'], keyOnly, anchor);
	}
});
