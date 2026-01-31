import { Registry } from '#core/shared/serialize.library.js';

/**
 * Some interesting Decorators
 */

/** decorator to freeze an object to prevent modification */
export function Immutable(value: any, { kind, name, addInitializer }: DecoratorContext) {
	name = String(name);

	switch (kind) {
		case 'class':
			addInitializer(() => {																// wait for construction to complete
				Object.freeze(value);																// freeze the class itself
				Object.freeze(value.prototype);											// freeze the class prototype
			})

			return new Proxy(value, {
				construct: function (source, argumentsList, target) {
					const instance = Reflect.construct(source, argumentsList, target);
					Object.freeze(instance);													// freeze the instance
					return instance;
				}
			})

		default:
			throw new Error(`@Immutable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** register a Class for serialization */
export function Serializable(value: any, { kind, name, addInitializer }: DecoratorContext) {
	name = String(name);																			// cast as String

	switch (kind) {
		case 'class':
			addInitializer(() => Registry.set(`$${name}`, value));// register the class for serialization

			return value;

		default:
			throw new Error(`@Serializable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** make a Class not instantiable */
export function Static(value: any, { kind, name, addInitializer }: DecoratorContext) {
	name = String(name);

	switch (kind) {
		case 'class':
			return class extends value {
				value(...args: any[]) {
					throw new TypeError(`${name} is not a constructor`);
				}
			}

		default:
			throw new Error(`@Static decorating unknown 'kind': ${kind} (${name})`);
	}
}
