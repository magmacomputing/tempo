import { asString } from '#core/shared/coercion.library.js';
import { extract } from '#core/shared/object.library.js';
import { ownEntries } from '#core/shared/reflection.library.js';
import { stringify } from '#core/shared/serialize.library.js';
import { isNumber, isDate, isTempo, isObject, isDefined, isUndefined, isFunction, nullToValue } from '#core/shared/type.library.js';
// adapted from https://jsbin.com/insert/4/edit?js,output
/** insert a value into an Array by its sorted position */
export const sortInsert = (arr = [], val, key) => {
    const obj = isObject(val) && isDefined(key); // array of Objects
    let low = 0, high = arr.length;
    while (low < high) {
        const mid = (low + high) >>> 1; // divide by 2
        const source = obj
            ? arr[mid][key] // array of Object values
            : arr[mid]; // assume Primitive values
        const target = obj
            ? val[key]
            : val;
        if (source < target)
            low = mid + 1;
        else
            high = mid;
    }
    arr.splice(low, 0, val); // mutate original Array
    return arr;
};
/** provide a sort-function to order a set of keys */
export function sortBy(...keys) {
    const sortOptions = keys // coerce string => SortBy
        .flat() // flatten Array-of-Array
        .map(key => isObject(key) ? key : { field: stringify(key) }); // build Array of sort-options
    return (left, right) => {
        let result = 0; // 0 = same, -1 = left<right, +1 = left>right
        sortOptions.forEach(key => {
            if (result === 0) { // no need to look further if result !== 0
                const dir = key.dir === 'desc' ? -1 : 1;
                const field = key.field + (key.index ? `[${key.index}]` : '');
                const valueA = extract(left, field, nullToValue(key.default, 0));
                const valueB = extract(right, field, nullToValue(key.default, 0));
                switch (true) {
                    case isNumber(valueA) && isNumber(valueB):
                    case isDate(valueA) && isDate(valueB):
                    case isTempo(valueA) && isTempo(valueB):
                        result = dir * (valueA - valueB);
                        break;
                    default:
                        result = dir * asString(valueA)?.localeCompare(asString(valueB));
                        break;
                }
            }
        });
        return result;
    };
}
/** return an array sorted-by a series of keys */
export function sortKey(array, ...keys) {
    return array.sort(sortBy(...keys));
}
export function byKey(arr, fnKey, ...keys) {
    if (isFunction(fnKey))
        return Object.groupBy(arr, fnKey);
    const keyed = [fnKey] // mapFn is a keyof T
        .concat(keys) // append any trailing keyof T[]
        .flat(); // flatten Array-of-Array
    return Object.groupBy(arr, itm => // group an array into an object with named keys
     keyed
        .map(key => isUndefined(itm[key]) ? '' : stringify(itm[key]))
        .join('.'));
}
export function byLkp(arr, fnKey, ...keys) {
    const group = isFunction(fnKey)
        ? byKey(arr, fnKey) // group by the callback function
        : byKey(arr, fnKey, ...keys); // group by the list of keys
    return ownEntries(group)
        .reduce((acc, [key, grp]) => Object.assign(acc, { [key]: grp?.pop() }), {});
}
//# sourceMappingURL=array.library.js.map