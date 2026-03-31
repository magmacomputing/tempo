import { objectify, stringify } from '#library/serialize.library.js';
import { CONTEXT, getContext } from '#library/utility.library.js';
import { isDefined, isUndefined, isString } from '#library/type.library.js';

const context = getContext();

/** simplified in-memory storage for restricted browser contexts */
const mockStorage: Storage = {
	length: 0,
	clear: () => { },
	getItem: (_key: string) => null,
	key: (_index: number) => null,
	removeItem: (_key: string) => { },
	setItem: (_key: string, _value: string) => { },
};

/** safely attempt to retrieve a Storage object from the global context */
const getSafeStorage = (name: 'localStorage' | 'sessionStorage' = 'localStorage'): Storage => {
	try {
		return context.global?.[name] ?? mockStorage;
	} catch {
		return mockStorage;
	}
};

let storage = context.type === CONTEXT.Browser
	? getSafeStorage()
	: mockStorage;

/** select local | session storage */
export function selStorage(store: 'local' | 'session' = 'local') {
	const name = (store + 'Storage') as `${typeof store}Storage`;
	return storage = getSafeStorage(name);
}

/** get storage */
export function getStorage<T>(): T;
export function getStorage<T>(key: string): T | undefined;
export function getStorage<T>(key: string | undefined, dflt?: T): T;
export function getStorage<T>(key?: string, dflt?: T): T | undefined {
	let store: string | undefined | null;

	if (isUndefined(key))
		return dflt ?? {} as T;

	switch (context.type) {
		case CONTEXT.Browser:
			store = storage.getItem(key);
			break;

		case CONTEXT.NodeJS:
			store = context.global.process.env[key];
			if (key === '$Tempo' && !store) {
				// skip debug log for production/test clean-up
			}
			break;

		case CONTEXT.GoogleAppsScript:
			store = context.global.PropertiesService?.getUserProperties().getProperty(key);
			break;

		default:
			throw new Error(`Cannot determine Javascript context: ${context.type}`);
	}

	return isString(store)
		? objectify<T>(store)																	// rebuild object from its stringified representation
		: dflt;
}

/** set / delete storage */
export function setStorage<T>(key: string, val?: T) {
	const stash = isDefined(val) ? stringify(val) : undefined;
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