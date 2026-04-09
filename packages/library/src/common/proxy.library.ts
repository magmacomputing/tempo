import { $Target, $Inspect, $Discover } from '#library/symbol.library.js';
import { allObject } from '#library/reflection.library.js';
import { secure } from '#library/utility.library.js';
import { isFunction, isSymbol, registerType, type Constructor, type Type } from '#library/type.library.js';

/** Stealth Proxy pattern to allow for iteration and logging over a Frozen object */
export function proxify<T extends object>(target: T, frozen = true, lock = frozen) {
	const tgt = (target as any)[$Target] ?? target;						// unwrap if it's already a proxy
	let cachedJSON: any;

	registerType(tgt as Constructor);													// auto-register with global type system

	if (lock) secure(tgt);

	return new Proxy(tgt, {
		isExtensible: (t) => Reflect.isExtensible(t),
		preventExtensions: (t) => Reflect.preventExtensions(t),
		getOwnPropertyDescriptor: (_, key) => Reflect.getOwnPropertyDescriptor(tgt, key),
		getPrototypeOf: () => Reflect.getPrototypeOf(tgt),
		ownKeys: () => Reflect.ownKeys(tgt),
		has: (_, key) => Reflect.has(tgt, key),
		deleteProperty: (_, key) => {
			if (frozen) throw new TypeError(`Cannot delete property '${String(key)}' from a frozen object.`);
			return Reflect.deleteProperty(tgt, key);
		},
		set: (_, key, val) => {
			if (frozen) throw new TypeError(`Cannot set property '${String(key)}' on a frozen object.`);
			return Reflect.set(tgt, key, val);
		},
		get: (_, key) => {
			if (key === $Target)
				return tgt;																					// found the 'stop' marker

			if (frozen && (key === $Inspect || key === 'toJSON')) {	// two special properties require virtual closures
				const own = Object.getOwnPropertyDescriptor(tgt, key);
				if (own && isFunction(own.value))										// if object already has its own toJSON, return
					return own.value;

				if (!cachedJSON)																		// otherwise, create a virtual closure
					cachedJSON = () => allObject(tgt);								// resolve & memoize for subsequent calls

				return cachedJSON;																	// return the memoized closure
			}

			const val = Reflect.get(tgt, key);
			return (frozen && isFunction(val))										// if the value is a function
				? val.bind(tgt)																			// bind it to the target
				: val;																							// else return the value
		},
	}) as T
}

/** Stealth Proxy pattern to allow for on-demand lazy property discovery and registration */
export function delegate<T extends object>(target: T, onGet: (key: string | symbol, target: T) => any, readonly = true) {
	const pending = new Set<PropertyKey>();									// recursion guard

	return new Proxy(target, {
		isExtensible: (t) => Reflect.isExtensible(t),
		preventExtensions: (t) => Reflect.preventExtensions(t),
		getOwnPropertyDescriptor: (t, key) => Reflect.getOwnPropertyDescriptor(t, key),
		getPrototypeOf: (t) => Reflect.getPrototypeOf(t),
		setPrototypeOf: (t, proto) => {
			if (readonly) throw new TypeError('Cannot set prototype of a read-only delegator.');
			return Reflect.setPrototypeOf(t, proto);
		},

		deleteProperty: (t, key) => {
			if (readonly) throw new TypeError(`Cannot delete property '${String(key)}' from a read-only delegator.`);
			return Reflect.deleteProperty(t, key);
		},

		defineProperty: (t, key, desc) => {
			if (readonly) throw new TypeError(`Cannot define property '${String(key)}' on a read-only delegator.`);
			return Reflect.defineProperty(t, key, desc);
		},

		set: (t, key, val) => {
			if (readonly) throw new TypeError(`Cannot set property '${String(key)}' on a read-only delegator.`);
			return Reflect.set(t, key, val);
		},

		ownKeys: (t) => {
			if (!pending.has($Discover)) {
				pending.add($Discover);
				try {
					onGet($Discover, t);															// full discovery phase
				} finally {
					pending.delete($Discover);
				}
			}
			return Reflect.ownKeys(t);
		},
		get: (t, key) => {
			// bypass for symbols or properties already in the chain (or currently resolving)
			if (isSymbol(key) || Reflect.has(t, key) || pending.has(key))
				return Reflect.get(t, key);

			pending.add(key);																			// mark as resolving
			try {
				const val = onGet(key, t);													// discovery phase
				if (val !== undefined) return val;									// return early if evaluation was handled
			} finally {
				pending.delete(key);																// resolve complete
			}

			// silently mark on target to avoid redundant discovery even if not found
			if (Reflect.isExtensible(t) && !Reflect.has(t, key))
				Object.defineProperty(t, key, { value: undefined, enumerable: false, configurable: true });

			return Reflect.get(t, key);
		}
	}) as T;
}

