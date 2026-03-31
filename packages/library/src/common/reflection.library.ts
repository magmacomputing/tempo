import { $Target } from '#library/symbol.library.js';
import { distinct } from '#library/array.library.js';
import { asType, getType, isEmpty, isFunction, isPrimitive } from '#library/type.library.js';
import type { Obj, KeyOf, ValueOf, EntryOf, Primitives } from '#library/type.library.js';

/** mutate Object | Array by excluding values with specified primitive 'types' */
export function exclude<T extends Obj>(obj: T, ...types: (Primitives | Lowercase<Primitives>)[]) {
	const exclusions = distinct(types.map(item => item.toLowerCase())) as typeof types;

	if (obj && typeof obj === 'object') {										// only works on Objects and Arrays
		const keys = [] as KeyOf<T>[];

		(ownEntries(obj) as [KeyOf<T>, Obj][])
			.forEach(([key, value]) => {
				const type = getType(value);

				if (['Object', 'Array'].includes(type))						// recurse into object
					exclude(value, ...exclusions);

				if (isPrimitive(value) && exclusions.includes(type.toLowerCase() as Primitives))
					keys.push(key)
			})

		if (!isEmpty(keys))																		// if any values to be excluded
			omit(obj, ...keys);
	}

	return obj;																							// return Object reference, even though Object has been mutated
}

/** mutate Object | Array reference with properties removed */
export function omit<T extends Obj>(obj: T): T							// TODO: consider including Map and Set objects ??
export function omit<T extends Obj>(obj: T, ...keys: PropertyKey[]): T
export function omit<T extends Obj>(obj: T, ...keys: PropertyKey[]) {
	const { type, value } = asType(obj);

	switch (type) {
		case 'Array':
			if (isEmpty(keys)) {
				value.length = 0;																	// clear Array
				break;
			}
			keys
				.sort()
				.reverse()																					// remove from end-to-start to preserve indexes
				.forEach(key => value.splice(Number(key), 1));			// remove Array index
			break;

		case 'Object':
			(isEmpty(keys) ? ownKeys(value) : keys)							// if no {keys}, assume all ownKeys
				.forEach(key => Reflect.deleteProperty(value, key));
	}

	return value;																						// return Object reference, even though Object has been mutated
}

/** remove all ownKeys from an Object | Array */
export function purge<T extends Obj>(obj: T) {
	return omit(obj);
}

/** reset Object */
export function reset<T extends Obj>(orig: T, obj?: T) {
	return Object.assign(purge(orig), { ...obj });
}

// These functions are to preserve the typescript 'type' of an object's keys & values
// and will include both string and symbol keys

/** array of all enumerable PropertyKeys */
export function ownKeys<T extends Obj>(json: T) {
	return ownEntries(json).map(([key]) => key as KeyOf<T>);
}

/** array of all enumerable object values */
export function ownValues<T extends Obj>(json: T) {
	return ownEntries(json).map(([_, value]) => value as ValueOf<T>);
}

/** tuple of enumerable entries with string | symbol keys */
export function ownEntries<T extends Obj>(json: T, all = false) {
	if (!json || typeof json !== 'object')
		return [] as EntryOf<T>[];

	const getOwn = (obj: any): [PropertyKey, any][] => {			// helper function to get own enumerable properties
		const tgt = obj[$Target] ?? obj;												// unwrap if it's a proxy

		return Reflect.ownKeys(tgt)
			.filter(key => Object.getOwnPropertyDescriptor(tgt, key)?.enumerable)
			.map(key => [key, tgt[key]]);
	}

	if (!all)
		return getOwn(json) as EntryOf<T>[];

	// all=true: collect per-level bottom-up, reverse to top-down, dedup via Map
	// Map preserves first-insertion position but allows value update (own key shadows ancestor)
	const levels: [PropertyKey, any][][] = [];
	const limit = 50;																				// prevent infinite loops (increased from 10)
	let depth = 0;
	let proto: any = json;

	do {
		const t = proto[$Target] ?? proto;											// CRITICAL: unwrap before checking marker to avoid trap recursion

		const lvl = getOwn(proto);
		if (lvl.length) levels.push(lvl);

		proto = Object.getPrototypeOf(t);
	} while (proto && proto !== Object.prototype && ++depth < limit);

	return [...new Map(levels.reverse().flat()).entries()] as EntryOf<T>[];
}

/** return an Object containing all 'own' and 'inherited' enumerable properties */
export function allObject<T extends Obj>(json: T) {
	return Object.fromEntries(ownEntries(json, true));
}

/** create a new object and shadow-copy all own-descriptors from the source */
export const allDescriptors = <T extends object>(source: T) => {
	return Object.defineProperties({}, Object.getOwnPropertyDescriptors(source)) as T;
}

/** get a string-array of 'getter' names for an object */
export const getAccessors = (obj: any = {}) => {
	return ownAccessors(obj, 'get');
}

/** get a string-array of 'setter' names for an object */
export const setAccessors = (obj: any = {}) => {
	return ownAccessors(obj, 'set');
}

const ownAccessors = (obj: any = {}, type: 'get' | 'set') => {
	const accessors = Object.getOwnPropertyDescriptors(obj.prototype || Object.getPrototypeOf(obj));

	return ownEntries(accessors)
		.filter(([_, descriptor]) => isFunction(descriptor[type]))
		.map(([key, _]) => key)
}