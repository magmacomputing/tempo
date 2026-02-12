import { ownValues } from '#core/shared/reflection.library.js';
import { isDefined, isReference } from '#core/shared/type.library.js';
import type { Obj, Secure, ValueOf } from '#core/shared/type.library.js';

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
export const getScript = (nbr = 1) => {
	const stackTrace = new Error().stack
		?.match(/([^ \n\(@])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/ig)
		?.[nbr]
	return decodeURI(stackTrace ?? '');												// decodeURI is needed to handle spaces in file-names
}

/**
 * introduce a wait-timer that will Error() on timeOut.  
 * best used with Promise.race([xxx(), sleep()]  
 * @param msg			string to display on a timeout 
 * @param timeOut	how many milliseconds to sleep (default 2-seconds)  
 * @returns				Promise\<void>  
 */
export const sleep = (msg = 'sleep: timed out', timeOut = 2000) =>
	new Promise<Error>((_, reject) => setTimeout(() => reject(new Error(msg)), timeOut));

/** Javascript Runtimes */
export const CONTEXT = {
	'Unknown': 'unknown',
	'Browser': 'browser',
	'NodeJS': 'nodejs',
	'Deno': 'deno',
	'GoogleAppsScript': 'google-apps-script',
} as const
export type CONTEXT = ValueOf<typeof CONTEXT>;
type Context = { global: any, type: CONTEXT }

/** determine JavaScript environment context */
export const getContext = (): Context => {
	const global = globalThis as any;

	if (isDefined(global.SpreadsheetApp))
		return { global, type: CONTEXT.GoogleAppsScript };

	if (isDefined(global.window?.document))
		return { global, type: CONTEXT.Browser };

	if (isDefined(global.process?.versions?.node))
		return { global, type: CONTEXT.NodeJS };

	return { global, type: CONTEXT.Unknown };
}

// useful for those times when a full Enumify object is not needed, but still lock the Object from mutations
/** deep-freeze an Array | Object to make it immutable */
export function secure<const T extends Obj>(obj: T) {
	if (isReference(obj))																			// skip primitive values
		ownValues(obj)																					// retrieve the properties on obj
			.forEach(val => Object.isFrozen(val) || secure(val));	// secure each value, if not already Frozen

	return Object.freeze(obj) as Secure<T>;										// freeze the object itself
}
