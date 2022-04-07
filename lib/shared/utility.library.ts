import { isNumeric } from '@module/shared/number.library';

/** General utility functions */

/** memoize repeated lookups */
export const memoize = (fn: Function) => {
	const cache = new Map<string, any>();

	return (...args: unknown[]) => {
		const key = JSON.stringify(args);

		if (!cache.has(key))
			cache.set(key, fn(...args));

		return cache.get(key);
	}
}

/** analyze the Call Stack to determine calling Function's name */
export const getCaller = () => {
	const stackTrace = new Error().stack											// only tested in latest FF and Chrome
		?.split('\n')
		?.map(itm => itm.trim())
		?.filter(itm => !itm.startsWith('Error'))
		?? []

	const callerName = stackTrace[2].split(' ');

	return (callerName[1] === 'new') ? callerName[2] : callerName[1].split('.')[0];
}

/** analyze the Call Stack to determine calling Function's name */
export const getScript = (nbr = 1) =>
	decodeURI(new Error().stack?.match(/([^ \n\(@])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/ig)?.[nbr] ?? '');

	/** pad a string with non-blocking spaces, to help right-align a display */
export const padString = (str: string | number, pad = 6) => (isNumeric(str) ? str.toFixed(2).toString() : str ?? '').padStart(pad, '\u007F');