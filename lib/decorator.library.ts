/**
 * Some interesting Class Decorators
 */

/** modify a Class method's enumable property */
export function enumerable(value: boolean) {
	return function (target: Function, context: ClassMethodDecoratorContext) {
		Object.defineProperty(target, context.name, { enumerable: false })
	}
}