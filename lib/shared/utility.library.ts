import { asNumber, isNumeric } from '@module/shared/number.library.js';
import { isDefined, isString } from '@module/shared/type.library.js';
import { objectify, stringify } from './serialize.library';

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
export const padString = (str: string | number | bigint, pad = 6) =>
	(isNumeric(str) ? asNumber(str).toFixed(2).toString() : str.toString() ?? '').padStart(pad, '\u007F');

export enum CONTEXT {
	'Unknown' = 'unknown',
	'Browser' = 'browser',
	'NodeJS' = 'nodejs',
	'Deno' = 'deno',
	'GoogleAppsScript' = 'google-apps-script',
}
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

/** get local storage */
export function getStore<T>(key: string, dflt?: T) {
	const context = getContext();
	let store: string | undefined | null;

	switch (context.type) {
		case CONTEXT.Browser:
			store = context.global.localStorage.getItem(key);
			break;

		case CONTEXT.NodeJS:
			store = context.global.process.env[key];
			break;

		case CONTEXT.GoogleAppsScript:
			store = context.global.PropertiesService?.getUserProperties().getProperty(key);
			break;

		default:
			throw new Error(`Cannot determine Javascript context: ${context.type}`)
	}

	return isString(store)
		? objectify<T>(store)																		// rebuild object from its stringified representation
		: dflt
}

/** set / delete local storage */
export function setStore<T>(key: string, val?: T) {
	const context = getContext();
	const stash = val && stringify(val);
	const set = isDefined(stash);

	switch (context.type) {
		case CONTEXT.Browser:
			set
				? context.global.localStorage.setItem(key, stash)
				: context.global.localStorage.removeItem(key);
			break;

		case CONTEXT.NodeJS:
			set
				? (context.global.process.env[key] = stash)
				: (delete context.global.process.env[key])
			break;

		case CONTEXT.GoogleAppsScript:
			set
				? context.global.PropertiesService?.getUserProperties().setProperty(key, stash)
				: context.global.PropertiesService?.getUserProperties().deleteProperty(key)
			break;

		default:
			throw new Error(`Cannot determine Javascript context: ${context.type}`);
	}
}