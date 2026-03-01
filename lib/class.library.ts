import { Registry } from '#core/shared/serialize.library.js';
import type { Constructor } from '#core/shared/type.library.js';

/**
 * Some interesting Decorators
 */

/** decorator to freeze a Class to prevent modification */
export function Immutable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
	name = String(name);

	switch (kind) {
		case 'class':
			addInitializer(() => {																// wait for construction to complete
				Object.freeze(value);																// freeze the class instance
				Object.freeze(value.prototype);											// freeze the class prototype
			})

			return new Proxy(value, {
				construct: function (source, argumentsList, target) {
					const instance = Reflect.construct(source, argumentsList, target);
					Object.freeze(instance);													// freeze the instance
					return instance;
				}
			}) as T;

		default:
			throw new Error(`@Immutable decorating unknown 'kind': ${kind} (${name})`);
	}
}

/** register a Class for serialization */
export function Serializable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void {
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
export function Static<T extends Constructor>(value: T, { kind, name }: ClassDecoratorContext<T>): T | void {
	name = String(name);

	switch (kind) {
		case 'class':
			return class extends (value as any) {
				constructor(...args: any[]) {
					super(...args);
					throw new TypeError(`${name} is not a constructor`);
				}
			} as T;

		default:
			throw new Error(`@Static decorating unknown 'kind': ${kind} (${name})`);
	}
}
