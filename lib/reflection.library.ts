import { asType, getType, isEmpty, isFunction, isPrimitive, isReference, isType } from '#core/shared/type.library.js';
import type { Obj, ValueOf, EntryOf, Primitives } from '#core/shared/type.library.js';

/** mutate Object | Array by excluding values with specified primitive 'types' */
export function exclude<T extends Obj>(obj: T, ...types: (Primitives | Lowercase<Primitives>)[]) {
	const exclusions = types
		.map(item => item.toLowerCase())												// cast Primitives as Lowercase<Primitives> to aid in matching
		.distinct() as typeof types

	if (isType(obj, 'Object', 'Array')) {											// only works on Objects and Arrays
		const keys = [] as (keyof T)[];

		(ownEntries(obj) as [keyof T, Obj][])
			.forEach(([key, value]) => {
				const type = getType(value);

				if (['Object', 'Array'].includes(type))							// recurse into object
					exclude(value, ...exclusions);

				if (isPrimitive(value) && exclusions.includes(type.toLowerCase() as Primitives))
					keys.push(key)
			})

		if (!isEmpty(keys))																			// if any values to be excluded
			omit(obj, ...keys);
	}

	return obj;																								// return Object reference, even though Object has been mutated
}

/** mutate Object | Array reference with properties removed */
export function omit<T extends Obj>(obj: T): T							// TODO: consider including Map and Set objects ??
export function omit<T extends Obj>(obj: T, ...keys: (keyof T)[]): T
export function omit<T extends Obj>(obj: T, ...keys: (keyof T)[]) {
	const { type, value } = asType(obj);

	switch (type) {
		case 'Array':
			if (isEmpty(keys)) {
				value.truncate();																		// clear entire Array
				break;
			}
			keys
				.sort()
				.reverse()																					// remove from end-to-start to preserve indexes
				.forEach(key => value.splice(Number(key), 1));			// remove Array index
			break;

		case 'Object':
			(isEmpty(keys) ? ownKeys(value) : keys)								// if no {keys}, assume all ownKeys
				.forEach(key => Reflect.deleteProperty(value, key));
	}

	return value;																							// return Object reference, even though Object has been mutated
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
	return ownEntries(json).map(([key]) => key as keyof T);
}

/** array of all enumerable object values */
export function ownValues<T extends Obj>(json: T) {
	return ownEntries(json).map(([_, value]) => value as ValueOf<T>);
}

/** tuple of enumerable entries with string | symbol keys */
export function ownEntries<T extends Obj>(json: T) {
	return (Reflect.ownKeys(json) as (keyof T)[])							// get all Own keys
		.map(name => [name, Reflect.getOwnPropertyDescriptor(json, name)] as [keyof T, PropertyDescriptor])
		.filter(([_, prop]) => prop.enumerable)									// with enumerable property
		.map(([name, prop]) => [name, prop.value] as EntryOf<T>)// cast as array of [key, value] tuples
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

/** copy all Own properties (including getters / setters) to a new object */
export const copyObject = <T extends Obj>(target: T, source: T) => {
	return Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) as T;
}