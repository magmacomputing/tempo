import { type Property } from '#library/type.library.js';
type Curry<Args extends any[], Res> = Args extends [infer FirstArg, ...infer RestArgs] ? (arg: FirstArg) => Curry<RestArgs, Res> : Res;
/** curry a Function to allow partial calls */
export declare function curry<Args extends any[], Res>(fn: (...args: Args) => Res): Curry<Args, Res>;
/** generic function to memoize repeated function calls */
export declare function memoizeFunction<F extends (...args: any[]) => any>(fn: F): (...args: unknown[]) => ReturnType<F> | undefined;
/** manually clear the memoization cache for an object */
export declare function clearCache(obj: object): void;
/** define a Descriptor for an Object's memoized-method */
export declare function memoizeMethod<Context = Property<any>, T = any>(name: PropertyKey, fn: (this: Context, ...args: any[]) => T): PropertyDescriptor;
export {};
