import { ownEntries } from '#core/shared/reflect.library.js';
import { isFunction } from '#core/shared/type.library.js';

/** get a string-array of 'getter' names for a Class */
export const getAccessors = (obj: any = {}) => {
	return ownAccessors(obj, 'get');
}

/** get a string-array of 'setter' names for a Class */
export const setAccessors = (obj: any = {}) => {
	return ownAccessors(obj, 'set');
}

const ownAccessors = (obj: any = {}, type: 'get' | 'set') => {
	const accessors = Object.getOwnPropertyDescriptors(obj.prototype);

	return ownEntries(accessors)
		.filter(([_, descriptor]) => isFunction(descriptor[type]))
		.map(([key, _]) => key)
}

/**
 * prevents instantiation of a class with only static members    
 * eg. class \<MyClass> extends Static
 */
export class Static {
	constructor() {
		throw new TypeError(`${this.constructor.name} is not a constructor`);
	}
}