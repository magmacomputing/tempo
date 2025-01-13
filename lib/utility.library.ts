import { isDefined } from '@core/shared/type.library.js';

/** General utility functions */

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

/**
 * introduce a wait-timer that will Error() on timeOut.  
 * best used with Promise.race([xxx(), sleep()]  
 * @param msg			string to display on a timeout 
 * @param timeOut	how many milliseconds to sleep (default 2-seconds)  
 * @returns Promise\<void>  
 */
export const sleep = (msg = 'sleep: timed out', timeOut = 2000) =>
	new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), timeOut));

export const CONTEXT = {
	'Unknown': 'unknown',
	'Browser': 'browser',
	'NodeJS': 'nodejs',
	'Deno': 'deno',
	'GoogleAppsScript': 'google-apps-script',
} as const
/** determine JavaScript environment context */
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