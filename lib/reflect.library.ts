import { isArray } from '@module/shared/type.library.js';

/** omit top-level keys from an Object */
export function omit<T extends {}>(obj: T, ...keys: (keyof T)[]) {
  keys.forEach(key => Reflect.deleteProperty(obj, key));

  return obj;																								// return Object reference, even though Object has been mutated
}

/** mutate Object | Array reference with all ownKeys removed */
export function purge<T extends {}>(obj: T) {
  Reflect.ownKeys(obj)
    .forEach(key => Reflect.deleteProperty(obj, key));

  if (isArray(obj))
    Reflect.set(obj, 'length', 0);													// explicit set length

  return obj;																								// return Object reference, even though Object has been mutated
}

/** collect string | number | symbol key'd objects */
export function allEntries<T>(json: Record<string | number | symbol, T>) {
  return Reflect.ownKeys(json)															// Object.entries() would discard symbol-keys
    .map(key => [key, json[key]] as [string | symbol, T])
}
