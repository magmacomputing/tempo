import { type ValueOf } from '#library/type.library.js';
declare const Method: {
    readonly Log: "log";
    readonly Info: "info";
    readonly Warn: "warn";
    readonly Debug: "debug";
    readonly Error: "error";
};
/**
 * provide standard logging methods to the console for a class
 */
export declare class Logify {
    #private;
    /**
     * if {catch:true} then show a warning on the console and return
     * otherwise show an error on the console and re-throw the error
     */
    catch(...msg: any[]): void;
    /** console.log */ log: (...msg: any[]) => void;
    /** console.info */ info: (...msg: any[]) => void;
    /** console.warn */ warn: (...msg: any[]) => void;
    /** console.debug */ debug: (...msg: any[]) => void;
    /** console.error */ error: (...msg: any[]) => void;
    constructor(self?: Logify.Constructor | string, opts?: Logify.Constructor);
}
export declare namespace Logify {
    type Method = ValueOf<typeof Method>;
    interface Constructor {
        debug?: boolean | undefined;
        catch?: boolean | undefined;
    }
}
export {};
