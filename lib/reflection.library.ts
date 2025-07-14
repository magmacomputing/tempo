import { clone } from '#core/shared/serialize.library.js';
import { isArray, isObject, isEmpty } from '#core/shared/type.library.js';
import type { Property, KeyOf, ValueOf, Secure } from '#core/shared/type.library.js';

type Obj = Property<any> | any[]

/** exclude top-level keys from a copy of an Object */
export function exclude<T extends Obj>(obj: T, ...keys: (keyof T)[]) {
	return omit(clone(obj), ...keys);                        // exclude properties from clone of object
}

/** mutate Object | Array reference with properties removed */
export function omit<T extends Obj>(obj: T): T
export function omit<T extends Obj>(obj: T, ...keys: (keyof T)[]): T
export function omit<T extends Obj>(obj: T, ...keys: (keyof T)[]) {
	(isEmpty(keys) ? ownKeys(obj) : keys)                     // if no {keys}, assume all ownKeys
		.forEach(key => Reflect.deleteProperty(obj, key));

	if (isArray(obj) && isEmpty(keys))
		Reflect.set(obj, 'length', 0);													// explicit correct the length

	return obj;																								// return Object reference, even though Object has been mutated
}

/** remove all ownKeys from an Object | Array */
export function purge<T extends Obj>(obj: T) {
	return omit(obj);
}

// These functions are to preserve the typescript 'type' of an object's keys & values
// and will include string | symbol keys

/** array of PropertyKeys as string | symbol */
export function ownKeys<T extends Obj>(json: T) {
	return Reflect.ownKeys(json) as KeyOf<T>[]                // Object.keys() would discard symbol-keys
}

/** array of object values */
export function ownValues<T extends Obj>(json: T) {
	return ownKeys(json)                                      // Object.values() would discard symbol-keys
		.map(key => json[key] as ValueOf<T>)
}

/** tuple of object entries with string | symbol keys */
export function ownEntries<T extends Obj>(json: T) {
	return ownKeys(json)                                      // Object.entries() would discard symbol-keys
		.map(key => [key, json[key]] as [KeyOf<T>, ValueOf<T>]) // cast as tuple
}

/** deep-freeze an <object | array> to make it immutable */
export function secure<T>(obj: T) {
	if (!isObject(obj) && !isArray(obj))											// only works on objects or arrays at this time			
		return obj as Secure<T>

	ownValues(obj)																						// retrieve the properties on obj
		.forEach(val => Object.isFrozen(val) || secure(val));		// secure each value, if not already Frozen

	return Object.freeze(obj) as Secure<T>;										// freeze the object itself
}