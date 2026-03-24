import { __classPrivateFieldGet, __classPrivateFieldSet, __esDecorate, __runInitializers, __setFunctionName } from "tslib";
import { Logify } from './logify.class.js';
import { asArray } from './coercion.library.js';
import { sprintf } from './string.library.js';
import { ifDefined } from './object.library.js';
import { secure } from './utility.library.js';
import { cleanify } from './serialize.library.js';
import { Immutable } from './class.library.js';
import { isEmpty, isObject } from './type.library.js';
/**
 * Wrap a Promise's resolve/reject/finally methods for later fulfilment.
 * with useful methods for tracking the state of the Promise, chaining fulfilment, etc.
 ```
     new Pledge<T>({tag: string, onResolve?: () => void, onReject?: () => void, onSettle?: () => void})
     new Pledge<T>(tag?: string)
 ```
 */
let Pledge = (() => {
    var _Pledge_static;
    let _classDecorators = [Immutable];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Pledge = class {
        static { _classThis = this; }
        static { __setFunctionName(this, "Pledge"); }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Pledge = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #pledge;
        #status = {};
        #dbg;
        static {
            _Pledge_static = { value: {} };
        }
        static STATE = secure({
            Pending: Symbol('pending'),
            Resolved: Symbol('resolved'),
            Rejected: Symbol('rejected')
        });
        /** initialize future Pledge instances */
        static init(arg) {
            if (isObject(arg)) {
                if (isEmpty(arg))
                    __classPrivateFieldSet(Pledge, _classThis, {}, "f", _Pledge_static); // reset static values
                Object.assign(__classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static), ifDefined({ tag: arg.tag, debug: arg.debug, catch: arg.catch, }), ifDefined({ onResolve: arg.onResolve, onReject: arg.onReject, onSettle: arg.onSettle, }));
            }
            else {
                Object.assign(__classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static), ifDefined({ tag: arg, }));
            }
            if (__classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static).debug)
                console.log('Pledge: ', __classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static)); // debug
            return Pledge.status;
        }
        /** reset static defaults */
        static [Symbol.dispose]() { Pledge.init({}); }
        static get status() {
            return __classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static);
        }
        /** use catch:boolean to determine whether to throw or return  */
        #catch(...msg) {
            if (this.status.catch) {
                this.#dbg.warn(...msg); // catch, but warn {error}
                return;
            }
            this.#dbg.error(...msg); // assume {error}
            throw new Error(sprintf('pledge: ', ...msg));
        }
        constructor(arg) {
            this.#pledge = Promise.withResolvers();
            this.#status = { state: Pledge.STATE.Pending, ...__classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static) };
            if (isObject(arg)) {
                this.#dbg = new Logify({ debug: arg.debug, catch: arg.catch });
                Object.assign(this.#status, ifDefined({ tag: __classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static).tag, debug: __classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static).debug, catch: __classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static).catch }), ifDefined({ tag: arg.tag, debug: arg.debug, catch: arg.catch, }));
                const onResolve = asArray(__classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static).onResolve).concat(asArray(arg.onResolve));
                const onReject = asArray(__classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static).onReject).concat(asArray(arg.onReject));
                const onSettle = asArray(__classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static).onSettle).concat(asArray(arg.onSettle));
                if (onResolve.length)
                    this.#pledge.promise.then(val => onResolve.forEach(cb => cb(val)));
                if (onReject.length)
                    this.#pledge.promise.catch(err => onReject.forEach(cb => cb(err)));
                if (onSettle.length)
                    this.#pledge.promise.finally(() => onSettle.forEach(cb => cb()));
                if (this.#status.catch)
                    this.#pledge.promise.catch(err => this.#catch(this.#status, err));
            }
            else {
                this.#dbg = new Logify();
                Object.assign(this.#status, ifDefined({ tag: arg ?? __classPrivateFieldGet(Pledge, _classThis, "f", _Pledge_static).tag, }));
            }
        }
        get [Symbol.toStringTag]() {
            return 'Pledge';
        }
        [Symbol.dispose]() {
            if (this.isPending)
                this.reject(new Error(`Pledge disposed`)); // dispose
        }
        get status() {
            return cleanify(this.#status);
        }
        get promise() {
            return this.#pledge.promise;
        }
        get state() {
            return this.#status.state.description;
        }
        get isPending() {
            return this.#status.state === Pledge.STATE.Pending;
        }
        get isResolved() {
            return this.#status.state === Pledge.STATE.Resolved;
        }
        get isRejected() {
            return this.#status.state === Pledge.STATE.Rejected;
        }
        get isSettled() {
            return this.#status.state !== Pledge.STATE.Pending;
        }
        toString() {
            return JSON.stringify(this.status);
        }
        resolve(value) {
            if (this.isPending) {
                this.#status.settled = value;
                this.#status.state = Pledge.STATE.Resolved;
                this.#pledge.resolve(value); // resolve
            }
            else
                this.#dbg.warn(this.#status, `Pledge was already ${this.state}`);
            return this.#pledge.promise;
        }
        reject(error) {
            if (this.isPending) {
                this.#status.error = error;
                this.#status.state = Pledge.STATE.Rejected;
                this.#pledge.reject(error); // reject
            }
            else
                this.#dbg.warn(this.#status, `Pledge was already ${this.state}`);
            return this.#pledge.promise;
        }
        /** make Pledge 'then-able' by forwarding to internal promise */
        then(onfulfilled, onrejected) {
            return this.promise.then(onfulfilled, onrejected);
        }
        static {
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Pledge = _classThis;
})();
export { Pledge };
//# sourceMappingURL=pledge.class.js.map