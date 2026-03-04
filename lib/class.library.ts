import { Registry } from '#core/shared/serialize.library.js';
import type { Constructor } from '#core/shared/type.library.js';

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

			addInitializer(() => {																// wait for construction to complete
				Object.freeze(value);																// freeze the static properties
				Object.freeze(value.prototype);											// freeze the prototype methods
				Object.freeze(wrapper);															// freeze the wrapper static properties
				Object.freeze(wrapper.prototype);										// freeze the wrapper prototype methods
			});

			return wrapper;

		default:
			throw new Error(`@Immutable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** register a Class for serialization */
export function Serializable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	name = String(name);																			// cast as String

	switch (kind) {
		case 'class':
			addInitializer(() => Registry.set(`$${name}`, value));// register the class for serialization, via its toString() method

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

			return wrapper;

		default:
			throw new Error(`@Static decorating unknown 'kind': ${kind} (${name})`);
	}
}