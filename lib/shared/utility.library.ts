import { isNumeric } from '@module/shared/number.library';
import { isDefined } from '@module/shared/type.library';

/** General utility functions */

/** memoize repeated lookups */
export const memoize = <F extends (...args: any) => any>(fn: F) => {
	const cache = new Map<string, ReturnType<F>>();

	return (...args: unknown[]) => {
		const key = JSON.stringify(args);

		if (!cache.has(key))
			cache.set(key, fn(...args));

		return cache.get(key) as ReturnType<F>;
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

export enum CONTEXT {
	'Unknown' = 'unknown',
	'Browser' = 'browser',
	'NodeJS' = 'nodejs',
	'GoogleAppsScript' = 'google-apps-script',
}
/** determine Javascript environment context */
export const getContext = () => {
	const global = globalThis as any;

	if (isDefined(global.window?.SpreadsheetApp))
		return { global, type: CONTEXT.GoogleAppsScript };

	if (isDefined(global.window?.document))
		return { global, type: CONTEXT.Browser };

	if (isDefined(global.process?.versions.node))
		return { global, type: CONTEXT.NodeJS };

	return { global, type: CONTEXT.Unknown };
}
