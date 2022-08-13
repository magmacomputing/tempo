import { stringify, objectify } from '@module/shared/serialize.library';
import { asType, isEmpty, isUndefined } from '@module/shared/type.library';

/**
 * Wrapper around local / session  Web Storage
 */
export class WebStore {
	#storage: globalThis.Storage;

	[Symbol.toStringTag] = 'WebStore';

	constructor(storage: 'local' | 'session' = 'local') {
		this.#storage = storage === 'local'											// default to localStorage
			? globalThis.localStorage
			: globalThis.sessionStorage
	}

	public get<T>(key: string): T | null;
	public get<T>(key: string, dflt: T): T;
	public get<T>(key: string, dflt?: T) {
		const obj = objectify<T>(this.#storage.getItem(key));
		return obj ?? (isUndefined(dflt) ? obj : dflt)
	}

	public set(key?: string, obj?: unknown, opt = { merge: true }) {
		if (isUndefined(key))																		// synonym for 'clear'
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
					? (prev as unknown[])															// assume prev is Array
						.concat(arg.value)
						.distinct()																			// remove duplicates
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

	public del(key: string) {
		this.#storage.removeItem(key);
		return this;
	}

	public clear() {
		this.#storage.clear();
		return this;
	}

	public keys() {
		return Object.keys(this.#storage);
	}

	public values<T>() {
		return objectify<T[]>(Object.values(this.#storage));
	}

	public entries<T>(keys: string[]) {
		return Object.entries<T>(this.#storage)
			.filter(([key]) => isEmpty(keys) || keys.includes(key))
			.reduce((acc, [key, val]) => Object.assign(acc, { [key]: objectify(val) }), {} as Record<string, T>)
	}

	public from(store: Record<string, any>) {
		Object
			.entries(store)
			.forEach(([key, val]) => this.set(key, val))
		return this;
	}

	#upd(key: string, obj: unknown) {
		this.#storage.setItem(key, stringify(obj));
		return this;
	}
}

export namespace WebStore {
	export const local = new WebStore('local');								// global reference to localStorage
	export const session = new WebStore('session');						// global reference to sessionStorage
}
