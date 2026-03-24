import { __esDecorate, __runInitializers } from "tslib";
import { Immutable } from './class.library.js';
import { asType, isObject } from './type.library.js';
const Method = {
    Log: 'log',
    Info: 'info',
    Warn: 'warn',
    Debug: 'debug',
    Error: 'error',
};
/**
 * provide standard logging methods to the console for a class
 */
let Logify = (() => {
    let _classDecorators = [Immutable];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Logify = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Logify = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        #name;
        #opts = {};
        #log(method, ...msg) {
            if (this.#opts.debug)
                console[method](this.#name, ...msg);
        }
        /**
         * if {catch:true} then show a warning on the console and return
         * otherwise show an error on the console and re-throw the error
         */
        catch(...msg) {
            if (this.#opts.catch) {
                this.warn(...msg); // show a warning on the console
                return; // safe-return
            }
            this.error(...msg); // this goes to the console
            throw new Error(`${this.#name}${msg.map(m => isObject(m) ? JSON.stringify(m) : String(m)).join(' ')}`); // catch will be loud or silent, based on #catch config
        }
        /** console.log */ log = (...msg) => this.#log(Method.Log, ...msg);
        /** console.info */ info = (...msg) => this.#log(Method.Info, ...msg);
        /** console.warn */ warn = (...msg) => this.#log(Method.Warn, ...msg);
        /** console.debug */ debug = (...msg) => this.#log(Method.Debug, ...msg);
        /** console.error */ error = (...msg) => this.#log(Method.Error, ...msg);
        constructor(self, opts = {}) {
            const arg = asType(self);
            switch (arg.type) {
                case 'String':
                    this.#name = arg.value;
                    break;
                // @ts-ignore
                case 'Object':
                    Object.assign(opts, arg.value);
                default:
                    this.#name = (self ?? this).constructor.name.concat(': ') ?? '';
            }
            this.#opts.debug = opts.debug ?? false; // default debug to 'false'
            this.#opts.catch = opts.catch ?? false; // default catch to 'false'								
        }
    };
    return Logify = _classThis;
})();
export { Logify };
//# sourceMappingURL=logify.class.js.map