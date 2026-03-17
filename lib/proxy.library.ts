import { $Target, allEntries } from '#core/shared/reflection.library.js';
import { isFunction } from '#core/shared/type.library.js';

/** Node.js custom inspection symbol */
const $Inspect = Symbol.for('nodejs.util.inspect.custom');

/** Stealth Proxy pattern to allow for iteration and logging */
export function getProxy<T extends object>(target: T) {
  let cachedJSON: any;

  return new Proxy(target, {
    get: (obj, key, receiver) => {
      if (key === $Target)
        return target;                                      // found the 'stop' marker

      if (key === $Inspect || key === 'toJSON') {           // two special properties require virtual closures
        const val = Reflect.get(obj, key, receiver);
        if (isFunction(val) && !(val as any).$isVirtual)    // if object already has its own toJSON, return
          return val;

        if (!cachedJSON) {                                  // otherwise, create a virtual closure
          cachedJSON = () => allEntries(receiver, true);    // Object.fromEntries(ownEntries(receiver, true, true));
          cachedJSON.$isVirtual = true;                     // and mark it as virtual
        }

        return cachedJSON;                                  // return the virtual closure back to the caller
      }

      return Reflect.get(obj, key, receiver);               // pass through all other properties
    }
  }) as T;
}
