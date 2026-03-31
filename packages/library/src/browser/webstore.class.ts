import { distinct } from '#library/array.library.js';
import { ownEntries } from '#library/reflection.library.js';
import { stringify, objectify } from '#library/serialize.library.js';
import { asType, isEmpty, isNullish, isString } from '#library/type.library.js';
import type { Property, ValueOf } from '#library/type.library.js';

const STORAGE = {
	Local: 'local',
	Session: 'session',
} as const
type STORAGE = ValueOf<typeof STORAGE>

/**
 * Wrapper around local / session Browser Storage.
 * Refactored for lazy-initialization to ensure side-effect free imports.
 */
export class WebStore {
	static #localInstance?: WebStore;
	static #sessionInstance?: WebStore;

	/** Lazy getter for localStorage wrapper */
	static get local() {
		return WebStore.#localInstance ??= new WebStore(STORAGE.Local);
	}

	/** Lazy getter for sessionStorage wrapper */
	static get session() {
		return WebStore.#sessionInstance ??= new WebStore(STORAGE.Session);
	}

	#type: STORAGE;

	/** Resolved Storage object (resolved only on access) */
	get #storage(): globalThis.Storage {
		return this.#type === STORAGE.Local
			? globalThis.localStorage
			: globalThis.sessionStorage;
	}

	[Symbol.toStringTag] = 'WebStore';

	constructor(storage: STORAGE = STORAGE.Local) {
		this.#type = storage;
	}

	public get<T>(key: PropertyKey): T | null;
	public get<T>(key: PropertyKey, dflt: T): T;
	public get<T>(key: PropertyKey, dflt?: T) {
		const str = this.#storage.getItem(stringify(key));
		return isString(str)
			? objectify<T>(str)																		// rebuild the object
			: (dflt ?? null)
	}

	public set(key?: PropertyKey, obj?: unknown, opt = { merge: true }) {
		if (isNullish(key))																		// synonym for 'clear'
			return this.clear();

		let prev = this.get<string | any[] | {}>(key);					// needed if merge is true
		const arg = asType(obj);

		switch (arg.type) {
			case 'Undefined':
				return this.del(key);																// synonym for 'removeItem'

			case 'Object':
				prev ??= {};
				return this.#upd(key, opt.merge
					? Object.assign(prev, arg.value)									// assume prev is Object
					: arg.value)

			case 'Array':
				prev ??= [];
				return this.#upd(key, opt.merge
					? distinct((prev as unknown[])										// assume prev is Array
						.concat(arg.value))															// remove duplicates
					: obj)

			case 'Map':
				prev ??= new Map();
				if (opt.merge) {
					arg.value																					// merge into prev Map
						.forEach((val, key) => (prev as Map<any, any>).set(key, val));
					return this.#upd(key, prev);
				}
				return this.#upd(key, arg.value);										// else overwrite new Map

			case 'Set':
				prev ??= new Set();
				if (opt.merge) {
					arg.value
						.forEach(itm => (prev as Set<any>).add(itm));		// merge into prev Set
					return this.#upd(key, prev);
				}
				return this.#upd(key, arg.value);										// else overwrite new Set

			default:
				return this.#upd(key, arg.value);
		}
	}

	public clear() {
		this.#storage.clear();
		return this;
	}

	public del(...keys: PropertyKey[]) {											// list of keys to remove
		keys
			.forEach(key => this.#storage.removeItem(stringify(key)))
		return this;
	}

	public keys(...keys: PropertyKey[]) {											// list of keys (or all)
		return this.entries(...keys)
			.map(([key,]) => key)
	}

	public values<T>(...keys: PropertyKey[]) {								// list of keys (or all) to lookup
		return this.entries<T>(...keys)
			.map(([, val]) => val)
	}

	public entries<T>(...keys: PropertyKey[]) {								// list of keys (or all) to lookup
		const wanted = new Set(keys.map(key => stringify(key)));

		return ownEntries<Record<string, string>>(this.#storage)
			.map(([key, val]) => [objectify(key), objectify(val)] as [PropertyKey, T])
			.filter(([key]) => isEmpty(keys) || wanted.has(stringify(key)))
	}

	public from(store: Property<any>) {
		ownEntries(store)
			.forEach(([key, val]) => this.set(key, val))
		return this;
	}

	#upd(key: PropertyKey, obj: any) {
		this.#storage.setItem(stringify(key), stringify(obj));
		return this;
	}
}