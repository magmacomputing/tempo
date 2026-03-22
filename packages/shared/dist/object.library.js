import { ownKeys, ownEntries } from '#core/shared/reflection.library.js';
import { isObject, isArray, isReference, isFunction, isDefined, isEmpty, isNullish } from '#core/shared/type.library.js';
/** Get nested value */
export function extract(obj, path, dflt) {
    if (isEmpty(path))
        return obj; // finished searching
    if (!isObject(obj) && !isArray(obj))
        return obj;
    return path
        .toString()
        .replace(/\[([^\[\]]*)\]/g, '.$1.') // convert [indexes] to properties
        .split('.')
        .filter(field => !isEmpty(field)) // remove empty fields
        .reduce((acc, field) => acc?.[field] ?? null, obj) ?? dflt;
}
/** remove quotes around property names */
export const unQuoteObj = (obj) => {
    return JSON.stringify(obj)
        ?.replace(/"([^"]+)":/g, '$1: ')
        ?.replace(/,/g, ', ');
};
/** copy enumerable properties to a new Object */
export const asObject = (obj) => {
    if (isNullish(obj) || !isObject(obj))
        return obj;
    const temp = isArray(obj) ? [] : {};
    ownKeys(obj)
        .forEach(key => temp[key] = asObject(obj[key]));
    return temp;
};
/** deep-compare object values for equality */
export const isEqual = (obj1 = {}, obj2 = {}) => {
    const keys = new Set(); // union of unique keys from both Objects
    const keys1 = isFunction(obj1.keys) ? Array.from(obj1.keys()) : ownKeys(obj1);
    const keys2 = isFunction(obj2.keys) ? Array.from(obj2.keys()) : ownKeys(obj2);
    keys1.forEach(key => keys.add(key));
    keys2.forEach(key => keys.add(key));
    return [...keys] // cast as Array
        .every(key => {
        const val1 = obj1[key];
        const val2 = obj2[key];
        return isReference(val1) && isReference(val2)
            ? isEqual(val1, val2) // recurse into object
            : val1 === val2;
    });
};
/** find all methods on an Object */
export const getMethods = (obj, all = false) => {
    const properties = new Set();
    let currentObj = obj;
    do {
        Object
            .getOwnPropertyNames(currentObj)
            .map(key => properties.add(key));
    } while (all && (currentObj = Object.getPrototypeOf(currentObj)));
    return [...properties.keys()]
        .filter(key => isFunction(obj[key]));
};
/** extract only defined values from Object */
export function ifDefined(obj) {
    return ownEntries(obj)
        .reduce((acc, [key, val]) => {
        if (isDefined(val))
            acc[key] = val;
        return acc;
    }, {});
}
/** extract a subset of keys from an object */
export const pick = (obj, ...keys) => {
    const ownKeys = Object.getOwnPropertyNames(obj);
    return keys.reduce((acc, key) => {
        if (ownKeys.includes(key))
            acc[key] = obj[key];
        return acc;
    }, {});
};
/** extract a named key from an array of objects */
export const pluck = (objs, key) => objs.map(obj => obj[key]);
/** extend an object with the properties of another */
export const extend = (obj, ...objs) => Object.assign(obj, ...objs);
export const countProperties = (obj = {}) => ownKeys(obj).length;
export function looseIndex(arg) {
    if (isDefined(arg))
        return isFunction(arg) ? arg() : arg;
    return (obj) => isFunction(obj) ? obj() : obj;
}
/** loose object with symbols values */
looseIndex.stringSymbol = looseIndex();
/** loose object with symbol keys and RegExp values */
looseIndex.symbolRegExp = looseIndex();
/** loose object with symbol keys and string values */
looseIndex.symbolString = looseIndex();
/** loose object with string keys and string values */
looseIndex.stringString = looseIndex();
//# sourceMappingURL=object.library.js.map