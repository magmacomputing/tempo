import { secure } from './utility.library.js';
import { isUndefined } from './type.library.js';
/** curry a Function to allow partial calls */
export function curry(fn) {
    return function curried(...args) {
        return (args.length >= fn.length)
            ? fn(...args)
            : (...nextArgs) => curried(...args, ...nextArgs);
    };
}
/** generic function to memoize repeated function calls */
export function memoizeFunction(fn) {
    const cache = new Map(); // using a Map for better key handling than plain objects
    return function (...args) {
        const key = JSON.stringify(args); // create a unique key from arguments
        console.log('memoize: ', key);
        if (!cache.has(key)) {
            // @ts-ignore
            const result = fn.apply(this, args); // call the original function with the correct context
            console.log('set: ', result);
            cache.set(key, Object.freeze(result)); // stash the result for subsequent calls
        }
        else
            console.log('get: ', cache.get(key));
        return cache.get(key);
    };
}
const wm = new WeakMap();
/** manually clear the memoization cache for an object */
export function clearCache(obj) {
    wm.delete(obj);
}
/** define a Descriptor for an Object's memoized-method */
export function memoizeMethod(name, fn) {
    return {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (...args) {
            const key = `${String(name)},${JSON.stringify(args)}`;
            let cache = wm.get(this);
            if (!cache) { // add a new object into the WeakMap
                cache = Object.create(null);
                wm.set(this, cache);
            }
            if (isUndefined(cache[key])) { // first time for this method
                cache[key] = fn.apply(this, args); // evaluate the method
                secure(cache[key]); // freeze the returned value
            }
            return cache[key];
        }
    };
}
//# sourceMappingURL=function.library.js.map