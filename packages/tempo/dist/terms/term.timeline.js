import { getTermRange } from './term.utils.js';
/** definition of daily time periods */
const ranges = [
    { key: 'midnight', hour: 0 },
    { key: 'early', hour: 4 },
    { key: 'morning', hour: 8 },
    { key: 'midmorning', hour: 10 },
    { key: 'midday', hour: 12 },
    { key: 'afternoon', hour: 15, minute: 30 },
    { key: 'evening', hour: 18 },
    { key: 'night', hour: 20 },
];
export const key = 'per';
export const scope = 'period';
export const description = 'Daily time period';
/** determine where the current Tempo instance fits within the above range */
export function define(keyOnly) {
    return getTermRange(this, ranges, keyOnly);
}
//# sourceMappingURL=term.timeline.js.map