import type { Secure, ValueOf } from '#core/shared/type.library.js';
/** General utility functions */
/** analyze the Call Stack to determine calling Function's name */
export declare const getCaller: () => string;
/** analyze the Call Stack to determine calling Function's name */
export declare const getScript: (nbr?: number) => string;
/**
 * introduce a wait-timer that will Error() on timeOut.
 * best used with Promise.race([xxx(), sleep()]
 * @param msg			string to display on a timeout
 * @param timeOut	how many milliseconds to sleep (default 2-seconds)
 * @returns				Promise\<void>
 */
export declare const sleep: (msg?: string, timeOut?: number) => Promise<Error>;
/** Javascript Runtimes */
export declare const CONTEXT: {
    readonly Unknown: "unknown";
    readonly Browser: "browser";
    readonly NodeJS: "nodejs";
    readonly Deno: "deno";
    readonly GoogleAppsScript: "google-apps-script";
};
export type CONTEXT = ValueOf<typeof CONTEXT>;
type Context = {
    global: any;
    type: CONTEXT;
};
/** determine JavaScript environment context */
export declare const getContext: () => Context;
/** deep-freeze an Array | Object to make it immutable */
export declare function secure<const T>(obj: T): Secure<T>;
export {};
