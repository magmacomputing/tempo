import { trimAll, toProperCase } from '#library/string.library.js';
import { byKey, byLkp, sortKey } from '#library/array.library.js';
import { asArray } from '#library/coercion.library.js';
// Prototype extensions
// Remember to define any imports as a Function Declaration (not a Function Expression)
// so that they are 'hoisted' prior to extending a prototype
/**
 * extend an Object's prototype to include new method, if no clash
 */
export const patch = (proto, property, method) => {
    if (Object.hasOwn(proto.prototype, property)) { // if already defined,
        if (trimAll(method.toString()) !== trimAll(proto.prototype?.[property]?.toString()))
            console.warn(`${proto.name}.${property} already defined`); // show warning if different method definition
    }
    else {
        Object.defineProperty(proto.prototype, property, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: method,
        });
    }
};
patch(String, 'trimAll', function (pat) { return trimAll(this, pat); });
patch(String, 'toProperCase', function () { return toProperCase(this); });
function sorted(...keys) { return sortKey(this, ...keys); }
patch(Array, 'orderBy', sorted); // order array by named keys
patch(Array, 'sortBy', sorted); // sort array by named keys
function keyed(...keys) { return byKey(this, ...keys); }
function lookup(...keys) { return byLkp(this, ...keys); }
patch(Array, 'keyedBy', keyed); // reduce array by named keys
patch(Array, 'lookupBy', lookup); // reduce array by named keys, only one entry per key
patch(Array, 'tap', function (fn) {
    fn(this); // run an arbitrary function
    return this; // then return the original array
});
patch(Array, 'clear', function () {
    this.fill(null).length = 0; // wipe the contents, then set the 'length' to zero
    return this;
});
patch(Array, 'distinct', function (mapfn) {
    return mapfn
        ? this.map(mapfn).distinct() // run the mapping selector, then recurse
        : Array.from(new Set(this)); // eliminate duplicates
});
patch(Array, 'cartesian', function (...args) {
    const [a, b = [], ...c] = args.length === 0 ? this : args;
    const cartFn = (a, b) => asArray([]).concat(...a.map(d => b.map(e => asArray([]).concat(d, e))));
    return b.length
        ? this.cartesian(cartFn(a, b), ...c) // run the cartFn function, then recurse
        : asArray(a || []); // return the collated result
});
//# sourceMappingURL=prototype.library.js.map