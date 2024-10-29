import { objectify, stringify } from '@module/shared/serialize.library.js';
import { CONTEXT, getContext } from '@module/shared/utility.library.js';
import { isDefined, isString } from '@module/shared/type.library.js';

const context = getContext();
let storage = context.global?.localStorage as globalThis.Storage;	// select context storage

/** select local | session storage */
export function selStore(store: 'local' | 'session' = 'local') {
	const name = (store + 'Storage') as `${typeof store}Storage`;

	return storage = globalThis[name];												// return whichever was selected.
}

/** get storage */
export function getStore<T>(key: string, dflt?: T) {
	let store: string | undefined | null;

	switch (context.type) {
		case CONTEXT.Browser:
			store = storage.getItem(key);
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

/** set / delete storage */
export function setStore<T>(key: string, val?: T) {
	const stash = isDefined(val) ? stringify(val) : void 0;
	const set = isDefined(stash);

	switch (context.type) {
		case CONTEXT.Browser:
			set
				? storage.setItem(key, stash)
				: storage.removeItem(key);
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