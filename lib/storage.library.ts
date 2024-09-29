import { objectify, stringify } from '@module/shared/serialize.library.js';
import { CONTEXT, getContext } from '@module/shared/utility.library.js';
import { isDefined, isString } from '@module/shared/type.library.js';

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
	const stash = isDefined(val) ? stringify(val) : void 0;
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