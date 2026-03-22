import { curry } from '#core/shared/function.library.js';
import { ownKeys, ownValues, ownEntries } from '#core/shared/reflection.library.js';
import { isType, asType, isEmpty, isDefined, isUndefined, isNullish, isString, isObject, isArray, isFunction, isSymbolFor, isSymbol } from '#core/shared/type.library.js';
/** registry of registered classes */
// DO NOT EDIT THIS VALUE: used by decorator.library.ts
export const Registry = new Map();
// be aware that 'structuredClone' preserves \<undefined> values...  
// and JSON.stringify() does not
/** make a deep-copy, using standard browser or JSON functions */
export function clone(obj, opts) {
    try {
        return globalThis.structuredClone(obj, opts);
    }
    catch {
        return cleanify(obj); // fallback to JSON functions
    }
}
/** return a copy. remove unsupported values (e.g. \<undefined>, function) */
export function cleanify(obj) {
    try {
        return JSON.parse(JSON.stringify(obj)); // run any toString() methods
    }
    catch (error) {
        console.warn('Could not clean object: ', obj);
        return { ...obj };
    }
}
/** deep-copy an Object, and optionally replace \<undefined> fields with a Sentinel function call	*/
export function cloneify(obj, sentinel) {
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
export function stringify(obj) {
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
export function objectify(str, sentinel) {
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
//# sourceMappingURL=serialize.library.js.map