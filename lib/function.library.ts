import { secure } from '#core/shared/utility.library.js';
import { isUndefined, type Property } from '#core/shared/type.library.js';

// https://medium.com/codex/currying-in-typescript-ca5226c85b85
type PartialTuple<T extends any[], X extends any[] = []> =
	T extends [infer N, ...infer R]														// If the tuple provided has at least one required value
	? PartialTuple<R, [...X, N?]>															// recurse back in to this type with one less item
	: [...X, ...T]																						// else return an empty tuple so that too is a valid option

type PartialParameters<F extends (...args: any[]) => any> = PartialTuple<Parameters<F>>

type RemainingParameters<P extends any[], E extends any[]> =
	E extends [infer E1, ...infer EX]													// if the expected array has any required items...
	? P extends [infer P1, ...infer PX]												// then if the provided array has at least one required item,
	? RemainingParameters<PX, EX>															// 		then recurse with one item less in each array type
	: E																												// 		else the remaining args is unchanged
	: []																											// else there are no more arguments

type CurriedFunction<PROVIDED extends any[], FN extends (...args: any[]) => any> =
	<NEW_ARGS extends PartialTuple<RemainingParameters<PROVIDED, Parameters<FN>>>>(...args: NEW_ARGS) =>
		CurriedFunctionOrReturnValue<[...PROVIDED, ...NEW_ARGS], FN>

type CurriedFunctionOrReturnValue<PROVIDED extends any[], FN extends (...args: any[]) => any> =
	RemainingParameters<PROVIDED, Parameters<FN>> extends [any, ...any[]]
	? CurriedFunction<PROVIDED, FN>
	: ReturnType<FN>

type Curry<Args extends any[], Res> =
	Args extends [infer FirstArg, ...infer RestArgs]
	? (arg: FirstArg) => Curry<RestArgs, Res>
	: Res;

/** curry a Function to allow partial calls */
export function curry<Args extends any[], Res>(fn: (...args: Args) => Res): Curry<Args, Res> {
	return function curried(...args: any[]): any {
		return (args.length >= fn.length)
			? fn(...(args as Args))
			: (...nextArgs: any[]) => curried(...args, ...nextArgs)
	} as Curry<Args, Res>;
}

/** generic function to memoize repeated function calls */
export function memoizeFunction<F extends (...args: any[]) => any>(fn: F) {
	const cache = new Map<string, ReturnType<F>>();						// using a Map for better key handling than plain objects

	return function (...args: unknown[]) {
		const key = JSON.stringify(args);												// create a unique key from arguments
		console.log('memoize: ', key);
		if (!cache.has(key)) {
			// @ts-ignore
			const result = fn.apply(this, args);									// call the original function with the correct context
			console.log('set: ', result);
			cache.set(key, Object.freeze(result));								// stash the result for subsequent calls
		}
		else console.log('get: ', cache.get(key));

		return cache.get(key);
	}
}

const wm = new WeakMap<object, Property<any>>();

/** define a Descriptor for an Object's memoized-methods */
export function memoizeMethod<T>(name: PropertyKey, fn: (this: Property<any>, ...args: any[]) => T) {
	return {
		enumerable: true,
		configurable: false,
		writable: false,
		value: function (this: Property<any>, ...args: any[]) {
			const key = `${String(name)},${JSON.stringify(args)}`;
			let cache = wm.get(this);

			if (!cache) {																					// add a new object into the WeakMap
				cache = Object.create(null) as Property<any>;
				wm.set(this, cache);
			}

			if (isUndefined(cache[key])) {												// first time for this method
				cache[key] = fn.apply(this, args);									// evaluate the method
				secure(cache[key]);																	// freeze the returned value
			}

			return cache[key] as T;
		}
	} as PropertyDescriptor;
}
