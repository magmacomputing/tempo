/**
 * Some interesting Class Decorators
 */

/** modify a Class method's enumerable property */
export function enumerable(enumerable = true) {
	return function (target: Function, context: ClassMethodDecoratorContext) {
		Object.defineProperty(target, context.name, { enumerable })
	}
}