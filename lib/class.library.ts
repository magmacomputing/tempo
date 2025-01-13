import { isFunction } from '@core/shared/type.library.js';

/** get a string-array of 'getter' names for a Class */
export const getAccessors = <T>(obj: any = {}) => {
	const getters = Object.getOwnPropertyDescriptors(obj.prototype);

	return Object.entries(getters)
		.filter(([_, descriptor]) => isFunction(descriptor.get))
		.map(([key, _]) => key as keyof T)
}
