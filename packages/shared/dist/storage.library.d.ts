/** select local | session storage */
export declare function selStorage(store?: 'local' | 'session'): Storage;
/** get storage */
export declare function getStorage<T>(): T;
export declare function getStorage<T>(key: string): T | undefined;
export declare function getStorage<T>(key: string | undefined, dflt?: T): T;
/** set / delete storage */
export declare function setStorage<T>(key: string, val?: T): void;
