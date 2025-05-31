import type { Property } from '#core/shared/type.library.js';

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

/** curry a Function to allow partial calls */
export function curry<
	F extends (...args: any[]) => any,
	S extends PartialParameters<F>
>(targetFn: F, ...existingArgs: S): CurriedFunction<S, F> {
	return function (...args) {
		const totalArgs = [...existingArgs, ...args];

		if (totalArgs.length >= targetFn.length)
			return targetFn(...totalArgs);

		return curry(targetFn, ...totalArgs as PartialParameters<F>);
	}
}

/** memoize repeated function calls */
export const memoize = <F extends (...args: any[]) => any>(fn: F) => {
	const cache = new Map<string, ReturnType<F>>();

	return function (this: {}, ...args: unknown[]) {
		const key = JSON.stringify(args);

		if (!cache.has(key))
			cache.set(key, fn.apply(this, args));

		return Object.freeze(cache.get(key)) as ReturnType<F>;
	}
}

/** memoize repeated functions calls on an Object's methods */
export function memoizeObject<F extends (...args: any[]) => any>(func: F) {
	const cache = new WeakMap();

	return function (obj: {}) {																// curry the Object reference
		return function (...args: any[]) {
			if (!cache.has(obj)) {
				cache.set(obj, new Map());
			}
			const objCache = cache.get(obj);
			const key = JSON.stringify(args);

			if (objCache.has(key)) {
				return objCache.get(key);
			}

			const result = func.apply(obj, [obj, ...args]);
			objCache.set(key, result);
			return result;
		}
	}
}

export function memoizeMethod(obj: Property<Function>, methodName: string) {
	const originalMethod = obj[methodName];
	const cache = new Map();

	obj[methodName] = function (...args: any[]) {
		const cacheKey = JSON.stringify(args);

		if (!cache.has(cacheKey)) {
			cache.set(cacheKey, originalMethod.apply(this, args));
		}

		return Object.freeze(cache.get(cacheKey));
	}
}
