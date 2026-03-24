import { $Target, allObject } from './reflection.library.js';
import { secure } from './utility.library.js';
import { isFunction } from './type.library.js';
/** Node.js custom inspection symbol */
const $Inspect = Symbol.for('nodejs.util.inspect.custom');
/** Stealth Proxy pattern to allow for iteration and logging over a Frozen object */
export function getProxy(target) {
    secure(target);
    const tgt = target[$Target] ?? target;
    let cachedJSON;
    return new Proxy(target, {
        isExtensible: (t) => Reflect.isExtensible(t),
        preventExtensions: (t) => Reflect.preventExtensions(t),
        getOwnPropertyDescriptor: (_, key) => Reflect.getOwnPropertyDescriptor(tgt, key),
        getPrototypeOf: () => Reflect.getPrototypeOf(tgt),
        deleteProperty: (_, key) => Reflect.deleteProperty(tgt, key),
        ownKeys: () => Reflect.ownKeys(tgt),
        has: (_, key) => Reflect.has(tgt, key),
        set: (_, key, val) => Reflect.set(tgt, key, val),
        get: (_, key, receiver) => {
            if (key === $Target)
                return tgt; // found the 'stop' marker
            if (key === $Inspect || key === 'toJSON') { // two special properties require virtual closures
                const own = Object.getOwnPropertyDescriptor(tgt, key);
                if (own && isFunction(own.value)) // if object already has its own toJSON, return
                    return own.value;
                if (!cachedJSON) { // otherwise, create a virtual closure
                    const result = allObject(receiver); // resolve full-object representation
                    cachedJSON = () => result; // memoize for subsequent calls
                }
                return cachedJSON; // return the memoized closure
            }
            const val = Reflect.get(tgt, key, receiver);
            return (typeof val === 'function') // if the value is a function
                ? val.bind(tgt) // bind it to the target
                : val; // else return the value
        },
    });
}
//# sourceMappingURL=proxy.library.js.map