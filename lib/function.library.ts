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

/** memoize repeated lookups */
export const memoize = <F extends (...args: any) => any>(fn: F) => {
	const cache = new Map<string | symbol, ReturnType<F>>();

	return (...args: unknown[]) => {
		const key = JSON.stringify(args);

		if (!cache.has(key))
			cache.set(key, fn(...args));

		return cache.get(key) as ReturnType<F>;
	}
}