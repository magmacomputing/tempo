/** the primitive type reported by toStringTag() */
const protoType = (obj) => Object.prototype.toString.call(obj).slice(8, -1);
/**
 * return an object's type as a ProperCase string.
 * if instance, return Class name
 */
export const getType = (obj, ...instances) => {
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
export const asType = (value, ...instances) => ({ type: getType(value, ...instances), value });
/** assert value is one of a list of Types */
export const isType = (obj, ...types) => types.includes(getType(obj));
/** Type-Guards: assert \<obj> is of \<type> */
export const isPrimitive = (obj) => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Void', 'Null', 'Empty');
export const isReference = (obj) => !isPrimitive(obj);
export const isIterable = (obj) => Symbol.iterator in Object(obj) && !isString(obj);
export const isString = (obj) => isType(obj, 'String');
export const isNumber = (obj) => isType(obj, 'Number') && isFinite(obj);
export const isInteger = (obj) => isType(obj, 'BigInt');
export const isIntegerLike = (obj) => isType(obj, 'String') && /^-?[0-9]+n$/.test(obj);
export const isDigit = (obj) => isType(obj, 'Number', 'BigInt');
export const isBoolean = (obj) => isType(obj, 'Boolean');
export const isArray = (obj) => isType(obj, 'Array');
export const isArrayLike = (obj) => protoType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
export const isObject = (obj) => isType(obj, 'Object');
export const isDate = (obj) => isType(obj, 'Date');
export const isRegExp = (obj) => isType(obj, 'RegExp');
export const isRegExpLike = (obj) => isType(obj, 'String') && /^\/.*\/$/.test(obj);
export const isSymbol = (obj) => isType(obj, 'Symbol');
export const isSymbolFor = (obj) => isType(obj, 'Symbol') && Symbol.keyFor(obj) !== undefined;
export const isPropertyKey = (obj) => isType(obj, 'String', 'Number', 'Symbol');
export const isNull = (obj) => isType(obj, 'Null');
export const isNullish = (obj) => isType(obj, 'Null', 'Undefined', 'Void', 'Empty');
export const isUndefined = (obj) => isType(obj, 'Undefined', 'Void', 'Empty');
export const isDefined = (obj) => !isNullish(obj);
export const isClass = (obj) => isType(obj, 'Class');
export const isFunction = (obj) => isType(obj, 'Function', 'AsyncFunction');
export const isPromise = (obj) => isType(obj, 'Promise');
export const isMap = (obj) => isType(obj, 'Map');
export const isSet = (obj) => isType(obj, 'Set');
export const isError = (err) => isType(err, 'Error');
export const isTemporal = (obj) => protoType(obj).startsWith('Temporal.');
// non-standard Objects
export const isTempo = (obj) => isType(obj, 'Tempo');
export const isEnum = (obj) => isType(obj, 'Enumify');
export const isPledge = (obj) => isType(obj, 'Pledge');
export const nullToZero = (obj) => obj ?? 0;
export const nullToEmpty = (obj) => obj ?? '';
export const nullToValue = (obj, value) => obj ?? value;
/** object has no values */
export const isEmpty = (obj) => false
    || isNullish(obj)
    || (isObject(obj) && (Reflect.ownKeys(obj).length === 0))
    || (isString(obj) && (obj.trim().length === 0))
    || (isNumber(obj) && (isNaN(obj) === true))
    || (isArray(obj) && (obj.length === 0))
    || (isSet(obj) && (obj.size === 0))
    || (isMap(obj) && (obj.size === 0));
export function assertCondition(condition, message) {
    if (!condition)
        throw new Error(message);
}
export function assertString(str) { assertCondition(isString(str), `Invalid string: ${str}`); }
;
export function assertNever(val) { throw new Error(`Unexpected object: ${val}`); }
;
//# sourceMappingURL=type.library.js.map