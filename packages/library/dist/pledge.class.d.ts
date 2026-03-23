declare module './type.library.js' {
    interface TypeValueMap<T> {
        Pledge: {
            type: 'Pledge';
            value: Pledge<T>;
        };
    }
}
/**
 * Wrap a Promise's resolve/reject/finally methods for later fulfilment.
 * with useful methods for tracking the state of the Promise, chaining fulfilment, etc.
 ```
     new Pledge<T>({tag: string, onResolve?: () => void, onReject?: () => void, onSettle?: () => void})
     new Pledge<T>(tag?: string)
 ```
 */
export declare class Pledge<T> {
    #private;
    static STATE: import("#library/type.library.js").SecureObject<{
        readonly Pending: symbol;
        readonly Resolved: symbol;
        readonly Rejected: symbol;
    }>;
    /** initialize future Pledge instances */
    static init(arg?: Pledge.Constructor | string): Pledge.Status<typeof Pledge>;
    /** reset static defaults */
    static [Symbol.dispose](): void;
    static get status(): Pledge.Status<typeof Pledge>;
    constructor(arg?: Pledge.Constructor | string);
    get [Symbol.toStringTag](): string;
    [Symbol.dispose](): void;
    get status(): Pledge.Status<T>;
    get promise(): Promise<T>;
    get state(): string | undefined;
    get isPending(): boolean;
    get isResolved(): boolean;
    get isRejected(): boolean;
    get isSettled(): boolean;
    toString(): string;
    resolve(value: T): Promise<T>;
    reject(error: any): Promise<T>;
    then(fn: Function): void;
}
export declare namespace Pledge {
    type Resolve = (val?: any) => any;
    type Reject = (err: Error) => any;
    type Settle = () => void;
    type Constructor = {
        tag?: string;
        onResolve?: Pledge.Resolve | Pledge.Resolve[];
        onReject?: Pledge.Reject | Pledge.Reject[];
        onSettle?: Pledge.Settle | Pledge.Settle[];
        debug?: boolean | undefined;
        catch?: boolean | undefined;
    };
    interface Status<T> {
        tag?: string;
        debug?: boolean | undefined;
        catch?: boolean | undefined;
        state: symbol;
        settled?: T;
        error?: Error;
    }
}
