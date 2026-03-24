import { asType, getType, isEmpty, isFunction, isPrimitive } from './type.library.js';
/** property marker used to unwrap proxies in ownEntries() */
export const $Target = Symbol.for('$Target');
/** mutate Object | Array by excluding values with specified primitive 'types' */
export function exclude(obj, ...types) {
    const exclusions = types
        .map(item => item.toLowerCase()) // cast Primitives
        .distinct();
    if (obj && typeof obj === 'object') { // only works on Objects and Arrays
        const keys = [];
        ownEntries(obj)
            .forEach(([key, value]) => {
            const type = getType(value);
            if (['Object', 'Array'].includes(type)) // recurse into object
                exclude(value, ...exclusions);
            if (isPrimitive(value) && exclusions.includes(type.toLowerCase()))
                keys.push(key);
        });
        if (!isEmpty(keys)) // if any values to be excluded
            omit(obj, ...keys);
    }
    return obj; // return Object reference, even though Object has been mutated
}
export function omit(obj, ...keys) {
    const { type, value } = asType(obj);
    switch (type) {
        case 'Array':
            if (isEmpty(keys)) {
                value.length = 0; // clear Array
                break;
            }
            keys
                .sort()
                .reverse() // remove from end-to-start to preserve indexes
                .forEach(key => value.splice(Number(key), 1)); // remove Array index
            break;
        case 'Object':
            (isEmpty(keys) ? ownKeys(value) : keys) // if no {keys}, assume all ownKeys
                .forEach(key => Reflect.deleteProperty(value, key));
    }
    return value; // return Object reference, even though Object has been mutated
}
/** remove all ownKeys from an Object | Array */
export function purge(obj) {
    return omit(obj);
}
/** reset Object */
export function reset(orig, obj) {
    return Object.assign(purge(orig), { ...obj });
}
// These functions are to preserve the typescript 'type' of an object's keys & values
// and will include both string and symbol keys
/** array of all enumerable PropertyKeys */
export function ownKeys(json) {
    return ownEntries(json).map(([key]) => key);
}
/** array of all enumerable object values */
export function ownValues(json) {
    return ownEntries(json).map(([_, value]) => value);
}
/** tuple of enumerable entries with string | symbol keys */
export function ownEntries(json, all = false) {
    if (!json || typeof json !== 'object')
        return [];
    const getOwn = (obj) => {
        const tgt = obj[$Target] ?? obj; // unwrap if it's a proxy
        return Reflect.ownKeys(tgt)
            .filter(key => Object.getOwnPropertyDescriptor(tgt, key)?.enumerable)
            .map(key => [key, tgt[key]]);
    };
    if (!all)
        return getOwn(json);
    // all=true: collect per-level bottom-up, reverse to top-down, dedup via Map
    // Map preserves first-insertion position but allows value update (own key shadows ancestor)
    const levels = [];
    const limit = 50; // prevent infinite loops (increased from 10)
    let depth = 0;
    let proto = json;
    do {
        const t = proto[$Target] ?? proto; // CRITICAL: unwrap before checking marker to avoid trap recursion
        const lvl = getOwn(proto);
        if (lvl.length)
            levels.push(lvl);
        proto = Object.getPrototypeOf(t);
    } while (proto && proto !== Object.prototype && ++depth < limit);
    return [...new Map(levels.reverse().flat()).entries()];
}
/** return an Object containing all 'own' and 'inherited' enumerable properties */
export function allObject(json) {
    return Object.fromEntries(ownEntries(json, true));
}
/** get a string-array of 'getter' names for an object */
export const getAccessors = (obj = {}) => {
    return ownAccessors(obj, 'get');
};
/** get a string-array of 'setter' names for an object */
export const setAccessors = (obj = {}) => {
    return ownAccessors(obj, 'set');
};
const ownAccessors = (obj = {}, type) => {
    const accessors = Object.getOwnPropertyDescriptors(obj.prototype || Object.getPrototypeOf(obj));
    return ownEntries(accessors)
        .filter(([_, descriptor]) => isFunction(descriptor[type]))
        .map(([key, _]) => key);
};
/** copy all Own properties (including getters / setters) to a new object */
export const copyObject = (target, source) => {
    return Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
};
//# sourceMappingURL=reflection.library.js.map