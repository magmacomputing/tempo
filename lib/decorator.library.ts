/**
 * Some interesting Class Decorators
 */

/** modify a Class method's enumerable property */
export function enumerable(enumerable = true) {
	return function (target: Function, context: ClassMethodDecoratorContext) {
		Object.defineProperty(target, context.name, { enumerable });
	}
}

/** modify a Class field to be immutable */
export function immutable(target: any, propertyKey: string) {
	let value = target[propertyKey];													// get the original value of the property

	Object.defineProperty(target, propertyKey, {							// define a new property descriptor
		get: () => value,																				// allow getting the value
		set: (newValue: any) => {																// throw an error is an attempt is made to reassign the property
			throw new Error(`Property '${propertyKey}' is immutable and cannot be reassigned.`);
		},
		configurable: false,																		// prevent the property from being reconfigured or deleted
		enumerable: true,																				// allow the property to be enumerated
		value: Object.freeze(value),
	});
}