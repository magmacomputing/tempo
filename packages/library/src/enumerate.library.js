import { __esDecorate, __runInitializers } from "tslib";
import { secure } from '#library/utility.library.js';
import { Serializable } from '#library/class.library.js';
import { stringify } from '#library/serialize.library.js';
import { memoizeMethod } from '#library/function.library.js';
import { ownEntries } from '#library/reflection.library.js';
import { getProxy } from './proxy.library.js';
import { asType, isArray, isNumber } from '#library/type.library.js';
/** used to identify the Enumify type */ const tag = 'Enumify';
/** helper method to create a property descriptor */
function value(val) {
    return {
        enumerable: false,
        configurable: false,
        writable: false,
        value: val
    };
}
/**
 * private instance of the Enum Prototype, which is then Used to create each new Object-Enum
*/
const ENUM = secure(Object.create(null, {
    count: memoizeMethod('count', function () { return this.entries().length; }),
    keys: memoizeMethod('keys', function () { return this.entries().map(([key]) => key); }),
    values: memoizeMethod('values', function () { return this.entries().map(([_, val]) => val); }),
    entries: memoizeMethod('entries', function () { return ownEntries(this, true); }),
    invert: memoizeMethod('invert', function () { return enumify(this.entries().reduce((acc, [key, val]) => ({ ...acc, [val]: key }), {})); }),
    toString: memoizeMethod('toString', function () { return stringify(this.toJSON()); }),
    has: value(function (key) { return this.keys().includes(key); }),
    includes: value(function (search) { return this.values().includes(search); }),
    keyOf: value(function (search) { return this.invert()[search]; }),
    extend: value(function (list) { return enumify.call(this, list); }),
    forEach: value(function (fn, thisArg) { this.entries().forEach((entry, index) => fn.call(thisArg, entry, index, this)); }),
    filter: value(function (fn, thisArg) { return enumify(this.entries().reduce((acc, entry, index) => (fn.call(thisArg, entry, index, this) ? Object.assign(acc, { [entry[0]]: entry[1] }) : acc), {})); }),
    map: value(function (fn, thisArg) { return enumify(this.entries().reduce((acc, entry, index) => { const res = fn.call(thisArg, entry, index, this); return Object.assign(acc, isArray(res) && res.length === 2 ? { [res[0]]: res[1] } : { [entry[0]]: res }); }, {})); }),
    [Symbol.iterator]: value(function () { return this.entries()[Symbol.iterator](); }),
    [Symbol.toStringTag]: value(tag),
}));
export function enumify(list) {
    const proto = this ?? ENUM;
    const arg = asType(list);
    let stash = {};
    switch (arg.type) {
        case 'Enumify':
        case 'Object':
            Object.assign(stash, arg.value);
            break;
        case 'Array':
            arg.value.forEach((key, index) => {
                if (isNumber(key))
                    throw new Error('Enumify: numeric keys are not supported');
                Object.assign(stash, { [key]: index });
            });
            break;
        default:
            throw new Error(`Enumify: invalid argument type: ${arg.type}`);
    }
    const target = Object.create(proto, Object.getOwnPropertyDescriptors(stash));
    return getProxy(target);
}
/** create an entry in the Serialization Registry to describe how to rebuild an Enum */
let Enumify = (() => {
    let _classDecorators = [Serializable];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Enumify = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Enumify = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        constructor(list) {
            return enumify(list);
        }
    };
    return Enumify = _classThis;
})();
export { Enumify };
//# sourceMappingURL=enumerate.library.js.map