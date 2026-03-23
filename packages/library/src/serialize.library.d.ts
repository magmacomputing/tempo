/** registry of registered classes */
export declare const Registry: Map<string, Function>;
/** make a deep-copy, using standard browser or JSON functions */
export declare function clone<T>(obj: T, opts?: {
    transfer: any[];
}): T;
/** return a copy. remove unsupported values (e.g. \<undefined>, function) */
export declare function cleanify<T>(obj: T): T;
/** deep-copy an Object, and optionally replace \<undefined> fields with a Sentinel function call	*/
export declare function cloneify<T>(obj: T, sentinel?: Function): T;
/**
 * For items which are not currently serializable via standard JSON.stringify (Undefined, BigInt, Set, Map, Symbol, etc.)
 * this creates a stringified, single key:value Object to represent the value; for example  '{ "$BigInt": 123 }'
 *
 * Drawbacks:
 * no support Function / WeakMap / WeakSet / WeakRef
 * limited support for user-defined Classes (must be specifically registered with @Serialize() decorator)
 */
/**
 * serialize Objects for string-safe stashing in WebStorage, Cache, etc
 * uses JSON.stringify where available, else returns stringified single key:value Object '{[$type]: value}'
 */
export declare function stringify<T>(obj: T): string;
/** rebuild an Object from its stringified representation */
export declare function objectify<T>(str: any, sentinel?: Function): T;
