import { cloneify } from '#core/shared/serialize.library.js';
import { COMPASS } from '#core/tempo.config/tempo.enum.js';
import { getTermRange } from './term.utils.js';
/** definition of meteorological season ranges */
const ranges = [
    [
        { key: 'Spring', day: 20, month: 3, symbol: 'Flower', sphere: COMPASS.North },
        { key: 'Summer', day: 21, month: 6, symbol: 'Sun', sphere: COMPASS.North },
        { key: 'Autumn', day: 23, month: 9, symbol: 'Leaf', sphere: COMPASS.North },
        { key: 'Winter', day: 22, month: 12, symbol: 'Snowflake', sphere: COMPASS.North },
    ], [
        { key: 'Spring', day: 1, month: 9, symbol: 'Flower', sphere: COMPASS.South },
        { key: 'Summer', day: 1, month: 12, symbol: 'Sun', sphere: COMPASS.South },
        { key: 'Autumn', day: 1, month: 3, symbol: 'Leaf', sphere: COMPASS.South },
        { key: 'Winter', day: 1, month: 6, symbol: 'Snowflake', sphere: COMPASS.South },
    ], [
        { key: 'Spring', day: 1, month: 3, symbol: 'Flower', trait: 'A time of renewal and growth' },
        { key: 'Summer', day: 1, month: 6, symbol: 'Sun', trait: 'A period of heat and fruition' },
        { key: 'Autumn', day: 1, month: 9, symbol: 'Leaf', trait: 'A time for harvest and contraction' },
        { key: 'Winter', day: 1, month: 12, symbol: 'Snowflake', trait: 'A period of stillness and consolidation' },
    ]
];
export const key = 'szn';
export const scope = 'season';
export const description = 'Meteorlogical season';
/** determine where the current Tempo instance fits within the above range */
export function define(keyOnly) {
    const { config: { sphere } } = this;
    const south = sphere !== COMPASS.North; // false = North, true = South
    const list = cloneify(ranges[+south]);
    if (!keyOnly) {
        const cn = getTermRange(this, ranges[2], false); // get the chinese season for the current day/month
        list.forEach(item => item['CN'] = cn); // add the chinese season to each range item
    }
    return getTermRange(this, list, keyOnly);
}
//# sourceMappingURL=term.season.js.map