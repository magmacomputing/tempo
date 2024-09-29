import { isArray, isEmpty } from '@module/shared/type.library.js';
import { clone } from '@module/shared/serialize.library.js';

/** exclude top-level keys from a copy of an Object */
export function exclude<T extends {}>(obj: T, ...keys: (keyof T)[]) {
  return omit(clone(obj), ...keys);                        // exlude properties from clone of object
}

/** mutate Object | Array reference with properties removed */
export function omit<T extends {}>(obj: T): T
export function omit<T extends {}>(obj: T, ...keys: (keyof T)[]): T
export function omit<T extends {}>(obj: T, ...keys: (keyof T)[]) {
  (isEmpty(keys) ? Reflect.ownKeys(obj) : keys)             // if no {keys}, assume all ownKeys
    .forEach(key => Reflect.deleteProperty(obj, key));

  if (isArray(obj) && isEmpty(keys))
    Reflect.set(obj, 'length', 0);													// explicit correct the length

  return obj;																								// return Object reference, even though Object has been mutated
}

/** remove all ownKeys from an Object | Array */
export function purge<T extends {}>(obj: T) {
  return omit(obj);
}

/** collect string | number | symbol key'd objects */
export function allEntries<T extends {}>(json: T) {
  return allKeys<T>(json)                                   // Object.entries() would discard symbol-keys
    .map(key => [key, json[key]] as [keyof T, T[keyof T]])  // cast as tuple
}

/** collect string | number | symbol object keys */
export function allKeys<T extends object>(json: T) {
  return Reflect.ownKeys(json) as (keyof T)[]               // Object.keys()
}
