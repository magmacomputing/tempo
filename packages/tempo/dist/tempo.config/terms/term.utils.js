import { isDefined } from '#core/shared/type.library.js';
const SCHEMA = [
    ['year', 'yy'],
    ['month', 'mm'],
    ['day', 'dd'],
    ['hour', 'hh'],
    ['minute', 'mi'],
    ['second', 'ss'],
    ['millisecond', 'ms'],
    ['microsecond', 'us'],
    ['nanosecond', 'ns']
];
/**
 * find where a Tempo fits within a range of DateTime
 */
export function getTermRange(tempo, list, keyOnly = true) {
    const sorted = [...list]
        .sortBy('year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond')
        .toReversed();
    const match = sorted
        .find(range => {
        for (const [rKey, sKey] of SCHEMA) {
            const val = range[rKey];
            if (isDefined(val)) {
                const sVal = tempo[sKey];
                if (sVal > val)
                    return true;
                if (sVal < val)
                    return false;
            }
        }
        return true; // fallback if DateTime exactly matches a range criteria
    })
        ?? sorted.at(0); // fallback to wraparound at first item
    return keyOnly
        ? match?.key
        : match;
}
//# sourceMappingURL=term.utils.js.map