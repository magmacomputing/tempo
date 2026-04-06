import { ownEntries } from '#library/reflection.library.js';
import { registerSerializable } from '#library/serialize.library.js';
import { type Constructor, type Type, registerType } from '#library/type.library.js';

/**
 * Some interesting Class Decorators
 */

/** decorator to freeze a Class to prevent modification */
export function Immutable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	name = String(name);

	switch (kind) {
		case 'class':
			const wrapper = {
				[name]: class extends value {												// anonymous class infers name from property
					constructor(...args: any[]) {
						super(...args);
						Object.freeze(this);														// freeze the instance
					}
				}
			}[name] as T;

			registerType(value, name as Type);										// register the original class definition
			registerType(wrapper, name as Type);									// register the wrapper as the authoritative definition

			addInitializer(() => {																// wait for construction to complete
				const protect = (obj: object) => {									// protect existing members
					ownEntries(Object.getOwnPropertyDescriptors(obj))
						.filter(([name]) => name !== 'constructor')			// dont touch the constructor
						.forEach(([name, { configurable, writable }]) => {
							if (configurable) {
								const update: PropertyDescriptor = { configurable: false };
								if (writable) update.writable = false;			// only data descriptors have 'writable'
								Object.defineProperty(obj, name, update);
							}
						});
				};

				protect(value);																			// protect original static members
				protect(value.prototype);														// protect original prototype members
				protect(wrapper);																		// protect wrapper static members
				protect(wrapper.prototype);													// protect wrapper prototype members
			});

			return wrapper;

		default:
			throw new Error(`@Immutable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** register a Class for serialization */
export function Serializable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	name = String(name);																			// cast as String
	registerType(value, name as Type);

	switch (kind) {
		case 'class':
			addInitializer(() => registerSerializable(name, value));// register the class for serialization, via its toString() method

			return value;

		default:
			throw new Error(`@Serializable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** make a Class not instantiable */
export function Static<T extends Constructor>(value: T, { kind, name }: ClassDecoratorContext<T>): T | void {
	name = String(name);

	switch (kind) {
		case 'class':
			const wrapper = {
				[name]: class extends value {
					constructor(...args: any[]) {
						super(...args);
						throw new TypeError(`${name} is not a constructor`);
					}
				}
			}[name] as T;

			registerType(value, name as Type);										// register the original class definition
			registerType(wrapper, name as Type);									// register the wrapper as the authoritative definition

			return wrapper;

		default:
			throw new Error(`@Static decorating unknown 'kind': ${kind} (${name})`);
	}
}