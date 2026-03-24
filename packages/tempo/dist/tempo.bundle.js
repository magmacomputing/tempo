(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Tempo = {}));
})(this, (function (exports) { 'use strict';

    /**
     * This file verifies native Temporal API support.
     * Tempo requires an environment with native Temporal support or a user-provided polyfill.
     */
    // @ts-ignore
    if (!globalThis.Temporal) {
        const message = `
[Tempo] Temporal API not found.
This library requires the ECMAScript Temporal API. Please ensure your environment 
supports it natively (Node.js 20+, modern browsers) or provide your own polyfill.

To add a polyfill to your project:
1. Install: npm install @js-temporal/polyfill
2. Import at your entry point: import '@js-temporal/polyfill';
`;
        console.error(message);
        throw new Error('Temporal API not found.');
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
      function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
      var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
      var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
      var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
      var _, done = false;
      for (var i = decorators.length - 1; i >= 0; i--) {
          var context = {};
          for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
          for (var p in contextIn.access) context.access[p] = contextIn.access[p];
          context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
          var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
          if (kind === "accessor") {
              if (result === void 0) continue;
              if (result === null || typeof result !== "object") throw new TypeError("Object expected");
              if (_ = accept(result.get)) descriptor.get = _;
              if (_ = accept(result.set)) descriptor.set = _;
              if (_ = accept(result.init)) initializers.unshift(_);
          }
          else if (_ = accept(result)) {
              if (kind === "field") initializers.unshift(_);
              else descriptor[key] = _;
          }
      }
      if (target) Object.defineProperty(target, contextIn.name, descriptor);
      done = true;
    }
    function __runInitializers(thisArg, initializers, value) {
      var useValue = arguments.length > 2;
      for (var i = 0; i < initializers.length; i++) {
          value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
      }
      return useValue ? value : void 0;
    }
    function __setFunctionName(f, name, prefix) {
      if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
      return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
    }
    function __classPrivateFieldGet(receiver, state, kind, f) {
      if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    }

    function __classPrivateFieldSet(receiver, state, value, kind, f) {
      if (kind === "m") throw new TypeError("Private method is not writable");
      if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
      var e = new Error(message);
      return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    /** the primitive type reported by toStringTag() */
    const protoType = (obj) => Object.prototype.toString.call(obj).slice(8, -1);
    /**
     * return an object's type as a ProperCase string.
     * if instance, return Class name
     */
    const getType = (obj, ...instances) => {
        const type = protoType(obj);
        switch (true) {
            case type === 'Object':
                const name = isArrayLike(obj)
                    ? 'ArrayLike' // special case Object: ArrayLike
                    : obj.constructor?.name ?? 'Object'; // some Objects do not have a constructor method
                return (instances
                    .find(inst => obj instanceof inst.class)?.type // allow for 'real' name of Instance, after minification
                    ?? name); // return Object name
            case type === 'Function' && Function.prototype.toString.call(obj).startsWith('class '):
                return 'Class';
            default:
                return type;
        }
    };
    /** return TypeValue<T> object */
    const asType = (value, ...instances) => ({ type: getType(value, ...instances), value });
    /** assert value is one of a list of Types */
    const isType = (obj, ...types) => types.includes(getType(obj));
    /** Type-Guards: assert \<obj> is of \<type> */
    const isPrimitive = (obj) => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Void', 'Null', 'Empty');
    const isReference = (obj) => !isPrimitive(obj);
    const isIterable = (obj) => Symbol.iterator in Object(obj) && !isString(obj);
    const isString = (obj) => isType(obj, 'String');
    const isNumber = (obj) => isType(obj, 'Number') && isFinite(obj);
    const isInteger = (obj) => isType(obj, 'BigInt');
    const isIntegerLike = (obj) => isType(obj, 'String') && /^-?[0-9]+n$/.test(obj);
    const isArray = (obj) => isType(obj, 'Array');
    const isArrayLike = (obj) => protoType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
    const isObject = (obj) => isType(obj, 'Object');
    const isDate = (obj) => isType(obj, 'Date');
    const isRegExp = (obj) => isType(obj, 'RegExp');
    const isRegExpLike = (obj) => isType(obj, 'String') && /^\/.*\/$/.test(obj);
    const isSymbol = (obj) => isType(obj, 'Symbol');
    const isSymbolFor = (obj) => isType(obj, 'Symbol') && Symbol.keyFor(obj) !== undefined;
    const isNull = (obj) => isType(obj, 'Null');
    const isNullish = (obj) => isType(obj, 'Null', 'Undefined', 'Void', 'Empty');
    const isUndefined = (obj) => isType(obj, 'Undefined', 'Void', 'Empty');
    const isDefined = (obj) => !isNullish(obj);
    const isFunction = (obj) => isType(obj, 'Function', 'AsyncFunction');
    const isMap = (obj) => isType(obj, 'Map');
    const isSet = (obj) => isType(obj, 'Set');
    // non-standard Objects
    const isTempo$1 = (obj) => isType(obj, 'Tempo');
    const nullToValue = (obj, value) => obj ?? value;
    /** object has no values */
    const isEmpty = (obj) => isNullish(obj)
        || (isObject(obj) && (Reflect.ownKeys(obj).length === 0))
        || (isString(obj) && (obj.trim().length === 0))
        || (isNumber(obj) && (isNaN(obj) === true))
        || (isArray(obj) && (obj.length === 0))
        || (isSet(obj) && (obj.size === 0))
        || (isMap(obj) && (obj.size === 0));

    /** property marker used to unwrap proxies in ownEntries() */
    const $Target = Symbol.for('$Target');
    function omit(obj, ...keys) {
        const { type, value } = asType(obj);
        switch (type) {
            case 'Array':
                if (isEmpty(keys)) {
                    value.clear(); // clear entire Array
                    break;
                }
                keys
                    .sort()
                    .reverse() // remove from end-to-start to preserve indexes
                    .forEach(key => value.splice(Number(key), 1)); // remove Array index
                break;
            case 'Object':
                (isEmpty(keys) ? ownKeys(value) : keys) // if no {keys}, assume all ownKeys
                    .forEach(key => Reflect.deleteProperty(value, key));
        }
        return value; // return Object reference, even though Object has been mutated
    }
    // These functions are to preserve the typescript 'type' of an object's keys & values
    // and will include both string and symbol keys
    /** array of all enumerable PropertyKeys */
    function ownKeys(json) {
        return ownEntries(json).map(([key]) => key);
    }
    /** array of all enumerable object values */
    function ownValues(json) {
        return ownEntries(json).map(([_, value]) => value);
    }
    /** tuple of enumerable entries with string | symbol keys */
    function ownEntries(json, all = false) {
        if (!json || typeof json !== 'object')
            return [];
        const getOwn = (obj) => {
            const tgt = obj[$Target] ?? obj; // unwrap if it's a proxy
            return Reflect.ownKeys(tgt)
                .filter(key => Object.getOwnPropertyDescriptor(tgt, key)?.enumerable)
                .map(key => [key, tgt[key]]);
        };
        if (!all)
            return getOwn(json);
        // all=true: collect per-level bottom-up, reverse to top-down, dedup via Map
        // Map preserves first-insertion position but allows value update (own key shadows ancestor)
        const levels = [];
        const limit = 50; // prevent infinite loops (increased from 10)
        let depth = 0;
        let proto = json;
        do {
            const t = proto[$Target] ?? proto; // CRITICAL: unwrap before checking marker to avoid trap recursion
            const lvl = getOwn(proto);
            if (lvl.length)
                levels.push(lvl);
            proto = Object.getPrototypeOf(t);
        } while (proto && proto !== Object.prototype && ++depth < limit);
        return [...new Map(levels.reverse().flat()).entries()];
    }
    /** return an Object containing all 'own' and 'inherited' enumerable properties */
    function allObject(json) {
        return Object.fromEntries(ownEntries(json, true));
    }
    /** get a string-array of 'getter' names for an object */
    const getAccessors = (obj = {}) => {
        return ownAccessors(obj, 'get');
    };
    const ownAccessors = (obj = {}, type) => {
        const accessors = Object.getOwnPropertyDescriptors(obj.prototype || Object.getPrototypeOf(obj));
        return ownEntries(accessors)
            .filter(([_, descriptor]) => isFunction(descriptor[type]))
            .map(([key, _]) => key);
    };

    /** Javascript Runtimes */
    const CONTEXT = {
        'Unknown': 'unknown',
        'Browser': 'browser',
        'NodeJS': 'nodejs',
        'GoogleAppsScript': 'google-apps-script',
    };
    /** determine JavaScript environment context */
    const getContext = () => {
        const global = globalThis;
        if (isDefined(global.SpreadsheetApp))
            return { global, type: CONTEXT.GoogleAppsScript };
        if (isDefined(global.window?.document))
            return { global, type: CONTEXT.Browser };
        if (isDefined(global.process?.versions?.node))
            return { global, type: CONTEXT.NodeJS };
        return { global, type: CONTEXT.Unknown };
    };
    // useful for those times when a full Enumify object is not needed, but still lock the Object from mutations
    /** deep-freeze an Array | Object to make it immutable */
    function secure(obj) {
        if (isReference(obj)) // skip primitive values
            ownValues(obj) // retrieve the properties on obj
                .forEach(val => Object.isFrozen(val) || secure(val)); // secure each value, if not already Frozen
        return Object.freeze(obj); // freeze the object itself
    }

    /** curry a Function to allow partial calls */
    function curry(fn) {
        return function curried(...args) {
            return (args.length >= fn.length)
                ? fn(...args)
                : (...nextArgs) => curried(...args, ...nextArgs);
        };
    }
    const wm = new WeakMap();
    /** define a Descriptor for an Object's memoized-method */
    function memoizeMethod(name, fn) {
        return {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function (...args) {
                const key = `${String(name)},${JSON.stringify(args)}`;
                let cache = wm.get(this);
                if (!cache) { // add a new object into the WeakMap
                    cache = Object.create(null);
                    wm.set(this, cache);
                }
                if (isUndefined(cache[key])) { // first time for this method
                    cache[key] = fn.apply(this, args); // evaluate the method
                    secure(cache[key]); // freeze the returned value
                }
                return cache[key];
            }
        };
    }

    /** registry of registered classes */
    // DO NOT EDIT THIS VALUE: used by decorator.library.ts
    const Registry = new Map();
    // be aware that 'structuredClone' preserves \<undefined> values...  
    // and JSON.stringify() does not
    /** make a deep-copy, using standard browser or JSON functions */
    function clone(obj, opts) {
        try {
            return globalThis.structuredClone(obj, opts);
        }
        catch {
            return cleanify(obj); // fallback to JSON functions
        }
    }
    /** return a copy. remove unsupported values (e.g. \<undefined>, function) */
    function cleanify(obj) {
        try {
            return JSON.parse(JSON.stringify(obj)); // run any toString() methods
        }
        catch (error) {
            console.warn('Could not clean object: ', obj);
            return { ...obj };
        }
    }
    /** deep-copy an Object, and optionally replace \<undefined> fields with a Sentinel function call	*/
    function cloneify(obj, sentinel) {
        try {
            return objectify(stringify(obj), sentinel);
        }
        catch (error) {
            console.warn('Could not cloneify object: ', obj);
            console.warn('stack: ', error.stack);
            return obj;
        }
    }
    function replacer(key, obj) { return isEmpty(key) ? obj : stringize(obj); }
    function reviver(_key, val) { return decode(val); }
    // safe-characters [sp " ; < > [ ] ^ { | }]
    const safeList = ['20', '22', '3B', '3C', '3E', '5B', '5D', '5E', '7B', '7C', '7D'];
    /** encode control characters, then replace a safe-subset back to text-string */
    function encode(val) {
        let enc = encodeURI(val);
        if (enc.includes('%')) { // if an encoded URI might be in string
            safeList.forEach(code => {
                const uri = '%' + code;
                const reg = new RegExp(uri, 'g');
                enc = enc.replace(reg, decodeURI(uri));
            });
        }
        return enc;
    }
    /** decode control characters */
    function decode(val) {
        if (isString(val)) {
            try {
                return decodeURI(val); // might fail if badly encoded '%'
            }
            catch (error) {
                // console.warn(`decodeURI: ${(error as Error).message} -> ${val}`);
            }
        }
        return val; // return original value
    }
    /** check type can be stringify'd */
    function isStringable(val) {
        return !isType(val, 'Function', 'AsyncFunction', 'WeakMap', 'WeakSet', 'WeakRef');
    }
    /** string representation of a single key:value Object */
    function oneKey(type, value) {
        return `{"$${type}":${value}}`;
    }
    /** Symbols in an Object-key will need special treatment */
    function fromSymbol(key) {
        return stringize(isSymbol(key) // @@(name) for global, @(name) for local symbols
            ? `${isSymbolFor(key) ? '@' : ''}@(${key.description ?? ''})`
            : key);
    }
    const symKey = /^@(@)?\(([^\)]*)\)$/; // pattern to match a stringify'd Symbol
    /** reconstruct a Symbol from a string-representation of a key */
    function toSymbol(value) {
        const [pat, keyFor, desc] = value.toString().match(symKey) || [null, undefined, undefined];
        switch (true) {
            case isSymbol(value): // already a Symbol
            case isNullish(pat): // incorrectly encoded Symbol
            case isDefined(keyFor) && isUndefined(desc): // incorrectly encoded global Symbol
                return value;
            case isDefined(keyFor): // global Symbol
                return Symbol.for(desc);
            case isUndefined(keyFor): // local Symbol
            default:
                return Symbol(desc);
        }
    }
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
    function stringify(obj) {
        return stringize(obj, false);
    }
    /**
     * internal function to process stringify-requests (and hide second parameter)
     * where first argument is the object to stringify, and
     * the second argument is a boolean to indicate if function is being called recursively
     */
    function stringize(obj, recurse = true) {
        const arg = asType(obj);
        const one = curry(oneKey)(arg.type); // curry the oneKey() function
        switch (arg.type) {
            case 'String':
                if (!recurse) { // if a top-level string (e.g. 'true' or '1234')
                    recurse = arg.value === 'true' // ensure true|false|null|1234 are quoted by JSON.stringify
                        || arg.value === 'false' // so they will be correctly identified during objectify()
                        || arg.value === 'null'
                        || parseFloat(arg.value).toString() === arg.value;
                }
                return recurse
                    ? JSON.stringify(encode(arg.value)) // encode string for safe-storage
                    : encode(arg.value); // dont JSON.stringify a top-level string
            case 'Boolean':
            case 'Null':
            case 'Number':
                return JSON.stringify(arg.value); // JSON.stringify will correctly handle these
            case 'Void':
            case 'Undefined':
                return one(JSON.stringify('void')); // preserve 'undefined' values		
            case 'BigInt':
                return one(arg.value.toString()); // even though BigInt has a toString method, it is not supported in JSON.stringify
            case 'Object':
                const obj = ownEntries(arg.value)
                    .filter(([, val]) => isStringable(val))
                    .map(([key, val]) => `${fromSymbol(key)}: ${stringize(val)}`)
                    .join(',');
                return `{${obj}}`;
            case 'Array':
                const arr = arg.value
                    .filter(val => isStringable(val))
                    .map(val => stringize(val))
                    .join(',');
                return `[${arr}]`;
            case 'Map':
                const map = Array.from(arg.value.entries())
                    .filter(([, val]) => isStringable(val))
                    .map(([key, val]) => `[${stringize(key)}, ${stringize(val)}]`)
                    .join(',');
                return one(`[${map}]`);
            case 'Set':
                const set = Array.from(arg.value.values())
                    .filter(val => isStringable(val))
                    .map(val => stringize(val))
                    .join(',');
                return one(`[${set}]`);
            case 'Symbol':
                return one(fromSymbol(arg.value));
            case 'RegExp':
                return one(stringize({ source: arg.value.source, flags: arg.value.flags }));
            case 'Class':
            default:
                const value = arg.value;
                switch (true) {
                    case !isStringable(value): // Object is not stringify-able
                        return undefined;
                    case isFunction(value.toJSON): // Object has its own toJSON method
                        return one(stringize(value.toJSON()));
                    case isFunction(value.toString): // Object has its own toString method
                        const str = value.toString();
                        return one(str.includes('"') // TODO: improve detection of JSON vs non-JSON strings
                            ? str
                            : JSON.stringify(str));
                    case isFunction(value.valueOf): // Object has its own valueOf method		
                        return one(JSON.stringify(value.valueOf()));
                    default: // else standard stringify
                        return one(JSON.stringify(value, replacer));
                }
        }
    }
    /** rebuild an Object from its stringified representation */
    function objectify(str, sentinel) {
        if (!isString(str))
            return str; // skip parsing
        let parse;
        try {
            parse = JSON.parse(str, reviver); // catch if cannot parse
        }
        catch (error) {
            if (str.startsWith('"') && str.endsWith('"')) {
                console.warn(`objectify.parse: -> ${str}, ${error.message}`);
                return str; // bail-out
            }
            else
                return objectify(`"${str}"`, sentinel); // have another try, quoted
        }
        switch (true) {
            case str.startsWith('{') && str.endsWith('}'): // looks like Object
            case str.startsWith('[') && str.endsWith(']'): // looks like Array
                return traverse(parse, sentinel); // recurse into object
            default:
                return parse;
        }
    }
    /** recurse into Object / Array, looking for special single key:value Objects */
    function traverse(obj, sentinel) {
        if (isObject(obj)) {
            return typeify(ownEntries(obj)
                .reduce((acc, [key, val]) => Object.assign(acc, { [toSymbol(key)]: typeify(traverse(val, sentinel)) }), {}), sentinel);
        }
        if (isArray(obj)) {
            return ownValues(obj)
                .map(val => typeify(traverse(val, sentinel)));
        }
        return obj;
    }
    /** rebuild an Object from its single key:value representation */
    function typeify(json, sentinel) {
        if (!isObject(json) || ownKeys(json).length !== 1)
            return json; // only JSON Objects, with a single key:value pair
        const [$type, value] = ownEntries(json)[0];
        if (!String($type).startsWith('$'))
            return json; // not a serialized single key:value Object
        const type = $type.substring(1); // remove '$' prefix
        switch (type) {
            case 'String':
            case 'Boolean':
            case 'Object':
            case 'Array':
                return value; // these types are already handled by traverse()
            case 'Number':
                return Number(value);
            case 'BigInt':
                return BigInt(value);
            case 'Null':
                return null;
            case 'Undefined':
            case 'Empty':
            case 'Void':
                return sentinel?.(); // run Sentinel function to handle undefined values
            case 'Date':
                return new Date(value);
            case 'RegExp':
                return new RegExp(value.source, value.flags);
            case 'Symbol':
                return toSymbol(value);
            case 'Map':
                return new Map(value);
            case 'Set':
                return new Set(value);
            default:
                const cls = Registry.get($type); // lookup registered Class
                if (!cls) {
                    console.warn(`objectify: dont know how to deserialize '${type}'`);
                    return json; // return original JSON object
                }
                return Reflect.construct(cls, [value]); // create new Class instance
        }
    }

    /**
     * Some interesting Class Decorators
     */
    /** decorator to freeze a Class to prevent modification */
    function Immutable(value, { kind, name, addInitializer }) {
        name = String(name);
        switch (kind) {
            case 'class':
                const wrapper = {
                    [name]: class extends value {
                        constructor(...args) {
                            super(...args);
                            Object.freeze(this); // freeze the instance
                        }
                    }
                }[name];
                addInitializer(() => {
                    const protect = (obj) => {
                        ownEntries(Object.getOwnPropertyDescriptors(obj))
                            .filter(([name]) => name !== 'constructor') // dont touch the constructor
                            .forEach(([name, { configurable, writable }]) => {
                            if (configurable) {
                                const update = { configurable: false };
                                if (writable)
                                    update.writable = false; // only data descriptors have 'writable'
                                Object.defineProperty(obj, name, update);
                            }
                        });
                    };
                    protect(value); // protect original static members
                    protect(value.prototype); // protect original prototype members
                    protect(wrapper); // protect wrapper static members
                    protect(wrapper.prototype); // protect wrapper prototype members
                });
                return wrapper;
            default:
                throw new Error(`@Immutable decorating unknown 'kind': ${kind} (${name})`);
        }
    }
    /** register a Class for serialization */
    function Serializable(value, { kind, name, addInitializer }) {
        name = String(name); // cast as String
        switch (kind) {
            case 'class':
                addInitializer(() => Registry.set(`$${name}`, value)); // register the class for serialization, via its toString() method
                return value;
            default:
                throw new Error(`@Serializable decorating unknown 'kind': ${kind} (${name})`);
        }
    }

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
        (class {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                _classThis = _classDescriptor.value;
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
        });
        return _classThis;
    })();

    /** Get nested value */
    function extract(obj, path, dflt) {
        if (isEmpty(path))
            return obj; // finished searching
        if (!isObject(obj) && !isArray(obj))
            return obj;
        return path
            .toString()
            .replace(/\[([^\[\]]*)\]/g, '.$1.') // convert [indexes] to properties
            .split('.')
            .filter(field => !isEmpty(field)) // remove empty fields
            .reduce((acc, field) => acc?.[field] ?? null, obj) ?? dflt;
    }
    /** extract only defined values from Object */
    function ifDefined(obj) {
        return ownEntries(obj)
            .reduce((acc, [key, val]) => {
            if (isDefined(val))
                acc[key] = val;
            return acc;
        }, {});
    }
    function looseIndex(arg) {
        if (isDefined(arg))
            return isFunction(arg) ? arg() : arg;
        return (obj) => isFunction(obj) ? obj() : obj;
    }
    /** loose object with symbols values */
    looseIndex.stringSymbol = looseIndex();
    /** loose object with symbol keys and RegExp values */
    looseIndex.symbolRegExp = looseIndex();
    /** loose object with symbol keys and string values */
    looseIndex.symbolString = looseIndex();
    /** loose object with string keys and string values */
    looseIndex.stringString = looseIndex();

    function asArray(arr = [], fill) {
        switch (true) {
            case isArrayLike(arr): // allow for {length:nn} objects
            case isIterable(arr) && !isString(arr): // dont iterate Strings
                return Array.from(arr, val => {
                    return isUndefined(fill) || isDefined(val)
                        ? val // if no {fill}, then use {val}
                        : clone(fill); // clone {fill} to create new Objects
                });
            default:
                return Array.of(arr);
        }
    }
    /** stringify if not nullish */
    function asString(str) {
        return isNullish(str)
            ? ''
            : isInteger(str)
                ? str.toString() + 'n'
                : stringify(str);
    }
    /** convert String | Number | BigInt to Number */
    function asNumber(str) {
        return parseFloat(str?.toString() ?? 'NaN');
    }
    /** convert String | Number to BigInt */
    function asInteger(str) {
        const arg = asType(str);
        switch (arg.type) {
            case 'BigInt':
                return arg.value; // already a BigInt
            case 'Number':
                return BigInt(Math.trunc(arg.value)); // cast as BigInt
            case 'String':
                return (isIntegerLike(arg.value)) // String representation of a BigInt
                    ? BigInt(arg.value.slice(0, -1)) // get rid of trailing 'n'
                    : BigInt(arg.value);
            default:
                return str;
        }
    }
    /** test if can convert String to Numeric */
    function isNumeric(str) {
        const arg = asType(str);
        switch (arg.type) {
            case 'Number':
            case 'BigInt':
                return true;
            case 'String':
                return isIntegerLike(arg.value)
                    ? true // is Number | BigInt
                    : !isNaN(asNumber(str)) && isFinite(str); // test if Number
            default:
                return false;
        }
    }
    /** return as Number if possible, else original String */
    const ifNumeric = (str, stripZero = false) => {
        switch (true) {
            case isInteger(str): // BigInt → Number
                return Number(str);
            case isNumber(str): // Number → as-is
                return str;
            case isNumeric(str) && (!str?.toString().startsWith('0') || stripZero):
                return asNumber(str); // numeric String → Number
            default:
                return str; // non-numeric String → as-is
        }
    };

    const context = getContext();
    let storage = context.type === CONTEXT.Browser
        ? context.global?.localStorage //as globalThis.Storage		// default to localStorage in a browser
        : undefined;
    function getStorage(key, dflt) {
        let store;
        if (isUndefined(key))
            return dflt ?? {};
        switch (context.type) {
            case CONTEXT.Browser:
                store = storage.getItem(key);
                break;
            case CONTEXT.NodeJS:
                store = context.global.process.env[key];
                break;
            case CONTEXT.GoogleAppsScript:
                store = context.global.PropertiesService?.getUserProperties().getProperty(key);
                break;
            default:
                throw new Error(`Cannot determine Javascript context: ${context.type}`);
        }
        return isString(store)
            ? objectify(store) // rebuild object from its stringified representation
            : dflt;
    }
    /** set / delete storage */
    function setStorage(key, val) {
        const stash = isDefined(val) ? stringify(val) : undefined;
        const set = isDefined(stash);
        switch (context.type) {
            case CONTEXT.Browser:
                set
                    ? storage.setItem(key, stash)
                    : storage.removeItem(key);
                break;
            case CONTEXT.NodeJS:
                set
                    ? (context.global.process.env[key] = stash)
                    : (delete context.global.process.env[key]);
                break;
            case CONTEXT.GoogleAppsScript:
                set
                    ? context.global.PropertiesService?.getUserProperties().setProperty(key, stash)
                    : context.global.PropertiesService?.getUserProperties().deleteProperty(key);
                break;
            default:
                throw new Error(`Cannot determine Javascript context: ${context.type}`);
        }
    }

    /** Node.js custom inspection symbol */
    const $Inspect = Symbol.for('nodejs.util.inspect.custom');
    /** Stealth Proxy pattern to allow for iteration and logging over a Frozen object */
    function getProxy(target) {
        secure(target);
        const tgt = target[$Target] ?? target;
        let cachedJSON;
        return new Proxy(target, {
            isExtensible: (t) => Reflect.isExtensible(t),
            preventExtensions: (t) => Reflect.preventExtensions(t),
            getOwnPropertyDescriptor: (_, key) => Reflect.getOwnPropertyDescriptor(tgt, key),
            getPrototypeOf: () => Reflect.getPrototypeOf(tgt),
            deleteProperty: (_, key) => Reflect.deleteProperty(tgt, key),
            ownKeys: () => Reflect.ownKeys(tgt),
            has: (_, key) => Reflect.has(tgt, key),
            set: (_, key, val) => Reflect.set(tgt, key, val),
            get: (_, key, receiver) => {
                if (key === $Target)
                    return tgt; // found the 'stop' marker
                if (key === $Inspect || key === 'toJSON') { // two special properties require virtual closures
                    const own = Object.getOwnPropertyDescriptor(tgt, key);
                    if (own && isFunction(own.value)) // if object already has its own toJSON, return
                        return own.value;
                    if (!cachedJSON) { // otherwise, create a virtual closure
                        const result = allObject(receiver); // resolve full-object representation
                        cachedJSON = () => result; // memoize for subsequent calls
                    }
                    return cachedJSON; // return the memoized closure
                }
                const val = Reflect.get(tgt, key, receiver);
                return (typeof val === 'function') // if the value is a function
                    ? val.bind(tgt) // bind it to the target
                    : val; // else return the value
            },
        });
    }

    // General <string> functions
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // This section needs to be Function declarations so that they are hoisted
    // (because they are referenced in prototype.library)
    /**
     * clean a string to remove some standard control-characters (tab, line-feed, carriage-return) and trim redundant spaces.
     * allow for optional RegExp to specify additional match
     */
    function trimAll(str, pat) {
        return str
            .toString() // coerce to String
            .replace(pat, '') // remove regexp, if supplied
            .replace(/\t/g, ' ') // replace <tab> with <space>
            .replace(/(\r\n|\n|\r)/g, ' ') // replace <return> & <newline>
            .replace(/\s{2,}/g, ' ') // trim multiple <space>
            .trim(); // leading/trailing <space>
    }
    /** every word has its first letter capitalized */
    function toProperCase(...str) {
        return str
            .flat() // in case {str} was already an array
            .map(text => text.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()))
            .join(' ');
    }
    function sprintf(fmt, ...msg) {
        const regexp = /\$\{(\d)\}/g; // pattern to find "${digit}" parameter markers
        let sfmt = asString(fmt); // avoid mutate fmt
        if (!isString(fmt)) { // might be an Object
            msg.unshift(JSON.stringify(fmt)); // push to start of msg[]
            sfmt = ''; // reset the string-format
        }
        let cnt = 0; // if the format does not contain a corresponding '${digit}' then re-construct the parameters
        sfmt = sfmt.replace(/%[sj]/g, _ => `\${${cnt++}}`); // flip all the %s or %j to a ${digit} parameter
        const params = Array.from(sfmt.matchAll(regexp))
            .map(match => Number(match[1])); // which parameters are in the fmt
        msg.forEach((_, idx) => {
            if (!params.includes(idx)) // if more args than params
                sfmt += `${sfmt.length === 0 ? '' : sfmt.endsWith(':') ? ' ' : ', '}\${${idx}}`; //  append a dummy params to fmt
        });
        // 2024-02-21  some Objects do not have a .toString method
        return sfmt.replace(regexp, (_, idx) => msg[idx]?.toString?.() || stringify(msg[idx]));
    }
    /** strip a plural suffix, if endsWith 's' */
    const singular = (val) => val.endsWith('s') ? val.slice(0, -1) : val;
    /**
     * pad a string with leading character
     * @param		nbr	input value to pad
     * @param		len	fill-length (default: 2)
     * @param		fill	character (default \<space> for string and \<zero> for number)
     * @returns	fixed-length string padded on the left with fill-character
     */
    const pad = (nbr = 0, len = 2, fill) => nbr.toString().padStart(len, nullToValue(fill, isNumeric(nbr) ? '0' : ' ').toString());

    /** used to identify the Enumify type */ const tag = 'Enumify';
    /** helper method to create a property descriptor */
    function value(val) {
        return {
            enumerable: false,
            configurable: false,
            writable: false,
            value: val
        };
    }
    /**
     * private instance of the Enum Prototype, which is then Used to create each new Object-Enum
    */
    const ENUM = secure(Object.create(null, {
        count: memoizeMethod('count', function () { return this.entries().length; }),
        keys: memoizeMethod('keys', function () { return this.entries().map(([key]) => key); }),
        values: memoizeMethod('values', function () { return this.entries().map(([_, val]) => val); }),
        entries: memoizeMethod('entries', function () { return ownEntries(this, true); }),
        invert: memoizeMethod('invert', function () { return enumify(this.entries().reduce((acc, [key, val]) => ({ ...acc, [val]: key }), {})); }),
        toString: memoizeMethod('toString', function () { return stringify(this.toJSON()); }),
        has: value(function (key) { return this.keys().includes(key); }),
        includes: value(function (search) { return this.values().includes(search); }),
        keyOf: value(function (search) { return this.invert()[search]; }),
        extend: value(function (list) { return enumify.call(this, list); }),
        forEach: value(function (fn, thisArg) { this.entries().forEach((entry, index) => fn.call(thisArg, entry, index, this)); }),
        filter: value(function (fn, thisArg) { return enumify(this.entries().reduce((acc, entry, index) => (fn.call(thisArg, entry, index, this) ? Object.assign(acc, { [entry[0]]: entry[1] }) : acc), {})); }),
        map: value(function (fn, thisArg) { return enumify(this.entries().reduce((acc, entry, index) => { const res = fn.call(thisArg, entry, index, this); return Object.assign(acc, isArray(res) && res.length === 2 ? { [res[0]]: res[1] } : { [entry[0]]: res }); }, {})); }),
        [Symbol.iterator]: value(function () { return this.entries()[Symbol.iterator](); }),
        [Symbol.toStringTag]: value(tag),
    }));
    function enumify(list) {
        const proto = this ?? ENUM;
        const arg = asType(list);
        let stash = {};
        switch (arg.type) {
            case 'Enumify':
            case 'Object':
                Object.assign(stash, arg.value);
                break;
            case 'Array':
                arg.value.forEach((key, index) => {
                    if (isNumber(key))
                        throw new Error('Enumify: numeric keys are not supported');
                    Object.assign(stash, { [key]: index });
                });
                break;
            default:
                throw new Error(`Enumify: invalid argument type: ${arg.type}`);
        }
        const target = Object.create(proto, Object.getOwnPropertyDescriptors(stash));
        return getProxy(target);
    }
    /** create an entry in the Serialization Registry to describe how to rebuild an Enum */
    let Enumify = (() => {
        let _classDecorators = [Serializable];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        (class {
            static { _classThis = this; }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                __runInitializers(_classThis, _classExtraInitializers);
            }
            constructor(list) {
                return enumify(list);
            }
        });
        return _classThis;
    })();

    /**
     * Various enumerations used throughout Tempo library.
     * These are exported and added as static getters of the Tempo class.
     * Usage example:
     * ```typescript
     * 			const dayNames = Tempo.WEEKDAY.keys();	// ['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
     * ```
     */
    /** */
    const WEEKDAY = enumify(['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    const WEEKDAYS = enumify(['Everyday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    const MONTH = enumify(['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    const MONTHS = enumify(['Every', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
    const SEASON = enumify({ Summer: 'summer', Autumn: 'autumn', Winter: 'winter', Spring: 'spring' });
    const COMPASS = enumify({ North: 'north', East: 'east', South: 'south', West: 'west' });
    /** number of seconds in a time unit */
    const DURATION = enumify({
        /** approx number of seconds in a year */ year: 31_536_000,
        /** approx number of seconds in a month */ month: 2_628_000,
        /** number of seconds in a week */ week: 604_800,
        /** number of seconds in a day */ day: 86_400,
        /** number of seconds in an hour */ hour: 3_600,
        /** number of seconds in a minute */ minute: 60,
        /** one second */ second: 1,
        /** number of seconds in a millisecond */ millisecond: .001,
        /** number of seconds in a microsecond */ microsecond: .000_001,
        /** number of seconds in a nanosecond */ nanosecond: .000_000_001,
    });
    /** number of milliseconds in a time unit */
    const DURATIONS = enumify({
        /** approx number of milliseconds in a year */ years: DURATION.year * 1_000,
        /** approx number of milliseconds in a month */ months: DURATION.month * 1_000,
        /** number of milliseconds in a week */ weeks: DURATION.week * 1_000,
        /** number of milliseconds in a day */ days: DURATION.day * 1_000,
        /** number of milliseconds in an hour */ hours: DURATION.hour * 1_000,
        /** number of milliseconds in a minute */ minutes: DURATION.minute * 1_000,
        /** number of milliseconds in a second */ seconds: DURATION.second * 1_000,
        /** one millisecond */ milliseconds: DURATION.millisecond * 1_000,
        /** number of milliseconds in a microsecond */ microseconds: DURATION.microsecond * 1_000,
        /** number of milliseconds in a nanosecond */ nanoseconds: Number((DURATION.nanosecond * 1_000).toPrecision(6)),
    });
    /** pre-defined Format code short-cuts */
    const FORMAT = enumify({
        /** useful for standard date display */ display: '{www}, {dd} {mmm} {yyyy}',
        /** useful for standard datestamps */ weekDate: '{www}, {yyyy}-{mmm}-{dd}',
        /** useful for standard timestamps */ weekTime: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}',
        /** useful for standard full timestamps */ weekStamp: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}',
        /** useful for readable month and day */ dayMonth: '{dd}-{mmm}',
        /** useful for Date */ dayDate: '{dd}-{mmm}-{yyyy}',
        /** display with Time */ dayTime: '{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}',
        /** useful for stamping logs */ logStamp: '{yyyy}{mm}{dd}T{hhmiss}.{ff}',
        /** useful for sorting display-strings */ sortTime: '{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}',
        /** useful for sorting week order */ yearWeek: '{wy}{ww}',
        /** useful for sorting month order */ yearMonth: '{yyyy}{mm}',
        /** useful for sorting date order */ yearMonthDay: '{yyyy}{mm}{dd}',
        /** just Date portion */ date: '{yyyy}-{mm}-{dd}',
        /** just Time portion */ time: '{hh}:{mi}:{ss}',
    });
    const LIMIT = secure({
        /** Tempo(31-Dec-9999.23:59:59).ns */ maxTempo: Temporal.Instant.from('9999-12-31T23:59:59.999999999+00:00').epochNanoseconds,
        /** Tempo(01-Jan-1000.00:00:00).ns */ minTempo: Temporal.Instant.from('1000-01-01T00:00+00:00').epochNanoseconds,
    });
    const ELEMENT = enumify({
        yy: 'year',
        mm: 'month',
        ww: 'week',
        dd: 'day',
        hh: 'hour',
        mi: 'minute',
        ss: 'second',
        ms: 'millisecond',
        us: 'microsecond',
        ns: 'nanosecond',
    });
    const MUTATION = enumify(ELEMENT.values()).extend(['event', 'period', 'clock', 'time', 'date', 'start', 'mid', 'end']);
    const ZONED_DATE_TIME = enumify(['value', 'timeZoneId', 'calendarId', 'monthCode', 'offset', 'timeZone']).extend(ELEMENT.values());
    const OPTION = enumify(['value', 'mdyLocales', 'mdyLayouts', 'store', 'discovery', 'debug', 'catch', 'timeZone', 'calendar', 'locale', 'pivot', 'sphere', 'timeStamp', 'snippet', 'layout', 'event', 'period', 'formats', 'plugins']);
    const PARSE = enumify(['mdyLocales', 'mdyLayouts', 'formats', 'pivot', 'snippet', 'layout', 'event', 'period', 'anchor', 'value', 'discovery', 'plugins']);
    const DISCOVERY = enumify(['options', 'timeZones', 'terms', 'plugins']);

    var tempo_enum = /*#__PURE__*/Object.freeze({
        __proto__: null,
        COMPASS: COMPASS,
        DISCOVERY: DISCOVERY,
        DURATION: DURATION,
        DURATIONS: DURATIONS,
        ELEMENT: ELEMENT,
        FORMAT: FORMAT,
        LIMIT: LIMIT,
        MONTH: MONTH,
        MONTHS: MONTHS,
        MUTATION: MUTATION,
        OPTION: OPTION,
        PARSE: PARSE,
        SEASON: SEASON,
        WEEKDAY: WEEKDAY,
        WEEKDAYS: WEEKDAYS,
        ZONED_DATE_TIME: ZONED_DATE_TIME
    });

    const SCHEMA = [
        ['year', 'yy'],
        ['month', 'mm'],
        ['day', 'dd'],
        ['hour', 'hh'],
        ['minute', 'mi'],
        ['second', 'ss'],
        ['millisecond', 'ms'],
        ['microsecond', 'us'],
        ['nanosecond', 'ns']
    ];
    /**
     * find where a Tempo fits within a range of DateTime
     */
    function getTermRange(tempo, list, keyOnly = true) {
        const sorted = [...list]
            .sortBy('year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond')
            .toReversed();
        const match = sorted
            .find(range => {
            for (const [rKey, sKey] of SCHEMA) {
                const val = range[rKey];
                if (isDefined(val)) {
                    const sVal = tempo[sKey];
                    if (sVal > val)
                        return true;
                    if (sVal < val)
                        return false;
                }
            }
            return true; // fallback if DateTime exactly matches a range criteria
        })
            ?? sorted.at(0); // fallback to wraparound at first item
        return keyOnly
            ? match?.key
            : match;
    }

    /** definition of fiscal quarter ranges */
    const ranges$3 = [
        [
            { key: 'Q1', day: 1, month: 1, fiscal: 0, sphere: COMPASS.North },
            { key: 'Q2', day: 1, month: 4, fiscal: 0, sphere: COMPASS.North },
            { key: 'Q3', day: 1, month: 7, fiscal: 0, sphere: COMPASS.North },
            { key: 'Q4', day: 1, month: 10, fiscal: 0, sphere: COMPASS.North },
        ], [
            { key: 'Q1', day: 1, month: 7, fiscal: 1, sphere: COMPASS.South },
            { key: 'Q2', day: 1, month: 10, fiscal: 1, sphere: COMPASS.South },
            { key: 'Q3', day: 1, month: 1, fiscal: 0, sphere: COMPASS.South },
            { key: 'Q4', day: 1, month: 4, fiscal: 0, sphere: COMPASS.South },
        ]
    ];
    const key$3 = 'qtr';
    const scope$3 = 'quarter';
    const description$3 = 'Fiscal Quarter';
    /** determine where the current Tempo instance fits within the above range */
    function define$3(keyOnly) {
        const { yy, config: { sphere } } = this;
        const south = sphere !== COMPASS.North; // false = North, true = South
        const list = cloneify(ranges$3[+south]); // deep clone the range
        list.forEach(itm => itm.fiscal += yy); // calc the fiscal-year for quarter
        return getTermRange(this, list, keyOnly); // return the range
    }

    /** definition of meteorological season ranges */
    const ranges$2 = [
        [
            { key: 'Spring', day: 20, month: 3, symbol: 'Flower', sphere: COMPASS.North },
            { key: 'Summer', day: 21, month: 6, symbol: 'Sun', sphere: COMPASS.North },
            { key: 'Autumn', day: 23, month: 9, symbol: 'Leaf', sphere: COMPASS.North },
            { key: 'Winter', day: 22, month: 12, symbol: 'Snowflake', sphere: COMPASS.North },
        ], [
            { key: 'Spring', day: 1, month: 9, symbol: 'Flower', sphere: COMPASS.South },
            { key: 'Summer', day: 1, month: 12, symbol: 'Sun', sphere: COMPASS.South },
            { key: 'Autumn', day: 1, month: 3, symbol: 'Leaf', sphere: COMPASS.South },
            { key: 'Winter', day: 1, month: 6, symbol: 'Snowflake', sphere: COMPASS.South },
        ], [
            { key: 'Spring', day: 1, month: 3, symbol: 'Flower', trait: 'A time of renewal and growth' },
            { key: 'Summer', day: 1, month: 6, symbol: 'Sun', trait: 'A period of heat and fruition' },
            { key: 'Autumn', day: 1, month: 9, symbol: 'Leaf', trait: 'A time for harvest and contraction' },
            { key: 'Winter', day: 1, month: 12, symbol: 'Snowflake', trait: 'A period of stillness and consolidation' },
        ]
    ];
    const key$2 = 'szn';
    const scope$2 = 'season';
    const description$2 = 'Meteorlogical season';
    /** determine where the current Tempo instance fits within the above range */
    function define$2(keyOnly) {
        const { config: { sphere } } = this;
        const south = sphere !== COMPASS.North; // false = North, true = South
        const list = cloneify(ranges$2[+south]);
        if (!keyOnly) {
            const cn = getTermRange(this, ranges$2[2], false); // get the chinese season for the current day/month
            list.forEach(item => item['CN'] = cn); // add the chinese season to each range item
        }
        return getTermRange(this, list, keyOnly);
    }

    /** definition of astrological zodiac ranges */
    const ranges$1 = [
        [
            { key: 'Aquarius', day: 20, month: 1, symbol: 'Ram', longitude: 300, planet: 'Uranus' },
            { key: 'Pisces', day: 19, month: 2, symbol: 'Fish', longitude: 330, planet: 'Neptune' },
            { key: 'Aries', day: 21, month: 3, symbol: 'Ram', longitude: 0, planet: 'Mars' },
            { key: 'Taurus', day: 20, month: 4, symbol: 'Bull', longitude: 30, planet: 'Venus' },
            { key: 'Gemini', day: 21, month: 5, symbol: 'Twins', longitude: 60, planet: 'Mercury' },
            { key: 'Cancer', day: 22, month: 6, symbol: 'Crab', longitude: 90, planet: 'Moon' },
            { key: 'Leo', day: 23, month: 7, symbol: 'Lion', longitude: 120, planet: 'Sun' },
            { key: 'Virgo', day: 23, month: 8, symbol: 'Maiden', longitude: 150, planet: 'Mercury' },
            { key: 'Libra', day: 23, month: 9, symbol: 'Scales', longitude: 180, planet: 'Venus' },
            { key: 'Scorpio', day: 23, month: 10, symbol: 'Scorpion', longitude: 210, planet: 'Pluto & Mars' },
            { key: 'Sagittarius', day: 22, month: 11, symbol: 'Centaur', longitude: 240, planet: 'Jupiter' },
            { key: 'Capricorn', day: 22, month: 12, symbol: 'Goat', longitude: 270, planet: 'Saturn' },
        ], [
            { key: 'Rat', traits: 'Adaptable, clever' },
            { key: 'Ox', traits: 'Diligent, strong' },
            { key: 'Tiger', traits: 'Passionate, courageous' },
            { key: 'Rabbit', traits: 'Artistic, gentle' },
            { key: 'Dragon', traits: 'Powerful, charismatic' },
            { key: 'Snake', traits: 'Wise, intuitive' },
            { key: 'Horse', traits: 'Energetic, independent' },
            { key: 'Goat', traits: 'Empathetic, calm' },
            { key: 'Monkey', traits: 'Smart, curious' },
            { key: 'Rooster', traits: 'Observant, hardworking' },
            { key: 'Dog', traits: 'Loyal, honest' },
            { key: 'Pig', traits: 'Compassionate, generous' },
        ], [
            { key: 'Wood' },
            { key: 'Fire' },
            { key: 'Earth' },
            { key: 'Metal' },
            { key: 'Water' },
        ]
    ];
    const key$1 = 'zdc';
    const scope$1 = 'zodiac';
    const description$1 = 'Astrological Zodiac sign';
    /** determine where the current Tempo instance fits within the above ranges */
    function define$1(keyOnly) {
        const list = cloneify(ranges$1[0]); // make a copy of the ranges array
        if (!keyOnly) {
            const cn = getChineseZodiac(this.yy); // get the chinese zodiac for the current year
            list.forEach(item => item['CN'] = cn); // add the chinese zodiac to each item
        }
        return getTermRange(this, list, keyOnly);
    }
    /** get the chinese zodiac for a given year */
    function getChineseZodiac(year) {
        const animalIndex = (year - 4) % 12; // calculate the animal index
        const elementIndex = Math.floor(((year - 4) % 10) / 2); // calculate the element index based on the last digit of the year
        const yinYang = year % 2 === 0 ? 'Yang' : 'Yin'; // determine Yin or Yang
        return {
            animal: ranges$1[1][animalIndex].key,
            traits: ranges$1[1][animalIndex].traits,
            element: ranges$1[2][elementIndex].key,
            yinYang: yinYang
        };
    }

    /** definition of daily time periods */
    const ranges = [
        { key: 'midnight', hour: 0 },
        { key: 'early', hour: 4 },
        { key: 'morning', hour: 8 },
        { key: 'midmorning', hour: 10 },
        { key: 'midday', hour: 12 },
        { key: 'afternoon', hour: 15, minute: 30 },
        { key: 'evening', hour: 18 },
        { key: 'night', hour: 20 },
    ];
    const key = 'per';
    const scope = 'period';
    const description = 'Daily time period';
    /** determine where the current Tempo instance fits within the above range */
    function define(keyOnly) {
        return getTermRange(this, ranges, keyOnly);
    }

    /**
     * Built-in term plugin registrations.
     *
     * This module exports a registration function to be called by tempo.class.ts.
     *
     * returns an array of Terms to be loaded into Tempo.#terms
     */
    var registerTerms = [
        { key: key$3, scope: scope$3, description: description$3, define: define$3 },
        { key: key$2, scope: scope$2, description: description$2, define: define$2 },
        { key: key$1, scope: scope$1, description: description$1, define: define$1 },
        { key: key, scope: scope, description: description, define: define },
    ];

    // BE VERY CAREFUL NOT TO BREAK THE REGEXP PATTERNS BELOW
    // TEMPO functionality heavily depends on these patterns
    /** common RegExp patterns */
    const Match = {
        /** match all {} pairs, if they start with a word char */ braces: /{([\w]+(?:\.[\w]+)*)}/g,
        /** named capture-group, if it starts with a letter */ captures: /\(\?<([a-zA-Z][\w]*)>(.*?)(?<!\\)\)/g,
        /** event */ event: /^(g|l)evt[0-9]+$/,
        /** period */ period: /^(g|l)per[0-9]+$/,
        /** two digit year */ twoDigit: /^[0-9]{2}$/,
        /** date */ date: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
        /** time */ time: /^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$/,
        /** hour-minute-second with no separator */ hhmiss: /(hh)(m[i|m])(ss)?/i,
        /** separator characters (/ - . ,) */ separator: /[\/\-\.\s,]/,
        /** modifier characters (+-<>=) */ modifier: /[\+\-\<\>][\=]?|this|next|prev|last/,
        /** offset post keywords (ago|hence) */ affix: /ago|hence/,
        /** strip out these characters from a string */ strips: /\(|\)/g,
        /** whitespace characters */ spaces: /\s+/g,
        /** Z character */ zed: /^Z$/,
    };
    /** Tempo Symbol registry */
    const Token = looseIndex()({
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Snippet Symbols
        /** year */ yy: Symbol('yy'),
        /** month */ mm: Symbol('mm'),
        /** day */ dd: Symbol('dd'),
        /** hour */ hh: Symbol('hh'),
        /** minute */ mi: Symbol('mi'),
        /** second */ ss: Symbol('ss'),
        /** fraction */ ff: Symbol('ff'),
        /** meridiem */ mer: Symbol('mer'),
        /** short weekday name */ www: Symbol('www'),
        /** relative-suffix */ afx: Symbol('afx'),
        /** time-suffix */ sfx: Symbol('sfx'),
        /** time unit */ unt: Symbol('unt'),
        /** separator */ sep: Symbol('sep'),
        /** modifier */ mod: Symbol('mod'),
        /** generic number */ nbr: Symbol('nbr'),
        /** Tempo event */ evt: Symbol('evt'),
        /** Tempo period */ per: Symbol('per'),
        /** time zone offset */ tzd: Symbol('tzd'),
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Layout Symbols
        /** date */ dt: Symbol('date'),
        /** time */ tm: Symbol('time'),
        /** date and time */ dtm: Symbol('dateTime'),
        /** day-month-year */ dmy: Symbol('dayMonthYear'),
        /** month-day-year */ mdy: Symbol('monthDayYear'),
        /** year-month-day */ ymd: Symbol('yearMonthDay'),
        /** day of month offset */ off: Symbol('offset'),
        /** weekDay */ wkd: Symbol('weekDay'),
        /** relative offset (years, days, hours, etc) */ rel: Symbol('relativeOffset'),
        /** timezone/calendar brackets */ brk: Symbol('brackets'),
    });
    /**
     * user will need to know these in order to configure their own patterns
     * Tempo.Snippet is a simple regex pattern object						e.g. { Symbol('yy'): /(([0-9]{2})?[0-9]{2})/ }
     * Tempo.Layout is a string-combination of Snippet names		e.g. '{yy}{sep}{mm}({sep}{dd})?{sfx}?'
     * Tempo.Pattern is a translation of a Layout/Snippets into an anchored regex.
     * The {pattern} is used to parse a string | number in the Tempo constructor {DateTime} argument
     */
    /**
     * a {snippet} is a simple, reusable regex pattern for a component of a date-time string (e.g. 'hh' or 'yy')
     */
    // Note: computed Components ('evt', 'per') are added during 'Tempo.init()' (for static) and/or 'new Tempo()' (per instance)
    const Snippet = looseIndex()({
        [Token.yy]: /(?<yy>([0-9]{2})?[0-9]{2})/, // arbitrary upper-limit of yy=9999
        [Token.mm]: /(?<mm>[0\s]?[1-9]|1[0-2]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/, // month-name (abbrev or full) or month-number 01-12
        [Token.dd]: /(?<dd>[0\s]?[1-9]|[12][0-9]|3[01])(?:\s?(?:st|nd|rd|th))?/, // day-number 01-31
        [Token.hh]: /(?<hh>2[0-4]|[01]?[0-9])/, // hour-number 00-24
        [Token.mi]: /(\:(?<mi>[0-5][0-9]))/, // minute-number 00-59
        [Token.ss]: /(\:(?<ss>[0-5][0-9]))/, // seconds-number 00-59
        [Token.ff]: /(\.(?<ff>[0-9]{1,9}))/, // fractional-seconds up-to 9-digits
        [Token.mer]: /(\s*(?<mer>am|pm))/, // meridiem suffix (am,pm)
        [Token.sfx]: /((?:{sep}+|T)({tm}){tzd}?)/, // time-pattern suffix 'T {tm} Z'
        [Token.wkd]: /(?<wkd>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)/, // day-name (abbrev or full)
        [Token.tzd]: /(?<tzd>Z|(?:\+(?:(?:0[0-9]|1[0-3]):?[0-5][0-9]|14:00)|-(?:(?:0[0-9]|1[0-1]):?[0-5][0-9]|12:00)))/, // time-zone offset	+14:00 to -12:00
        [Token.nbr]: /(?<nbr>[0-9]*)/, // modifier count
        [Token.afx]: new RegExp(`((s)? (?<afx>${Match.affix.source}))?{sep}?`), // affix optional plural 's' and (ago|hence)
        [Token.mod]: new RegExp(`((?<mod>${Match.modifier.source})?{nbr} *)`), // modifier (+,-,<,<=,>,>=) plus optional offset-count
        [Token.sep]: new RegExp(`(?:${Match.separator.source})`), // date-input separator character "/\\-., " (non-capture group)
        [Token.unt]: /(?<unt>year|month|week|day|hour|minute|second|millisecond)(?:s)?/, // useful for '2 days ago' etc
        [Token.brk]: /(\[(?<brk>[^\]]+)\](?:\[(?<cal>[^\]]+)\])?)?/, // timezone/calendar brackets [...]
    });
    /**
     * a {layout} is a Record of snippet-combinations describing an input DateTime argument
     * the Layout's keys are in the order that they will be checked against an input value
     */
    const Layout = looseIndex()({
        [Token.dt]: '({dd}{sep}?{mm}({sep}?{yy})?|{mod}?({evt}))', // calendar or event
        [Token.tm]: '({hh}{mi}?{ss}?{ff}?{mer}?|{per})', // clock or period
        [Token.dtm]: '({dt})(?:(?:{sep}+|T)({tm}))?{tzd}?{brk}?', // calendar/event and clock/period
        [Token.dmy]: '({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?', // day-month(-year)
        [Token.mdy]: '({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?', // month-day(-year)
        [Token.ymd]: '({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?', // year-month(-day)
        [Token.wkd]: '{mod}?{wkd}{afx}?{sfx}?', // special layout (no {dt}!) used for weekday calcs (only one that requires {wkd} pattern)
        [Token.off]: '{mod}?{dd}{afx}?', // day of month, with optional offset
        [Token.rel]: '{nbr}{sep}?{unt}{sep}?{afx}', // relative duration (e.g. 2 days ago)
    });
    /**
     * an {event} is a Record of regex-pattern-like-string keys that describe Date strings.
     * values can be a string or a function.
     * if assigning a function, use standard 'function()' syntax to allow for 'this' binding.
     * also, a function should always have a .toString() method which returns a parse-able Date string
     */
    const Event = looseIndex()({
        'new.?years? ?eve': '31 Dec',
        'nye': '31 Dec',
        'new.?years?( ?day)?': '01 Jan',
        'ny': '01 Jan',
        'christmas ?eve': '24 Dec',
        'christmas': '25 Dec',
        'xmas ?eve': '24 Dec',
        'xmas': '25 Dec',
        'now': function () { return this.toPlainDateTime(); },
        'today': function () { return this.toPlainDate(); },
        'tomorrow': function () { return this.toPlainDate().add({ days: 1 }); },
        'yesterday': function () { return this.toPlainDate().add({ days: -1 }); },
    });
    /**
     * a {period} is a Record of regex-pattern-like keys that describe pre-defined Time strings.
     * values can be a string or a function.
     * if using a function, use regular 'function()' syntax to allow for 'this' binding.
     */
    const Period = looseIndex()({
        'mid[ -]?night': '24:00',
        'morning': '8:00',
        'mid[ -]?morning': '10:00',
        'mid[ -]?day': '12:00',
        'noon': '12:00',
        'after[ -]?noon': '3:00pm',
        'evening': '18:00',
        'night': '20:00',
    });
    /**
     * a {timeZone} alias dictionary mapping common abbreviations to IANA strings.
     * Tempo will check this registry to convert abbreviations before passing them to Temporal.
     */
    const TimeZone = looseIndex()({
        'utc': 'UTC',
        'gmt': 'Europe/London',
        'est': 'America/New_York',
        'cst': 'America/Chicago',
        'mst': 'America/Denver',
        'pst': 'America/Los_Angeles',
        'aest': 'Australia/Sydney',
        'acst': 'Australia/Adelaide',
        'awst': 'Australia/Perth',
        'nzt': 'Pacific/Auckland',
        'cet': 'Europe/Paris',
        'eet': 'Europe/Helsinki',
        'ist': 'Asia/Kolkata',
        'npt': 'Asia/Kathmandu',
        'jst': 'Asia/Tokyo',
    });
    /** Reasonable default options for initial Tempo config */
    const Default = secure({
        /** log to console */ debug: false,
        /** catch or throw Errors */ catch: false,
        /** used to parse two-digit years*/ pivot: 75, /** @link https://en.wikipedia.org/wiki/Date_windowing */
        /** precision to measure timestamps (ms | us) */ timeStamp: 'ms',
        /** calendaring system */ calendar: 'iso8601',
        /** locales that prefer month-day order */ mdyLocales: ['en-US', 'en-AS'], /** @link https://en.wikipedia.org/wiki/Date_format_by_country */
        /** layouts that need to swap parse-order */ mdyLayouts: [['dayMonthYear', 'monthDayYear']],
    });

    /** provide a sort-function to order a set of keys */
    function sortBy(...keys) {
        const sortOptions = keys // coerce string => SortBy
            .flat() // flatten Array-of-Array
            .map(key => isObject(key) ? key : { field: stringify(key) }); // build Array of sort-options
        return (left, right) => {
            let result = 0; // 0 = same, -1 = left<right, +1 = left>right
            sortOptions.forEach(key => {
                if (result === 0) { // no need to look further if result !== 0
                    const dir = key.dir === 'desc' ? -1 : 1;
                    const field = key.field + (key.index ? `[${key.index}]` : '');
                    const valueA = extract(left, field, nullToValue(key.default, 0));
                    const valueB = extract(right, field, nullToValue(key.default, 0));
                    switch (true) {
                        case isNumber(valueA) && isNumber(valueB):
                        case isDate(valueA) && isDate(valueB):
                        case isTempo$1(valueA) && isTempo$1(valueB):
                            result = dir * (valueA - valueB);
                            break;
                        default:
                            result = dir * asString(valueA)?.localeCompare(asString(valueB));
                            break;
                    }
                }
            });
            return result;
        };
    }
    /** return an array sorted-by a series of keys */
    function sortKey(array, ...keys) {
        return array.sort(sortBy(...keys));
    }
    function byKey(arr, fnKey, ...keys) {
        if (isFunction(fnKey))
            return Object.groupBy(arr, fnKey);
        const keyed = [fnKey] // mapFn is a keyof T
            .concat(keys) // append any trailing keyof T[]
            .flat(); // flatten Array-of-Array
        return Object.groupBy(arr, itm => // group an array into an object with named keys
         keyed
            .map(key => isUndefined(itm[key]) ? '' : stringify(itm[key]))
            .join('.'));
    }
    function byLkp(arr, fnKey, ...keys) {
        const group = isFunction(fnKey)
            ? byKey(arr, fnKey) // group by the callback function
            : byKey(arr, fnKey, ...keys); // group by the list of keys
        return ownEntries(group)
            .reduce((acc, [key, grp]) => Object.assign(acc, { [key]: grp?.pop() }), {});
    }

    // Prototype extensions
    // Remember to define any imports as a Function Declaration (not a Function Expression)
    // so that they are 'hoisted' prior to extending a prototype
    /**
     * extend an Object's prototype to include new method, if no clash
     */
    const patch = (proto, property, method) => {
        if (Object.hasOwn(proto.prototype, property)) { // if already defined,
            if (trimAll(method.toString()) !== trimAll(proto.prototype?.[property]?.toString()))
                console.warn(`${proto.name}.${property} already defined`); // show warning if different method definition
        }
        else {
            Object.defineProperty(proto.prototype, property, {
                configurable: false,
                enumerable: false,
                writable: false,
                value: method,
            });
        }
    };
    patch(String, 'trimAll', function (pat) { return trimAll(this, pat); });
    patch(String, 'toProperCase', function () { return toProperCase(this); });
    function sorted(...keys) { return sortKey(this, ...keys); }
    patch(Array, 'orderBy', sorted); // order array by named keys
    patch(Array, 'sortBy', sorted); // sort array by named keys
    function keyed(...keys) { return byKey(this, ...keys); }
    function lookup(...keys) { return byLkp(this, ...keys); }
    patch(Array, 'keyedBy', keyed); // reduce array by named keys
    patch(Array, 'lookupBy', lookup); // reduce array by named keys, only one entry per key
    patch(Array, 'tap', function (fn) {
        fn(this); // run an arbitrary function
        return this; // then return the original array
    });
    patch(Array, 'clear', function () {
        this.fill(null).length = 0; // wipe the contents, then set the 'length' to zero
        return this;
    });
    patch(Array, 'distinct', function (mapfn) {
        return mapfn
            ? this.map(mapfn).distinct() // run the mapping selector, then recurse
            : Array.from(new Set(this)); // eliminate duplicates
    });
    patch(Array, 'cartesian', function (...args) {
        const [a, b = [], ...c] = args.length === 0 ? this : args;
        const cartFn = (a, b) => asArray([]).concat(...a.map(d => b.map(e => asArray([]).concat(d, e))));
        return b.length
            ? this.cartesian(cartFn(a, b), ...c) // run the cartFn function, then recurse
            : asArray(a || []); // return the collated result
    });

    /** key to use for storage / globalThis Symbol */ const $Tempo = Symbol.for('$Tempo');
    /** current execution context*/ const Context = getContext();
    // #region Const variables
    /**
     * # Tempo
     * A powerful wrapper around `Temporal.ZonedDateTime` for flexible parsing and intuitive manipulation of date-time objects.
     * Bridges the gap between raw string/number inputs and the strict requirements of the ECMAScript Temporal API.
     */
    let Tempo = (() => {
        var _Tempo_dbg, _Tempo_global, _Tempo_pending, _Tempo_usrCount, _Tempo_terms, _Tempo_proto, _Tempo_hasOwn, _Tempo_isLocal, _Tempo_create, _Tempo_setEvents, _Tempo_setPeriods, _Tempo_setSphere, _Tempo_isMonthDay, _Tempo_swapLayout, _Tempo_prefix, _Tempo_locale, _Tempo_setConfig, _Tempo_mdyLocales, _Tempo_setDiscovery, _Tempo_setPatterns, _Tempo_getConfig;
        let _classDecorators = [Serializable, Immutable];
        let _classDescriptor;
        let _classExtraInitializers = [];
        let _classThis;
        var Tempo = class {
            static { _classThis = this; }
            static { __setFunctionName(this, "Tempo"); }
            static {
                const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
                __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                Tempo = _classThis = _classDescriptor.value;
                if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            }
            // #region Static enum properties~~~~~~~~~~~~~~~~~~~~~~~~~
            /** Weekday names (short-form) */ static get WEEKDAY() { return WEEKDAY; }
            /** Weekday names (long-form) */ static get WEEKDAYS() { return WEEKDAYS; }
            /** Month names (short-form) */ static get MONTH() { return MONTH; }
            /** Month names (long-form) */ static get MONTHS() { return MONTHS; }
            /** Time durations as seconds (singular) */ static get DURATION() { return DURATION; }
            /** Time durations as milliseconds (plural) */ static get DURATIONS() { return DURATIONS; }
            /** Quarterly Seasons */ static get SEASON() { return SEASON; }
            /** Compass cardinal points */ static get COMPASS() { return COMPASS; }
            /** Tempo to Temporal DateTime Units map */ static get ELEMENT() { return ELEMENT; }
            /** Pre-configured format {name -> string} pairs */ static get FORMAT() { return __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).config.formats; }
            /** some useful Dates */ static get LIMIT() { return LIMIT; }
            static {
                // #endregion
                // #region Static private properties~~~~~~~~~~~~~~~~~~~~~~
                _Tempo_dbg = { value: new Logify('Tempo', {
                        debug: Default?.debug ?? false,
                        catch: Default?.catch ?? false
                    }) };
            }
            static {
                /** Tempo state for the global configuration */ _Tempo_global = { value: {} };
            }
            static {
                /** a collection of parse rule-matches */ _Tempo_pending = { value: void 0 };
            }
            static {
                /** cache for next-available 'usr' Token key */ _Tempo_usrCount = { value: 0 };
            }
            static {
                /** mutable list of registered term plugins */ _Tempo_terms = { value: [] };
            }
            static {
                /** try to infer hemisphere using the timezone's daylight-savings setting */
                _Tempo_setSphere = { value: (shape, options) => {
                        if (isUndefined(shape.config.timeZone) || __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, options, 'sphere'))
                            return shape.config.sphere; // already specified or no timeZone to calculate from
                        // use a fixed date (2024-01-01) to compare offsets for hemisphere detection
                        const zdt = new Temporal.ZonedDateTime(BigInt(1_704_067_200) * BigInt(1_000_000_000), shape.config.timeZone);
                        const jan = zdt.with({ day: 1, month: 1 }).offsetNanoseconds;
                        const jun = zdt.with({ day: 1, month: 6 }).offsetNanoseconds;
                        const dst = Math.sign(jan - jun); // timeZone offset difference between Jan and Jun
                        switch (dst) {
                            case -1:
                                return Tempo.COMPASS.North; // clock moves backward in Northern hemisphere
                            case 1:
                                return Tempo.COMPASS.South; // clock moves forward in Southern hemisphere
                            case 0:
                            default:
                                return void 0; // timeZone does not observe DST
                        }
                    } };
            }
            static {
                /** properCase week-day / calendar-month */
                _Tempo_prefix = { value: (str) => toProperCase(String(str).substring(0, 3)) };
            }
            static {
                /** get first Canonical name of a supplied locale */
                _Tempo_locale = { value: (locale) => {
                        let language;
                        try { // lookup locale
                            language = Intl.getCanonicalLocales(locale.replace('_', '-'))[0];
                        }
                        catch (error) { } // catch unknown locale
                        const global = Context.global;
                        return language ??
                            global?.navigator?.languages?.[0] ?? // fallback to current first navigator.languages[]
                            global?.navigator?.language ?? // else navigator.language
                            Default.locale ?? // else default locale
                            locale; // cannot determine locale
                    } };
            }
            static load(arg, options) {
                asArray(arg).flat(1).forEach(item => {
                    if (isFunction(item)) {
                        if (!item.installed) {
                            item(options, this, (val) => new this(val)); // handle Plugins (Functional extension)
                            item.installed = true;
                        }
                    }
                    if (isObject(item) && isString(item.key) && isFunction(item.define)) {
                        if (!__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_terms).some(term => term.key === item.key))
                            __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_terms).push(item); // handle TermPlugins (Grammar extension)
                    }
                    if (isObject(item) && ownKeys(item).some(key => DISCOVERY.has(key))) {
                        globalThis[$Tempo] = item; // handle Discovery (Configuration bootstrapping)
                        this.init();
                    }
                });
                return this;
            }
            /**
             * Initializes the global default configuration for all subsequent `Tempo` instances.
             *
             * Settings are inherited in this priority:
             * 1. Reasonable library defaults (defined in tempo.config.js)
             * 2. Persistent storage (e.g. localStorage), if available.
             * 3. `options` provided to this method.
             *
             * @param options - Configuration overrides to apply globally.
             * @returns The resolved global configuration.
             */
            static init(options = {}) {
                if (isEmpty(options)) { // if no options supplied, reset all
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).parse = {
                        snippet: Object.assign({}, Snippet),
                        layout: Object.assign({}, Layout),
                        event: Object.assign({}, Event),
                        period: Object.assign({}, Period),
                        mdyLocales: __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_mdyLocales).call(Tempo, Default.mdyLocales),
                        mdyLayouts: asArray(Default.mdyLayouts),
                        pivot: Default.pivot,
                    };
                    const { timeZone, calendar } = Intl.DateTimeFormat().resolvedOptions();
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).config = Object.assign({}, omit({ ...Default }, ...PARSE.keys()), // use Default as base, omit parse-related
                    {
                        calendar,
                        timeZone,
                        locale: __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_locale).call(Tempo),
                        discovery: Symbol.keyFor($Tempo),
                        formats: Object.create(FORMAT),
                        scope: 'global'
                    });
                    __classPrivateFieldSet(Tempo, _classThis, 0, "f", _Tempo_usrCount); // reset user-key counter
                    for (const key of Object.keys(Token)) // purge user-allocated Tokens
                        if (key.startsWith('usr.')) // only remove 'usr.' prefixed keys
                            delete Token[key];
                    this.load(registerTerms); // register built-in term plugins
                    const storeKey = Symbol.keyFor($Tempo);
                    __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setConfig).call(Tempo, __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global), { store: storeKey, discovery: storeKey, scope: 'global' }, Tempo.readStore(storeKey), // allow for storage-values to overwrite
                    __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setDiscovery).call(Tempo, __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global), $Tempo));
                }
                else {
                    const discovery = options.discovery ?? __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).config.discovery ?? Symbol.keyFor($Tempo);
                    __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setConfig).call(Tempo, __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global), __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setDiscovery).call(Tempo, __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global), discovery), options);
                }
                if (Context.type === CONTEXT.Browser || options.debug === true)
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).info(Tempo.config, 'Tempo:', __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).config);
                return Tempo.config;
            }
            /** release global config and reset library to defaults */
            static [(_Tempo_proto = function _Tempo_proto(obj) { return Object.getPrototypeOf(obj); }, _Tempo_hasOwn = function _Tempo_hasOwn(obj, key) { return Object.hasOwn(obj, key); }, _Tempo_isLocal = function _Tempo_isLocal(shape) { return shape.config.scope === 'local'; }, _Tempo_create = function _Tempo_create(obj, name) { return Object.create(__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_proto).call(Tempo, obj)[name]); }, _Tempo_setEvents = function _Tempo_setEvents(shape) {
                const events = ownEntries(shape.parse.event, true);
                if (__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'event') && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'isMonthDay'))
                    return; // no local change needed
                const src = shape.config.scope.substring(0, 1); // 'g'lobal or 'l'ocal
                const groups = events
                    .map(([pat, _], idx) => `(?<${src}evt${idx}>${pat})`) // assign a number to the pattern
                    .join('|'); // make an 'Or' pattern for the event-keys
                if (groups) {
                    const protoEvt = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_proto).call(Tempo, shape.parse.snippet)[Token.evt]?.source;
                    if (!__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) || groups !== protoEvt) {
                        if (__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'snippet'))
                            shape.parse.snippet = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_create).call(Tempo, shape.parse, 'snippet');
                        Object.defineProperty(shape.parse.snippet, Token.evt, {
                            value: new RegExp(groups),
                            enumerable: true,
                            writable: true,
                            configurable: true
                        });
                    }
                }
                if (shape.parse.isMonthDay) {
                    const protoDt = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_proto).call(Tempo, shape.parse.layout)[Token.dt];
                    const localDt = '{mm}{sep}?{dd}({sep}?{yy})?|{mod}?({evt})';
                    if (!__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) || localDt !== protoDt) {
                        if (__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'layout'))
                            shape.parse.layout = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_create).call(Tempo, shape.parse, 'layout');
                        Object.defineProperty(shape.parse.layout, Token.dt, {
                            value: localDt,
                            enumerable: true,
                            writable: true,
                            configurable: true
                        });
                    }
                }
            }, _Tempo_setPeriods = function _Tempo_setPeriods(shape) {
                const periods = ownEntries(shape.parse.period, true);
                if (__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'period'))
                    return; // no local change needed
                const src = shape.config.scope.substring(0, 1); // 'g'lobal or 'l'ocal
                const groups = periods
                    .map(([pat, _], idx) => `(?<${src}per${idx}>${pat})`) // {pattern} is the 1st element of the tuple
                    .join('|'); // make an 'or' pattern for the period-keys
                if (groups) {
                    const protoPer = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_proto).call(Tempo, shape.parse.snippet)[Token.per]?.source;
                    if (!__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) || groups !== protoPer) {
                        if (__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'snippet'))
                            shape.parse.snippet = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_create).call(Tempo, shape.parse, 'snippet');
                        Object.defineProperty(shape.parse.snippet, Token.per, {
                            value: new RegExp(groups),
                            enumerable: true,
                            writable: true,
                            configurable: true
                        });
                    }
                }
            }, _Tempo_isMonthDay = function _Tempo_isMonthDay(shape) {
                const monthDay = [...asArray(__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).parse.mdyLocales)];
                if (__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) && __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'mdyLocales'))
                    monthDay.push(...shape.parse.mdyLocales); // append local mdyLocales (not overwrite global)
                return monthDay.some(mdy => {
                    const m = mdy;
                    const tzs = m.timeZones ?? m.getTimeZones?.() ?? [];
                    return tzs.includes(shape.config.timeZone);
                });
            }, _Tempo_swapLayout = function _Tempo_swapLayout(shape) {
                const layouts = ownEntries(shape.parse.layout); // get entries of Layout Record
                const swap = shape.parse.mdyLayouts; // get the swap-tuple
                let chg = false; // no need to rebuild, if no change
                swap
                    .forEach(([dmy, mdy]) => {
                    const idx1 = layouts.findIndex(([key]) => key.description === dmy); // 1st swap element exists in {layouts}
                    const idx2 = layouts.findIndex(([key]) => key.description === mdy); // 2nd swap element exists in {layouts}
                    if (idx1 === -1 || idx2 === -1)
                        return; // no pair to swap
                    const swap1 = (idx1 < idx2) && shape.parse.isMonthDay; // we prefer {mdy} and the 1st tuple was found earlier than the 2nd
                    const swap2 = (idx1 > idx2) && !shape.parse.isMonthDay; // we dont prefer {mdy} and the 1st tuple was found later than the 2nd
                    if (swap1 || swap2) { // since {layouts} is an array, ok to swap by-reference
                        [layouts[idx1], layouts[idx2]] = [layouts[idx2], layouts[idx1]];
                        chg = true;
                    }
                });
                if (chg)
                    shape.parse.layout = Object.fromEntries(layouts); // rebuild Layout in new parse order
            }, _Tempo_setConfig = function _Tempo_setConfig(shape, ...options) {
                const mergedOptions = Object.assign({}, ...options);
                if (isEmpty(mergedOptions)) // nothing to do
                    return;
                if (mergedOptions.store) // check for local-storage
                    Object.assign(mergedOptions, { ...Tempo.readStore(mergedOptions.store), ...mergedOptions });
                /** helper to normalize snippet/layout Options into the target Config */
                const collect = (target, value, convert) => {
                    const itm = asType(value);
                    target ??= {};
                    switch (itm.type) {
                        case 'Object':
                            ownEntries(itm.value)
                                .forEach(([k, v]) => target[Tempo.getSymbol(k)] = convert(v));
                            break;
                        case 'String':
                        case 'RegExp':
                            target[Tempo.getSymbol()] = convert(itm.value);
                            break;
                        case 'Array':
                            itm.value.forEach(elm => collect(target, elm, convert));
                            break;
                    }
                };
                ownEntries(mergedOptions)
                    .forEach(([optKey, optVal]) => {
                    if (isUndefined(optVal))
                        return; // skip undefined values
                    const arg = asType(optVal);
                    switch (optKey) {
                        case 'snippet':
                        case 'layout':
                        case 'event':
                        case 'period':
                            // lazy-shadowing: only create local object if it doesn't already exist on local shape
                            if (!__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, optKey))
                                shape.parse[optKey] = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_create).call(Tempo, shape.parse, optKey);
                            const rule = shape.parse[optKey];
                            if (['snippet', 'layout'].includes(optKey)) {
                                collect(rule, arg.value, v => optKey === 'snippet'
                                    ? isRegExp(v) ? v : new RegExp(v)
                                    : isRegExp(v) ? v.source : v);
                            }
                            else {
                                asArray(arg.value)
                                    .forEach(elm => ownEntries(elm).forEach(([key, val]) => rule[key] = val));
                            }
                            break;
                        case 'mdyLocales':
                            shape.parse[optKey] = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_mdyLocales).call(Tempo, arg.value);
                            break;
                        case 'mdyLayouts': // these are the 'layouts' that need to swap parse-order
                            shape.parse[optKey] = asArray(arg.value);
                            break;
                        case 'pivot':
                            shape.parse["pivot"] = Number(arg.value);
                            break;
                        case 'config':
                            __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setConfig).call(Tempo, shape, arg.value);
                            break;
                        case 'timeZone':
                            const zone = String(arg.value).toLowerCase();
                            shape.config.timeZone = TimeZone[zone] ?? arg.value;
                            break;
                        case 'formats':
                            if (__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.config, 'formats'))
                                shape.config.formats = shape.config.formats.extend({}); // shadow parent prototype
                            if (isObject(arg.value))
                                shape.config.formats = shape.config.formats.extend(arg.value);
                            break;
                        case 'discovery':
                            shape.config.discovery = isSymbol(optVal) ? Symbol.keyFor(optVal) : optVal;
                            break;
                        case 'plugins':
                            asArray(optVal).forEach(p => this.load(p));
                            break;
                        case 'anchor':
                            break; // internal anchor used for relativity parsing
                        default: // else just add to config
                            Object.assign(shape.config, { [optKey]: optVal });
                            break;
                    }
                });
                const isMonthDay = __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isMonthDay).call(Tempo, shape);
                if (isMonthDay !== __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_proto).call(Tempo, shape.parse).isMonthDay) // this will always set on 'global', conditionally on 'local'
                    shape.parse.isMonthDay = isMonthDay;
                shape.config.sphere = __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_setSphere).call(Tempo, shape, mergedOptions);
                if (isDefined(shape.parse.mdyLayouts))
                    __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_swapLayout).call(Tempo, shape);
                if (isDefined(shape.parse.event))
                    __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setEvents).call(Tempo, shape);
                if (isDefined(shape.parse.period))
                    __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setPeriods).call(Tempo, shape);
                __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setPatterns).call(Tempo, shape); // setup Regex DateTime patterns
            }, _Tempo_mdyLocales = function _Tempo_mdyLocales(value) {
                return asArray(value)
                    .map(mdy => new Intl.Locale(mdy))
                    .map(mdy => ({ locale: mdy.baseName, timeZones: mdy.getTimeZones?.() ?? [] }));
            }, _Tempo_setDiscovery = function _Tempo_setDiscovery(shape, key = shape.config.discovery ?? $Tempo) {
                const sym = isString(key) ? Symbol.for(key) : key;
                const discovery = globalThis[sym];
                if (!isObject(discovery))
                    return {};
                // 1. Process TimeZones (normalize to lowercase for lookup)
                const timeZones = discovery.timeZones ?? {};
                for (const [key, value] of Object.entries(timeZones))
                    TimeZone[key.toLowerCase()] = value;
                // 2. Process Terms
                if (discovery.terms)
                    this.load(asArray(discovery.terms));
                // 3. Process Formats
                if (discovery.formats)
                    shape.config.formats = shape.config.formats.extend(discovery.formats);
                // 4. Process Plugins
                if (discovery.plugins)
                    asArray(discovery.plugins).forEach(p => this.load(p));
                // 4. Process Options
                let opts = discovery.options || {};
                return isFunction(opts) ? opts() : opts;
            }, _Tempo_setPatterns = function _Tempo_setPatterns(shape) {
                const snippet = shape.parse.snippet;
                // if local and no snippet or layout overrides, we can just use the prototype's patterns
                if (__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_isLocal).call(Tempo, shape) && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'snippet') && !__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'layout'))
                    return;
                // ensure we have our own Map to mutate (shadow if local)
                if (!__classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_hasOwn).call(Tempo, shape.parse, 'pattern'))
                    shape.parse.pattern = new Map();
                shape.parse.pattern.clear(); // reset {pattern} Map
                for (const [sym, layout] of ownEntries(shape.parse.layout, true))
                    shape.parse.pattern.set(sym, Tempo.regexp(layout, snippet));
            }, Symbol.dispose)]() { Tempo.init(); }
            /** Reads options from persistent storage (e.g., localStorage). */
            static readStore(key = __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).config.store) {
                return getStorage(key, {});
            }
            /** Writes configuration into persistent storage. */
            static writeStore(config, key = __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).config.store) {
                return setStorage(key, config);
            }
            /** lookup or registers a new `Symbol` for a given key. */
            static getSymbol(key) {
                var _b, _c;
                if (isUndefined(key)) {
                    const usr = `usr.${__classPrivateFieldSet(_b = Tempo, _classThis, (_c = __classPrivateFieldGet(_b, _classThis, "f", _Tempo_usrCount), ++_c), "f", _Tempo_usrCount)}`; // allocate a prefixed 'user' key
                    return Token[usr] = Symbol(usr); // add to Symbol register
                }
                if (isSymbol(key))
                    return key;
                if (isString(key) && key.includes('.')) {
                    const description = key.split('.').pop(); // use last segment as description
                    return Token[key] ??= Symbol(description);
                }
                return Token[key] ?? Symbol.for(`$Tempo.${key}`);
            }
            /** translates {layout} into an anchored, case-insensitive RegExp. */
            static regexp(layout, snippet) {
                // helper function to replace {name} placeholders with their corresponding snippets
                function matcher(str, depth = 0) {
                    if (depth > 12)
                        return isRegExp(str) ? str.source : str; // depth guard
                    let source = isRegExp(str) ? str.source : str;
                    if (isRegExpLike(source)) // string that looks like a RegExp
                        source = source.substring(1, source.length - 1); // remove the leading/trailing "/"
                    if (source.startsWith('^') && source.endsWith('$'))
                        source = source.substring(1, source.length - 1); // remove the leading/trailing anchors (^ $)
                    return source.replace(Match.braces, (match, name) => {
                        const token = Tempo.getSymbol(name); // get the symbol for this {name}
                        const customs = snippet?.[token]?.source ?? snippet?.[name]?.source;
                        const globals = __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).parse.snippet[token]?.source ?? __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).parse.snippet[name]?.source;
                        const layout = Layout[token]; // get resolution source (layout)
                        let res = customs ?? globals ?? layout; // get the snippet/layout source
                        if (isNullish(res) && name.includes('.')) { // if no definition found, try fallback
                            const prefix = name.split('.')[0]; // get the base token name
                            const pToken = Tempo.getSymbol(prefix);
                            res = snippet?.[pToken]?.source ?? snippet?.[prefix]?.source
                                ?? Snippet[pToken]?.source ?? Snippet[prefix]?.source
                                ?? Layout[pToken];
                        }
                        if (res && name.includes('.')) { // wrap dotted extensions for identification
                            const safeName = name.replace(/\./g, '_');
                            if (!res.startsWith(`(?<${safeName}>`))
                                res = `(?<${safeName}>${res})`;
                        }
                        return (isNullish(res) || res === match) // if no definition found,
                            ? match // return the original match
                            : matcher(res, depth + 1); // else recurse to see if snippet contains embedded "{}" pairs
                    });
                }
                layout = matcher(layout); // initiate the layout-parse
                return new RegExp(`^(${layout})$`, 'i'); // translate the source into a regex
            }
            /** Compares two `Tempo` instances or date-time values. */
            static compare(tempo1, tempo2) {
                const one = new Tempo(tempo1), two = new Tempo(tempo2);
                return Number((one.nano > two.nano) || -(one.nano < two.nano)) + 0;
            }
            /** global Tempo configuration */
            static get config() {
                return getProxy(omit({ ...__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).config }, 'value'));
            }
            /** global discovery configuration */
            static get discovery() {
                const sym = Symbol.for(this.config.discovery);
                return __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_getConfig).call(Tempo, sym);
            }
            /**
         * Returns a snapshot of the configuration layers used by Tempo.
         * Useful for debugging how the final configuration is built.
         */
            static get options() {
                const keyFor = this.config.store ?? Symbol.keyFor($Tempo);
                return {
                    default: this.default,
                    discovery: this.discovery,
                    storage: getProxy(Object.assign({ key: keyFor, scope: 'storage' }, omit(Tempo.readStore(keyFor), 'value'))),
                    global: this.config,
                };
            }
            static from(tempo, options) { return new this(tempo, options); }
            static now() { return Temporal.Now.instant().epochNanoseconds; }
            /** static Tempo.terms getter */
            static get terms() {
                return secure(__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_terms)
                    .map(({ define, ...rest }) => rest)); // omit the 'define' method
            }
            /** static Tempo properties getter */
            static get properties() {
                return secure(getAccessors(Tempo)
                    .filter(acc => getType(acc) !== 'Symbol')); // omit any Symbol properties
            }
            /** Tempo initial default settings */
            static get default() {
                return secure({ ...Default, scope: 'default', timeZone: TimeZone });
            }
            /**
             * configuration governing the static 'rules' used when parsing Tempo.DateTime argument
             */
            static get parse() {
                const parse = __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).parse;
                return secure({
                    ...parse, // spread primitives like {pivot}
                    snippet: { ...parse.snippet }, // spread nested objects
                    layout: { ...parse.layout },
                    event: { ...parse.event },
                    period: { ...parse.period },
                    mdyLocales: [...parse.mdyLocales],
                    mdyLayouts: [...parse.mdyLayouts],
                });
            }
            /** iterate over Tempo properties */
            static [(_Tempo_getConfig = function _Tempo_getConfig(sym) {
                const discovery = globalThis[sym];
                return getProxy(omit({ ...discovery, scope: 'discovery' }, 'value'));
            }, Symbol.iterator)]() {
                return Tempo.properties[Symbol.iterator](); // static Iterator over array of 'getters'
            }
            // #endregion Static public methods
            // #region Instance symbols~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            /** allow for auto-convert of Tempo to BigInt, Number or String */
            [Symbol.toPrimitive](hint) {
                __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).info(this.config, getType(this), '.hint: ', hint);
                switch (hint) {
                    case 'string': return this.toString(); // ISO 8601 string
                    case 'number': return this.epoch.ms; // Unix epoch (milliseconds)
                    default: return this.nano; // Unix epoch (nanoseconds)
                }
            }
            /** iterate over instance formats */
            [Symbol.iterator]() {
                return ownEntries(this.#fmt)[Symbol.iterator](); // instance Iterator over tuple of FormatType[]
            }
            get [Symbol.toStringTag]() {
                return 'Tempo'; // hard-coded to avoid minification mangling
            }
            // #endregion Instance symbols
            // #region Instance properties~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            /** constructor tempo */ #tempo;
            /** constructor options */ #options = {};
            /** instantiation Temporal Instant */ #now;
            /** underlying Temporal ZonedDateTime */ #zdt;
            /** temporary anchor used during parsing */ #anchor;
            /** prebuilt formats, for convenience */ #fmt = {};
            /** instance term plugins */ #term = Object.create(null);
            /** instance values to complement static values */ #local = {
                /** instance configuration */ config: {},
                /** instance parse rules (only populated if provided) */ parse: { result: [] }
            };
            constructor(tempo, options = {}) {
                this.#now = Temporal.Now.instant(); // stash current Instant
                [this.#tempo, this.#options] = this.#swap(tempo, options); // swap arguments around, if arg1=Options or Temporal-like
                this.#setLocal(this.#options); // parse the local options looking for overrides to Tempo.#global.config
                // we now have all the info we need to instantiate a new Tempo
                try {
                    this.#anchor = this.#options.anchor;
                    this.#zdt = this.#parse(this.#tempo, this.#anchor); // attempt to interpret the DateTime arg
                    const cal = this.#local.config.calendar;
                    if (isString(cal) && ['iso8601', 'gregory'].includes(cal)) {
                        for (const key of this.#local.config.formats.keys())
                            Object.assign(this.#fmt, { [key]: this.format(key) });
                    }
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_terms) // add the plug-in getters for the pre-defined Terms to the instance
                        .forEach(({ key, scope, define }) => {
                        this.#setTerm(this, key, define, true); // add a getter which returns the key-field only
                        this.#setTerm(this, scope, define, false); // add a getter which returns a range-object
                    });
                    if (isDefined(__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_pending))) { // are we mutating with 'set()' ?
                        this.#local.parse.result.unshift(...__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_pending)); // prepend collected parse-matches
                        __classPrivateFieldSet(Tempo, _classThis, void 0, "f", _Tempo_pending); // and reset mutating-flag
                    }
                    secure(this.#fmt); // prevent mutations
                    secure(this.#term); // secure the initial object with getters
                    secure(this.#local.config);
                    secure(this.#local.parse);
                }
                catch (err) {
                    console.error('Tempo Constructor Error:', err);
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).catch(this.config, `Cannot create Tempo: ${err.message}\n${err.stack}`);
                    return {}; // return empty Object
                }
            }
            // This function has be defined within the Tempo class (and not imported from another module) because it references a private-variable
            /** this will add a getter on the instance #term private field */
            #setTerm(self, name, define, isKeyOnly) {
                if (isDefined(name) && isDefined(define)) {
                    Object.defineProperty(self.#term, name, {
                        configurable: false,
                        enumerable: false,
                        get: function () {
                            const value = define.call(self, isKeyOnly); // evaluate the term range-lookup
                            self.#term = secure(Object.create(self.#term, {
                                [name]: {
                                    value,
                                    configurable: false,
                                    writable: false,
                                    enumerable: true
                                }
                            }));
                            return secure(value);
                        }
                    });
                }
            }
            // #endregion Constructor
            // #region Instance public accessors~~~~~~~~~~~~~~~~~~~~~~
            /** 4-digit year (e.g., 2024) */ get yy() { return this.toDateTime().year; }
            /** 4-digit ISO week-numbering year */ get wy() { return this.ww === 1 && this.mm === Tempo.MONTH.Dec ? this.yy + 1 : (this.ww >= 52 && this.mm === Tempo.MONTH.Jan ? this.yy - 1 : this.yy); }
            /** Month number: Jan=1, Dec=12 */ get mm() { return this.toDateTime().month; }
            /** ISO week number of the year */ get ww() { return this.toDateTime().weekOfYear; }
            /** Day of the month (1-31) */ get dd() { return this.toDateTime().day; }
            /** Day of the month (alias for `dd`) */ get day() { return this.toDateTime().day; }
            /** Hour of the day (0-23) */ get hh() { return this.toDateTime().hour; }
            /** Minutes of the hour (0-59) */ get mi() { return this.toDateTime().minute; }
            /** Seconds of the minute (0-59) */ get ss() { return this.toDateTime().second; }
            /** Milliseconds of the second (0-999) */ get ms() { return this.toDateTime().millisecond; }
            /** Microseconds of the millisecond (0-999) */ get us() { return this.toDateTime().microsecond; }
            /** Nanoseconds of the microsecond (0-999) */ get ns() { return this.toDateTime().nanosecond; }
            /** Fractional seconds (e.g., 0.123456789) */ get ff() { return +(`0.${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`); }
            /** IANA Time Zone ID (e.g., 'Australia/Sydney') */ get tz() { return this.toDateTime().timeZoneId; }
            /** Unix timestamp (defaults to milliseconds) */ get ts() { return this.epoch[this.#local.config.timeStamp]; }
            /** Short month name (e.g., 'Jan') */ get mmm() { return Tempo.MONTH.keyOf(this.#zdt.month); }
            /** Full month name (e.g., 'January') */ get mon() { return Tempo.MONTHS.keyOf(this.#zdt.month); }
            /** Short weekday name (e.g., 'Mon') */ get www() { return Tempo.WEEKDAY.keyOf(this.#zdt.dayOfWeek); }
            /** Full weekday name (e.g., 'Monday') */ get wkd() { return Tempo.WEEKDAYS.keyOf(this.toDateTime().dayOfWeek); }
            /** ISO weekday number: Mon=1, Sun=7 */ get dow() { return this.toDateTime().dayOfWeek; }
            /** Nanoseconds since Unix epoch (BigInt) */ get nano() { return this.toDateTime().epochNanoseconds; }
            /** current Tempo configuration */
            get config() {
                return getProxy(omit({ ...this.#local.config }, 'scope', 'value', 'anchor'));
            }
            /** Instance-specific parse rules (merged with global) */ get parse() { return this.#local.parse; }
            /** Object containing results from all term plugins */ get term() { return getProxy(this.#term); }
            /** Formatted results for all pre-defined format codes */ get fmt() { return this.#fmt; }
            /** units since epoch */ get epoch() {
                return secure({
                    /** seconds since epoch */ ss: Math.trunc(this.toDateTime().epochMilliseconds / 1_000),
                    /** milliseconds since epoch */ ms: this.toDateTime().epochMilliseconds,
                    /** microseconds since epoch */ us: Number(this.toDateTime().epochNanoseconds / BigInt(1_000)),
                    /** nanoseconds since epoch */ ns: this.toDateTime().epochNanoseconds,
                });
            }
            // #endregion Instance public accessors
            // #region Instance private accessors
            /**
             * @Immutable class decorators wrap the class but leave internal lexical bindings pointing to the original, undecorated class.
             * To ensure new instances returned by instance methods are properly frozen,
             * we must instantiate internally from the decorated wrapper (which is bound to `this.constructor`)
             * rather than using `new Tempo(..)`.
             */
            get #Tempo() { return this.constructor; }
            /** time duration until another date-time */ until(optsOrDate, optsOrUntil) { return this.#until(optsOrDate, optsOrUntil); }
            /** time elapsed since another date-time */ since(optsOrDate, optsOrUntil) { return this.#since(optsOrDate, optsOrUntil); }
            /** applies a format to the instance. See `doc/tempo.md`. */ format(fmt) { return this.#format(fmt); }
            /** returns a new `Tempo` with specific duration added. */ add(tempo, options) { return this.#add(tempo, options); }
            /** returns a new `Tempo` with specific offsets. */ set(tempo, options) { return this.#set(tempo, options); }
            /** returns a clone of the current `Tempo` instance. */ clone() { return new this.#Tempo(this, this.config); }
            /** returns the underlying Temporal.ZonedDateTime */ toDateTime() { return this.#zdt ?? this.#anchor ?? this.#now.toZonedDateTimeISO(this.#local.config.timeZone); }
            /** returns a Temporal.PlainDate representation */ toPlainDate() { return this.toDateTime().toPlainDate(); }
            /** returns a Temporal.PlainTime representation */ toPlainTime() { return this.toDateTime().toPlainTime(); }
            /** returns a Temporal.PlainDateTime representation */ toPlainDateTime() { return this.toDateTime().toPlainDateTime(); }
            /** returns the underlying Temporal.Instant */ toInstant() { return this.toDateTime().toInstant(); }
            /** the date-time as a standard `Date` object. */ toDate() { return new Date(this.toDateTime().round({ smallestUnit: ELEMENT.ms }).epochMilliseconds); }
            /** the ISO8601 string representation of the date-time. */ toString() { return this.toPlainDateTime().toString({ calendarName: 'never' }); }
            /** Custom JSON serialization for `JSON.stringify`. */ toJSON() { return omit({ ...this.#local.config, value: this.toString() }, 'scope', 'store'); }
            /** `true` if the underlying date-time is valid. */ isValid() { return !isEmpty(this); }
            // #endregion Instance public methods
            // #region Instance private methods~~~~~~~~~~~~~~~~~~~~~~~
            /** setup local 'config' and 'parse' rules (prototype-linked to global) */
            #setLocal(options) {
                // setup local config (prototype-linked to global config)
                this.#local.config = Object.create(__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).config);
                Object.assign(this.#local.config, { scope: 'local' });
                // setup local parse rules (prototype-linked to global parse)
                this.#local.parse = Object.create(__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).parse);
                this.#local.parse.result = [];
                __classPrivateFieldGet(Tempo, _classThis, "m", _Tempo_setConfig).call(Tempo, this.#local, options); // set #local config
            }
            /** parse DateTime input */
            #parse(tempo, dateTime) {
                const today = (dateTime ?? this.#now.toZonedDateTimeISO(this.#local.config.timeZone))
                    .withTimeZone(this.#local.config.timeZone);
                const { type, value } = this.#conform(tempo, today, isDefined(dateTime));
                // evaluate latest timezone / calendar (after #conform which might have updated them)
                const { timeZone, calendar } = this.#local.config;
                const tz = isString(timeZone) ? timeZone : timeZone.id ?? timeZone.timeZoneId;
                const cal = isString(calendar) ? calendar : calendar.id ?? calendar.calendarId;
                if (isEmpty(this.#local.parse.result) && isUndefined(__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_pending))) // #conform() didn't find any matches
                    this.#local.parse.result = [{ type, value }];
                __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).info(this.#local.config, 'parse', `{type: ${type}, value: ${value}}`); // show what we're parsing
                switch (type) {
                    case 'Null':
                    case 'Void':
                    case 'Empty':
                    case 'Undefined':
                        return today;
                    case 'String': // String which didn't conform to a Tempo.pattern
                        try {
                            const str = value.replace(/Z$/, ''); // requested Z-stripping for adoption
                            const zdt = Temporal.ZonedDateTime.from(str.includes('[') ? str : `${str}[${tz}]`);
                            if (this.#local)
                                this.#local.config.timeZone = zdt.timeZoneId;
                            return zdt;
                        }
                        catch (err) { // else see if Date.parse can parse value
                            this.#result({ type: 'String', value }, { match: 'Date.parse' });
                            __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).warn(this.#local.config, 'Cannot detect DateTime; fallback to Date.parse');
                            if (Match.date.test(value)) {
                                try {
                                    return Temporal.PlainDate.from(value).toZonedDateTime(tz).withCalendar(cal);
                                }
                                catch { /* ignore and fallback */ }
                            }
                            try {
                                return Temporal.PlainDateTime.from(value).toZonedDateTime(tz).withCalendar(cal);
                            }
                            catch { /* ignore and fallback to Date.parse */ }
                            const date = new Date(value.toString());
                            if (isNaN(date.getTime()))
                                return __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).catch(this.#local.config, `Cannot parse Date: "${value}"`);
                            return Temporal.ZonedDateTime // adopt instance timezone
                                .from(`${date.toISOString().substring(0, 23)}[${tz}]`)
                                .withCalendar(cal);
                        }
                    case 'Temporal.ZonedDateTime': // ZonedDateTime object: convert to instance timezone
                        return (value.timeZoneId === tz && value.calendarId === cal)
                            ? value
                            : value.withTimeZone(tz).withCalendar(cal);
                    case 'Temporal.PlainDate':
                    case 'Temporal.PlainDateTime':
                        return value
                            .toZonedDateTime(tz)
                            .withCalendar(cal);
                    case 'Temporal.PlainTime':
                        return today.withPlainTime(value);
                    case 'Temporal.PlainYearMonth': // assume current day, else end-of-month
                        return value
                            .toPlainDate({ day: Math.min(today.day, value.daysInMonth) })
                            .toZonedDateTime(tz)
                            .withCalendar(cal);
                    case 'Temporal.PlainMonthDay': // assume current year
                        return value
                            .toPlainDate({ year: today.year })
                            .toZonedDateTime(tz)
                            .withCalendar(cal);
                    case 'Temporal.Instant':
                        return value
                            .toZonedDateTimeISO(tz)
                            .withCalendar(cal);
                    case 'Tempo':
                        return value
                            .toDateTime()
                            .withTimeZone(tz)
                            .withCalendar(cal); // apply instance timezone to cloned Tempo
                    case 'Date':
                        return Temporal.Instant.fromEpochMilliseconds(value.getTime())
                            .toZonedDateTimeISO(tz)
                            .withCalendar(cal);
                    case 'Number': // Number which didn't conform to a Tempo.pattern
                        const [seconds = BigInt(0), suffix = BigInt(0)] = value.toString().split('.').map(BigInt);
                        const nano = BigInt(suffix.toString().substring(0, 9).padEnd(9, '0'));
                        return Temporal.Instant.fromEpochNanoseconds(seconds * BigInt(1_000_000_000) + nano)
                            .toZonedDateTimeISO(tz)
                            .withCalendar(cal);
                    case 'BigInt': // BigInt is not conformed against a Tempo.pattern
                        return Temporal.Instant.fromEpochNanoseconds(value)
                            .toZonedDateTimeISO(tz)
                            .withCalendar(cal);
                    default:
                        __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).catch(this.#local.config, `Unexpected Tempo parameter type: ${type}, ${String(value)}`);
                        return today;
                }
            }
            /** resolve constructor / method arguments */
            #swap(tempo, options = {}) {
                return this.#isOptions(tempo)
                    ? [tempo.value, { ...tempo }]
                    : [tempo, { ...options }];
            }
            /** check if we've been given a Tempo Options object */
            #isOptions(arg) {
                if (!isObject(arg) || arg.constructor !== Object)
                    return false;
                const keys = ownKeys(arg); // if it contains any 'mutation' keys, then it's not (just) an options object
                if (keys.some(key => MUTATION.has(key)))
                    return false;
                return keys
                    .some(key => OPTION.has(key));
            }
            /** check if we've been given a ZonedDateTimeLike object */
            #isZonedDateTimeLike(tempo) {
                if (!isObject(tempo) || isEmpty(tempo))
                    return false;
                // if it contains any 'options' keys, it's not a ZonedDateTime
                const keys = ownKeys(tempo);
                if (keys.some(key => OPTION.has(key) && key !== 'value'))
                    return false;
                // we include {value} to allow for Tempo instances
                return keys
                    .filter(isString)
                    .every((key) => ZONED_DATE_TIME.has(key));
            }
            #result(...rest) {
                const match = Object.assign({}, ...rest); // collect all object arguments
                if (!isEmpty(match.groups)) {
                    if (isDefined(this.#anchor) && !match.isAnchored)
                        match.isAnchored = true;
                    (__classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_pending) ?? this.#local.parse.result).push(match);
                }
            }
            /** evaluate 'string | number' input against known patterns */
            #conform(tempo, dateTime, isAnchored = false) {
                const arg = asType(tempo);
                const { type, value } = arg;
                if (this.#isZonedDateTimeLike(tempo)) { // tempo is ZonedDateTime-ish object (throw away 'value' property)
                    const { timeZone, calendar, value, ...options } = tempo;
                    let zdt = !isEmpty(options)
                        ? dateTime.with(options)
                        : dateTime;
                    if (timeZone)
                        zdt = zdt.withTimeZone(timeZone); // optionally set timeZone
                    if (calendar)
                        zdt = zdt.withCalendar(calendar); // optionally set calendar
                    this.#result({ type: 'Temporal.ZonedDateTimeLike', value: zdt, match: 'Temporal.ZonedDateTimeLike' });
                    return Object.assign(arg, {
                        type: 'Temporal.ZonedDateTime', // override {arg.type}
                        value: zdt,
                    });
                }
                if (type !== 'String' && type !== 'Number') {
                    this.#result(arg, { match: type });
                    return arg;
                }
                if (isFunction(value)) {
                    const res = value.call(this);
                    return this.#conform(res, dateTime, isAnchored);
                }
                const trim = trimAll(value);
                if (type === 'String') { // if original value is String
                    if (isEmpty(trim)) { // don't conform empty string
                        this.#result(arg, { match: 'Empty' });
                        return Object.assign(arg, { type: 'Empty' });
                    }
                    if (isIntegerLike(trim)) { // if string representation of BigInt literal
                        this.#result(arg, { match: 'BigInt' });
                        return Object.assign(arg, { type: 'BigInt', value: asInteger(trim) });
                    }
                }
                else { // else it is a Number
                    if (trim.length <= 7) { // cannot reliably interpret small numbers:  might be {ss} or {yymmdd} or {dmmyyyy}
                        __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).catch(this.#local.config, 'Cannot safely interpret number with less than 8-digits: use string instead');
                        return arg;
                    }
                }
                // const isSimpleIsoOrNumeric = typeof value === 'string' && (Match.date.test(value) || /^\d+$/.test(value));
                const map = this.#local.parse.pattern;
                for (const [sym, pat] of map) {
                    const groups = this.#parseMatch(pat, trim); // determine pattern-match groups
                    if (isEmpty(groups))
                        continue; // no match, so skip this iteration
                    this.#result(arg, { match: sym.description, groups: cleanify(groups) }); // stash the {key} of the pattern that was matched
                    dateTime = this.#parseZone(groups, dateTime); // resolve timezone early so events can use it
                    dateTime = this.#parseGroups(groups, dateTime); // mutate the {groups} object (resolves events/periods)
                    dateTime = this.#parseWeekday(groups, dateTime); // if {weekDay} pattern, calculate a calendar value
                    dateTime = this.#parseDate(groups, dateTime); // if {calendar}|{event} pattern, translate to date value
                    dateTime = this.#parseTime(groups, dateTime); // if {clock}|{period} pattern, translate to a time value
                    /**
                     * finished analyzing a matched pattern.
                     * rebuild {arg.value} into a ZonedDateTime
                     */
                    // if no time-components were matched, strip time to midnight baseline
                    if (!isAnchored && !['hh', 'mi', 'ss', 'ff', 'mer', 'per'].some(key => isDefined(groups[key])))
                        dateTime = dateTime.withPlainTime('00:00:00');
                    Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime });
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).info(this.#local.config, 'groups', groups); // show the resolved date-time elements
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).info(this.#local.config, 'pattern', sym.description); // show the pattern that was matched
                    break; // stop checking patterns
                }
                return arg;
            }
            /** apply a regex-match against a value, and clean the result */
            #parseMatch(pat, value) {
                const groups = value.toString().match(pat)?.groups || {};
                ownEntries(groups) // remove undefined, NaN, null and empty values
                    .forEach(([key, val]) => isEmpty(val) && delete groups[key]);
                return groups;
            }
            /** resolve {event} | {period} to their date | time values (mutates groups) */
            #parseGroups(groups, dateTime) {
                this.#anchor = dateTime; // temporarily anchor the instance so events resolve relative to current state
                try {
                    for (const key of ownKeys(groups)) {
                        const isEvent = Match.event.test(key);
                        const isPeriod = Match.period.test(key);
                        if (!isEvent && !isPeriod)
                            continue;
                        const idx = +key.substring(4);
                        const src = key.startsWith('g') ? (isEvent ? __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).parse.event : __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_global).parse.period) : (isEvent ? this.#local.parse.event : this.#local.parse.period);
                        const entry = ownEntries(src, true)[idx];
                        if (!entry)
                            continue;
                        const definition = entry[1];
                        const res = isFunction(definition) ? definition.call(this).toString() : definition;
                        const resGroups = isEvent ? this.#parseEvent(res) : this.#parsePeriod(res);
                        Object.assign(groups, resGroups);
                        delete groups[key];
                    }
                }
                finally {
                    this.#anchor = undefined; // reset anchor
                }
                // resolve month-names into month-numbers (some browsers do not allow month-names when parsing a Date)
                if (isDefined(groups["mm"]) && !isNumeric(groups["mm"])) {
                    const mm = __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_prefix).call(Tempo, groups["mm"]); // conform month-name
                    groups["mm"] = Tempo.MONTH.keys().findIndex((el) => el === mm).toString().padStart(2, '0');
                }
                // Apply mutated groups to dateTime
                if (isDefined(groups.yy) || isDefined(groups.mm) || isDefined(groups.dd))
                    dateTime = this.#parseDate(groups, dateTime);
                if (isDefined(groups.hh) || isDefined(groups.mi) || isDefined(groups.ss) || isDefined(groups.ff) || isDefined(groups.mer))
                    dateTime = this.#parseTime(groups, dateTime);
                return dateTime;
            }
            /**
             * We expect similar offset-logic to apply to 'modifiers' when parsing a string DateTime.
             * returns {adjust} to make, based on {modifier}, {offset}, and {period}
             *  -			previous period
             *  +			next period
             * -3			three periods ago
             * <			prior to base-date (asIs)
             * <=			prior to base-date (plus one)
             */
            #parseModifier({ mod, adjust, offset, period }) {
                adjust = Math.abs(adjust);
                switch (mod) {
                    case void 0: // no adjustment
                    case '=':
                    case 'this': // current period
                        return 0;
                    case '+': // next period
                    case 'next':
                        return adjust;
                    case '-': // previous period
                    case 'prev':
                    case 'last':
                        return -adjust;
                    case '<': // period before base-date
                    case 'ago':
                        return (period <= offset)
                            ? -adjust
                            : -(adjust - 1);
                    case '<=': // period before or including base-date
                    case '-=':
                        return (period < offset)
                            ? -adjust
                            : -(adjust - 1);
                    case '>': // period strictly after base-date
                    case 'hence':
                        return (period >= offset)
                            ? adjust
                            : (adjust - 1);
                    case '>=': // period after or including base-date
                    case '+=':
                        return (period > offset)
                            ? adjust
                            : (adjust - 1);
                    default: // unexpected modifier
                        return 0;
                }
            }
            /**
             * if named-group 'wkd' detected (with optional 'mod', 'nbr', 'sfx' or time-units), then calc relative weekday offset
             * | Example | Result | Note |
             * | :--- | :---- | :---- |
             * | `Wed` | Wed this week | might be earlier or later or equal to current day |
             * | `-Wed` | Wed last week | same as new Tempo('Wed').add({ weeks: -1 }) |
             * | `+Wed` | Wed next week | same as new Tempo('Wed').add({ weeks:  1 }) |
             * | `-3Wed` | Wed three weeks ago | same as new Tempo('Wed').add({ weeks: -3 }) |
             * | `<Wed` | Wed prior to today | might be current or previous week |
             * | `<=Wed` | Wed prior to tomorrow | might be current or previous week |
             * | `Wed noon` | Wed this week at 12:00pm | even though time-periods may be present, ignore them in this method |
             *
             * @returns  ZonedDateTime with computed date-offset
             */
            #parseWeekday(groups, dateTime) {
                const { wkd, mod, nbr = '1', sfx, ...rest } = groups;
                if (isUndefined(wkd)) // this is not a true {weekDay} pattern match
                    return dateTime;
                /**
                 * the {weekDay} pattern should only have keys of {wkd}, {mod}, {nbr}, {sfx} (and optionally time-units)
                 * for example: {wkd: 'Wed', mod: '>', hh: '10', mer: 'pm'}
                 * we early-exit if we find anything other than time-units
                */
                const time = ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'];
                if (!ownKeys(rest)
                    .every(key => time.includes(key))) // non 'time-unit' keys detected
                    return dateTime; // this is not a true {weekDay} pattern, so early-exit
                if (!isEmpty(mod) && !isEmpty(sfx)) {
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).warn(this.#local.config, `Cannot provide both a modifier '${mod}' and suffix '${sfx}'`);
                    return dateTime; // cannot provide both 'modifier' and 'suffix'
                }
                const weekday = __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_prefix).call(Tempo, wkd); // conform weekday-name
                const adjust = +nbr; // how many weeks to adjust
                const offset = Tempo.WEEKDAY.keys() // how far weekday is from today
                    .findIndex((el) => el === weekday);
                const days = offset - dateTime.dayOfWeek // number of days to offset from dateTime
                    + (this.#parseModifier({ mod: mod ?? sfx, adjust, offset, period: dateTime.dayOfWeek }) * dateTime.daysInWeek);
                delete groups["wkd"];
                delete groups["mod"];
                delete groups["nbr"];
                delete groups["sfx"];
                return dateTime
                    .add({ days }); // set new {day}
            }
            /**
             * match input against date patterns
             * @returns adjusted ZonedDateTime with resolved time-components
             */
            #parseDate(groups, dateTime) {
                const { mod, nbr = '1', afx, unt, yy, mm, dd } = groups;
                if (isEmpty(yy) && isEmpty(mm) && isEmpty(dd) && isUndefined(unt))
                    return dateTime; // return default
                if (!isEmpty(mod) && !isEmpty(afx)) {
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).warn(this.#local.config, `Cannot provide both a modifier '${mod}' and suffix '${afx}'`);
                    return dateTime;
                }
                let { year, month, day } = this.#num({
                    year: yy ?? dateTime.year, // supplied year, else current year
                    month: mm ?? dateTime.month, // supplied month, else current month
                    day: dd ?? dateTime.day, // supplied day, else current day
                });
                // handle {unt} relative offset (e.g. '2 days ago')
                if (unt) {
                    const adjust = +nbr;
                    const direction = (mod === '<' || mod === '-' || afx === 'ago') ? -1 : 1;
                    const plural = singular(unt) + 's';
                    dateTime = dateTime.add({ [plural]: adjust * direction });
                    delete groups["unt"];
                    delete groups["nbr"];
                    delete groups["afx"];
                    delete groups["mod"];
                    return dateTime;
                }
                // convert 2-digit year to 4-digits using 'pivot-year' (relative to current century)
                if (year.toString().match(Match.twoDigit)) { // if {year} match just-two digits
                    const pivot = dateTime
                        .subtract({ years: this.#local.parse["pivot"] }) // pivot cutoff to determine century
                        .year % 100; // remainder 
                    const century = Math.trunc(dateTime.year / 100); // current century
                    year += (century - Number(year >= pivot)) * 100; // now a four-digit year
                }
                // adjust the {year} if a Modifier is present
                const adjust = +nbr; // how many years to adjust
                const offset = Number(pad(month) + '.' + pad(day)); // the event month.day
                const period = Number(pad(dateTime.month) + '.' + pad(dateTime.day + 1));
                year += this.#parseModifier({ mod: mod ?? afx, adjust, offset, period });
                Object.assign(groups, { yy: year, mm: month, dd: day });
                delete groups["mod"];
                delete groups["nbr"];
                delete groups["afx"];
                // all date-components are now set; check for overflow in case past end-of-month
                return Temporal.PlainDate.from({ year, month, day }, { overflow: 'constrain' })
                    .toZonedDateTime(dateTime.timeZoneId) // adjust to constrained date
                    .withPlainTime(dateTime.toPlainTime()); // restore the time
            }
            /** match input against 'tm' pattern (returns adjusted ZonedDateTime) */
            #parseTime(groups = {}, dateTime) {
                if (isUndefined(groups["hh"])) // must contain 'time' with at least {hh}
                    return dateTime;
                let { hh = 0, mi = 0, ss = 0, ms = 0, us = 0, ns = 0 } = this.#num(groups);
                if (hh >= 24) {
                    dateTime = dateTime.add({ days: Math.trunc(hh / 24) }); // move the date forward number of days to offset								
                    hh %= 24; // midnight is '00:00' on the next-day
                }
                if (isDefined(groups["ff"])) { // {ff} is fractional seconds and overrides {ms|us|ns}
                    const ff = groups["ff"].substring(0, 9).padEnd(9, '0');
                    ms = +ff.substring(0, 3);
                    us = +ff.substring(3, 6);
                    ns = +ff.substring(6, 9);
                }
                if (groups["mer"]?.toLowerCase() === 'pm' && hh < 12 && (hh + mi + ss + ms + us + ns) > 0)
                    hh += 12; // anything after midnight and before midday
                if (groups["mer"]?.toLowerCase() === 'am' && hh >= 12)
                    hh -= 12; // anything after midday
                return dateTime // return the computed time-values
                    .withPlainTime({ hour: hh, minute: mi, second: ss, millisecond: ms, microsecond: us, nanosecond: ns });
            }
            /**
             * apply a timezone or calendar bracket to the current ZonedDateTime
             * normalization is applied to ensure 'Z' is treated as 'UTC'
             */
            #parseZone(groups, dateTime) {
                const tzd = groups["tzd"]?.replace(Match.zed, 'UTC'); // normalize timezone/offset
                const brk = groups["brk"]?.replace(Match.zed, 'UTC'); // handle bracketed timezone
                const zone = brk || tzd;
                if (zone && zone !== dateTime.timeZoneId && !zone.startsWith('u-ca=')) {
                    if (this.#local)
                        this.#local.config.timeZone = zone; // update local config if exists
                    dateTime = dateTime.toPlainDateTime().toZonedDateTime(zone); // adopt timezone override (stable)
                }
                const cal = groups["cal"];
                if (cal && cal !== dateTime.calendarId) {
                    const calendar = cal.startsWith('u-ca=') ? cal.substring(5) : cal;
                    this.#local.config.calendar = calendar;
                    dateTime = dateTime.withCalendar(calendar);
                }
                delete groups["brk"];
                delete groups["cal"];
                delete groups["tzd"];
                return dateTime;
            }
            /** match an {event} string against a date pattern */
            #parseEvent(evt) {
                const groups = {};
                const pats = this.#local.parse.isMonthDay // first find out if we have a US-format timeZone
                    ? ['mdy', 'dmy', 'ymd'] // if so, try {mdy} before {dmy}
                    : ['dmy', 'mdy', 'ymd']; // else try {dmy} before {mdy}
                for (const pat of pats) {
                    const reg = this.#getPattern(pat);
                    if (isDefined(reg)) {
                        const match = this.#parseMatch(reg, evt);
                        if (!isEmpty(match)) {
                            this.#result({ type: 'Event', value: evt, match: pat, groups: cleanify(match) });
                            Object.assign(groups, match);
                        }
                    }
                    if (!isEmpty(groups))
                        break; // return on the first matched pattern
                }
                return groups; // overlay the match date-components
            }
            /** match a {period} string against the time pattern */
            #parsePeriod(per) {
                const groups = {};
                const tm = this.#getPattern('tm'); // get the RegExp for the time-pattern
                if (isDefined(tm)) {
                    const match = this.#parseMatch(tm, per);
                    if (!isEmpty(match)) {
                        this.#result({ type: 'Period', value: per, match: 'tm', groups: cleanify(match) });
                        Object.assign(groups, match);
                    }
                }
                return groups;
            }
            /** lookup the RegExp for a given pattern name */
            #getPattern(pat) {
                const reg = this.#local.parse.pattern.get(Tempo.getSymbol(pat));
                if (isUndefined(reg))
                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).catch(this.#local.config, `Cannot find pattern: "${pat}"`);
                return reg;
            }
            /** return a new object, with only numeric values */
            #num = (groups) => {
                return ownEntries(groups)
                    .reduce((acc, [key, val]) => {
                    if (isNumeric(val))
                        acc[key] = asNumber(val);
                    return acc;
                }, {});
            };
            /** mutate the date-time by adding a duration */
            #add = (args, options = {}) => {
                var _b;
                const tz = options.timeZone ?? this.tz;
                let zdt = this.#zdt.withTimeZone(tz);
                const overrides = {
                    timeZone: tz,
                    calendar: this.#zdt.calendarId
                };
                __classPrivateFieldSet(_b = Tempo, _classThis, __classPrivateFieldGet(_b, _classThis, "f", _Tempo_pending) ?? [...this.#local.parse.result], "f", _Tempo_pending); // collected parse-results so-far
                if (isDefined(args)) {
                    if (isObject(args) && args.constructor === Object) {
                        const mutate = 'add';
                        zdt = Object.entries(args ?? {}) // loop through each mutation
                            .reduce((zdt, [unit, offset]) => {
                            if (unit === 'timeZone' || unit === 'calendar')
                                return zdt;
                            const single = singular(unit);
                            const plural = single + 's';
                            switch (`${mutate}.${single}`) {
                                case 'add.year':
                                case 'add.month':
                                case 'add.week':
                                case 'add.day':
                                case 'add.hour':
                                case 'add.minute':
                                case 'add.second':
                                case 'add.millisecond':
                                case 'add.microsecond':
                                case 'add.nanosecond':
                                    return zdt
                                        .add({ [plural]: offset });
                                default:
                                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).catch(this.#local.config, `Unexpected method(${mutate}), unit(${unit}) and offset(${offset})`);
                                    return zdt;
                            }
                        }, zdt);
                    }
                    else {
                        return new this.#Tempo(args, { ...this.#options, ...overrides, ...options, anchor: zdt });
                    }
                }
                return new this.#Tempo(zdt, { ...this.#options, ...overrides, ...options, anchor: zdt });
            };
            /** mutate the date-time by setting specific offsets */
            #set = (args, options = {}) => {
                var _b;
                const tz = options.timeZone ?? this.tz;
                let zdt = this.#zdt.withTimeZone(tz);
                const overrides = {
                    timeZone: tz,
                    calendar: this.#zdt.calendarId
                };
                __classPrivateFieldSet(_b = Tempo, _classThis, __classPrivateFieldGet(_b, _classThis, "f", _Tempo_pending) ?? [...this.#local.parse.result], "f", _Tempo_pending); // collected parse-results so-far
                if (isDefined(args)) {
                    if (isObject(args) && args.constructor === Object) {
                        if (args.timeZone)
                            overrides.timeZone = args.timeZone;
                        if (args.calendar)
                            overrides.calendar = args.calendar;
                        zdt = Object.entries(args ?? {}) // loop through each mutation
                            .reduce((zdt, [key, adjust]) => {
                            if (key === 'timeZone' || key === 'calendar')
                                return zdt;
                            const { mutate, offset, single } = ((key) => {
                                switch (key) {
                                    case 'start':
                                    case 'mid':
                                    case 'end':
                                        return { mutate: key, offset: 0, single: singular(adjust?.toString() ?? '') };
                                    default:
                                        return { mutate: 'set', offset: adjust, single: singular(key) };
                                }
                            })(key); // IIFE to analyze arguments
                            switch (`${mutate}.${single}`) {
                                case 'set.timeZone':
                                    return zdt.withTimeZone(offset);
                                case 'set.calendar':
                                    return zdt.withCalendar(offset);
                                case 'set.period':
                                case 'set.time':
                                case 'set.date':
                                case 'set.event':
                                case 'set.dow': // set day-of-week by number
                                case 'set.wkd': // set day-of-week by name
                                    return this.#parse(offset, zdt);
                                case 'set.year':
                                case 'set.month':
                                // case 'set.week':																				// not defined
                                case 'set.day':
                                case 'set.hour':
                                case 'set.minute':
                                case 'set.second':
                                case 'set.millisecond':
                                case 'set.microsecond':
                                case 'set.nanosecond':
                                    return zdt
                                        .with({ [single]: offset });
                                case 'set.yy':
                                case 'set.mm':
                                // case 'set.ww':																					// not defined
                                case 'set.dd':
                                case 'set.hh':
                                case 'set.mi':
                                case 'set.ss':
                                case 'set.ms':
                                case 'set.us':
                                case 'set.ns':
                                    const value = Tempo.ELEMENT[single];
                                    return zdt
                                        .with({ [value]: offset });
                                case 'start.year':
                                    return zdt
                                        .with({ month: Tempo.MONTH.Jan, day: 1 })
                                        .startOfDay();
                                case 'start.term': // TODO
                                    return zdt;
                                case 'start.month':
                                    return zdt
                                        .with({ day: 1 })
                                        .startOfDay();
                                case 'start.week':
                                    return zdt
                                        .add({ days: -(this.dow - Tempo.WEEKDAY.Mon) })
                                        .startOfDay();
                                case 'start.day':
                                    return zdt
                                        .startOfDay();
                                case 'start.hour':
                                case 'start.minute':
                                case 'start.second':
                                    return zdt
                                        .round({ smallestUnit: offset, roundingMode: 'trunc' });
                                // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                                case 'mid.year':
                                    return zdt
                                        .with({ month: Tempo.MONTH.Jul, day: 1 })
                                        .startOfDay();
                                case 'mid.term': // TODO: relevant?
                                    return zdt;
                                case 'mid.month':
                                    return zdt
                                        .with({ day: Math.trunc(zdt.daysInMonth / 2) })
                                        .startOfDay();
                                case 'mid.week':
                                    return zdt
                                        .add({ days: -(this.dow - Tempo.WEEKDAY.Thu) })
                                        .startOfDay();
                                case 'mid.day':
                                    return zdt
                                        .round({ smallestUnit: 'day', roundingMode: 'trunc' })
                                        .add({ hours: 12 });
                                case 'mid.hour':
                                    return zdt
                                        .round({ smallestUnit: 'hour', roundingMode: 'trunc' })
                                        .add({ minutes: 30 });
                                case 'mid.minute':
                                    return zdt
                                        .round({ smallestUnit: 'minute', roundingMode: 'trunc' })
                                        .add({ seconds: 30 });
                                case 'mid.second':
                                    return zdt
                                        .round({ smallestUnit: 'second', roundingMode: 'trunc' })
                                        .add({ milliseconds: 500 });
                                // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                                case 'end.year':
                                    return zdt
                                        .add({ years: 1 })
                                        .with({ month: Tempo.MONTH.Jan, day: 1 })
                                        .startOfDay()
                                        .subtract({ nanoseconds: 1 });
                                case 'end.term': // TODO
                                    return zdt
                                        .subtract({ nanoseconds: 1 });
                                case 'end.month':
                                    return zdt
                                        .add({ months: 1 })
                                        .with({ day: 1 })
                                        .startOfDay()
                                        .subtract({ nanoseconds: 1 });
                                case 'end.week':
                                    return zdt
                                        .add({ days: (Tempo.WEEKDAY.Sun - this.dow) + 1 })
                                        .startOfDay()
                                        .subtract({ nanoseconds: 1 });
                                case 'end.day':
                                case 'end.hour':
                                case 'end.minute':
                                case 'end.second':
                                    return zdt
                                        .round({ smallestUnit: offset, roundingMode: 'ceil' })
                                        .subtract({ nanoseconds: 1 });
                                default:
                                    __classPrivateFieldGet(Tempo, _classThis, "f", _Tempo_dbg).catch(this.#local.config, `Unexpected method(${mutate}), unit(${adjust}) and offset(${single})`);
                                    return zdt;
                            }
                        }, zdt); // start reduce with the shifted zonedDateTime
                    }
                    else {
                        return new this.#Tempo(args, { ...this.#options, ...overrides, ...options, anchor: zdt });
                    }
                }
                return new this.#Tempo(zdt, { ...this.#options, ...overrides, ...options, anchor: zdt });
            };
            #format = (fmt) => {
                if (isNull(this.#tempo))
                    return undefined; // don't format <null> dates
                const obj = this.#local.config.formats;
                let template = (isString(fmt) && obj.has(fmt))
                    ? obj[fmt]
                    : String(fmt);
                // auto-meridiem: if {HH} is present and {mer} is absent, append it after the last time component
                if (template.includes('{HH}') && !template.includes('{mer}') && !template.includes('{MER}')) {
                    const index = Math.max(template.lastIndexOf('{HH}'), template.lastIndexOf('{mi}'), template.lastIndexOf('{ss}'));
                    if (index !== -1) {
                        const end = template.indexOf('}', index) + 1;
                        template = template.slice(0, end) + '{mer}' + template.slice(end);
                    }
                }
                const result = template.replace(Match.braces, (_match, token) => {
                    switch (token) {
                        case 'wy': return pad(this.wy, 4);
                        case 'yyww': return pad(this.wy, 4) + pad(this.ww);
                        case 'yyyy': return pad(this.yy, 4);
                        case 'yy': return pad(this.yy % 100);
                        case 'mon': return this.mon;
                        case 'mmm': return this.mmm;
                        case 'mm': return pad(this.mm);
                        case 'dd': return pad(this.dd);
                        case 'day': return this.day.toString();
                        case 'dow': return this.dow.toString();
                        case 'wkd': return this.wkd;
                        case 'www': return this.www;
                        case 'ww': return pad(this.ww);
                        case 'hh': return pad(this.hh);
                        case 'HH': return pad(this.hh > 12 ? this.hh % 12 : this.hh || 12);
                        case 'mer': return this.hh >= 12 ? 'pm' : 'am';
                        case 'MER': return this.hh >= 12 ? 'PM' : 'AM';
                        case 'mi': return pad(this.mi);
                        case 'ss': return pad(this.ss);
                        case 'ms': return pad(this.ms, 3);
                        case 'us': return pad(this.us, 3);
                        case 'ns': return pad(this.ns, 3);
                        case 'ff': return `${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`;
                        case 'hhmiss': return `${pad(this.hh)}${pad(this.mi)}${pad(this.ss)}`;
                        case 'ts': return this.ts.toString();
                        case 'nano': return this.nano.toString();
                        case 'tz': return this.tz;
                        default: {
                            return token.startsWith('term.')
                                ? stringify(this.term[token.slice(5)])
                                : `{${token}}`; // unknown format-code, return as-is
                        }
                    }
                });
                const isExplicitlyNumeric = ['{yyyy}{ww}', '{yyyy}{mm}', '{yyyy}{mm}{dd}', '{yyww}', '{wy}{ww}', '{wy}'].includes(template);
                return (isExplicitlyNumeric ? ifNumeric(result) : result);
            };
            #until(arg, until = {}, since = false) {
                let value, opts = {}, unit;
                switch (true) {
                    case isString(arg) && Tempo.ELEMENT.includes(singular(arg)):
                        unit = arg; // e.g. tempo.until('hours')
                        ({ value, ...opts } = until);
                        break;
                    case isString(arg): // assume 'arg' is a dateTime string
                        value = arg; // e.g. tempo.until('20-May-1957', {unit: 'years'})
                        if (isObject(until))
                            ({ unit, ...opts } = until);
                        else
                            unit = until; // assume the 'until' arg is a 'unit' string
                        break;
                    case isObject(arg) && isString(until): // assume 'until' is a Unit
                        unit = until; // e.g. tempo.until({value:'20-May-1957}, 'years'})
                        ({ value, ...opts } = arg);
                        break;
                    case isObject(arg) && isObject(until): // assume combination of Tempo.Options and Tempo.Until
                        ({ value, unit, ...opts } = Object.assign({}, arg, until));
                        break;
                    case isString(until):
                        unit = until;
                        value = arg;
                        break;
                    case isObject(until):
                        unit = until.unit;
                        value = arg;
                        break;
                    default:
                        value = arg; // assume 'arg' is a DateTime
                }
                const offset = new this.#Tempo(value, opts); // create the offset Tempo
                const diffZone = this.#zdt.timeZoneId !== offset.#zdt.timeZoneId;
                // Temporal restricts cross-timezone math to absolute units ('hours') to avoid DST ambiguity
                const duration = this.#zdt.until(offset.#zdt.withCalendar(this.#zdt.calendarId), { largestUnit: diffZone ? 'hours' : (unit ?? 'years') });
                if (isDefined(unit))
                    unit = `${singular(unit)}s`; // coerce to plural
                if (isUndefined(unit) || since) {
                    const res = getAccessors(duration)
                        .reduce((acc, dur) => Object.assign(acc, ifDefined({ [dur]: duration[dur] })), {});
                    return Object.assign(res, { iso: duration.toString(), unit });
                }
                return duration.total({ relativeTo: this.#zdt, unit });
            }
            /** format the elapsed time between two Tempos (to nanosecond) */
            #since(arg, until = {}) {
                const dur = this.#until(arg, until, true); // get a Tempo.Duration object
                const date = [dur.years, dur.months, dur.days];
                const time = [dur.hours, dur.minutes, dur.seconds];
                const fraction = [dur.milliseconds, dur.microseconds, dur.nanoseconds]
                    .map(Math.abs)
                    .map(nbr => nbr.toString().padStart(3, '0'))
                    .join('');
                const rtf = new Intl.RelativeTimeFormat(this.#local.config['locale'], { style: 'narrow' });
                switch (dur.unit) {
                    case 'years':
                        return rtf.format(date[0], 'years');
                    case 'months':
                        return rtf.format(date[1], 'months');
                    case 'weeks':
                        return rtf.format(date[1], 'weeks');
                    case 'days':
                        return rtf.format(date[2], 'days');
                    case 'hours':
                        return rtf.format(time[0], 'hours');
                    case 'minutes':
                        return rtf.format(time[1], 'minutes');
                    case 'seconds':
                        return rtf.format(time[2], 'seconds');
                    case 'milliseconds':
                    case 'microseconds':
                    case 'nanoseconds':
                        return `${fraction}`;
                    default:
                        return dur.iso;
                }
            }
            static {
                __runInitializers(_classThis, _classExtraInitializers);
            }
        };
        return Tempo = _classThis;
    })();
    // #endregion Namespace
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Tempo.init(); // initialize default global configuration
    // shortcut functions to common Tempo properties / methods
    /** check valid Tempo */ const isTempo = (tempo) => isType(tempo, 'Tempo');
    /** current timestamp (ts) */ const getStamp = ((tempo, options) => new Tempo(tempo, options).ts);
    /** create new Tempo */ const getTempo = ((tempo, options) => new Tempo(tempo, options));
    /** format a Tempo */ const fmtTempo = ((fmt, tempo, options) => new Tempo(tempo, options).format(fmt));

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
                this.#pledge.promise.catch(() => { }); // global catch-all to prevent unhandled rejections
                Object.freeze(this); // make this instance immutable
            }
            get [Symbol.toStringTag]() {
                return 'Pledge';
            }
            [Symbol.dispose]() {
                if (this.isPending)
                    this.reject(new Error(`Pledge disposed`)); // discard pending Pledge (to notify wait-ers)
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
                    this.#pledge.resolve(value); // resolve, then trigger any Pledge.onResolve, then Pledge.onSettle
                }
                else
                    this.#dbg.warn(this.#status, `Pledge was already ${this.state}`);
                return this.#pledge.promise;
            }
            reject(error) {
                if (this.isPending) {
                    this.#status.error = error;
                    this.#status.state = Pledge.STATE.Rejected;
                    this.#pledge.reject(error); // reject, then trigger any Pledge.onReject, then Pledge.onSettle
                }
                else
                    this.#dbg.warn(this.#status, `Pledge was already ${this.state}`);
                return this.#pledge.promise;
            }
            then(fn) {
            }
            static {
                __runInitializers(_classThis, _classExtraInitializers);
            }
        };
        return Pledge = _classThis;
    })();

    exports.$Tempo = $Tempo;
    exports.Enumify = Enumify;
    exports.Pledge = Pledge;
    exports.Registry = Registry;
    exports.Tempo = Tempo;
    exports.cleanify = cleanify;
    exports.clone = clone;
    exports.cloneify = cloneify;
    exports.enumify = enumify;
    exports.enums = tempo_enum;
    exports.fmtTempo = fmtTempo;
    exports.getStamp = getStamp;
    exports.getTempo = getTempo;
    exports.isTempo = isTempo;
    exports.objectify = objectify;
    exports.stringify = stringify;

}));
//# sourceMappingURL=tempo.bundle.js.map
