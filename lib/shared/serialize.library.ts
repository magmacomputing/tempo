import { Tempo } from '@module/shared/tempo.class';
import { isNumeric } from '@module/shared/number.library';
import { isType, asType, isEmpty, isString, isObject, isArray, isFunction, isRecord, isTuple, type Types } from '@module/shared/type.library';

/** make a deep-copy, using standard browser or JSON functions */
export function clone<T>(obj: T) {
	let copy = obj;																						// default to original object

	try {
		if (!globalThis.structuredClone)
			throw new Error('clone: structuredClone');						// skip, if not supported
		copy = structuredClone?.(obj);
	} catch (error) {
		try {
			copy = JSON.parse(JSON.stringify(obj));								// run any toString() methods
		} catch (error) {
			console.warn('Could not clone object: ', obj);
		}
	}

	return copy;
}

/** deep-copy an Object	*/
export function cloneify<T>(obj: T): T;
/** deep-copy and replace \<undefined> field with a call to Sentinel */
export function cloneify<T>(obj: T, sentinel: Function): T;
/** deep-copy and replace \<undefined> field with a Sentinel function */
export function cloneify<T>(obj: T, sentinel?: Function): T {
	try {
		return objectify(stringize(obj), sentinel) as T;
	} catch (error: any) {
		console.warn('Could not cloneify object: ', obj);
		console.warn('stack: ', error.stack);
		return obj;
	}
}

function replacer(key: string, obj: any): any { return isEmpty(key) ? obj : stringize(obj) };
function reviver(sentinel?: Function): any { return (key: string, str: any) => isEmpty(key) ? str : objectify(str, sentinel) }

/** encode control characters, then replace a subset back to text-string */
function encode(val: string) {
	return encodeURI(val)
		.replace(/%20/g, ' ')
		.replace(/%3B/g, ';')
		.replace(/%3C/g, '<')
		.replace(/%3D/g, '=')
		.replace(/%5B/g, '[')
		.replace(/%5D/g, ']')
		.replace(/%5E/g, '^')
		.replace(/%60/g, '`')
		.replace(/%7B/g, '{')
		.replace(/%7D/g, '}')
		.replace(/%22/g, '\"')
}

/** decode control characters */
function decode(val: string) {
	if (isString(val)) {
		try {
			return decodeURI(val);																// might fail if badly encoded '%'
		} catch (err) {
			console.warn(`decodeURI: ${(err as Error).message} -> ${val}`);
		}
	}

	return val;																								// return original value
}

/** check type can be stringify'd */
const isStringable: (val: unknown) => boolean = (val) => !isType(val, 'Function', 'Symbol', 'WeakMap', 'WeakSet', 'WeakRef');

/** string representation of a single-key Object */
const oneKey = (type: Types, val: string) => `{"${type}": ${val}}`;

/**
 * For items which are not currently serializable (Undefined, BigInt, Set, Map, etc.)  
 * this creates a stringified, single-key Object to represent the value; for example  { 'BigInt': 123 }  
 * I would have preferred to use something more robust than strings for these keys  (perhaps a well-known Symbol),  
 * as this single-key Object is open to abuse.  But the risk is acceptable within the scope of small projects.  
 * 
 * Drawbacks:  
 * no support Function / Symbol / WeakMap / WeakSet / WeakRef  
 * limited support for user-defined Classes (must be specifically coded)
 */

/**
 * serialize Objects for string-safe stashing in WebStorage, Cache, etc  
 * uses JSON.stringify where available, else returns stringified single-key Object {[type]: value}  
 */
export const stringify = (obj: any) => stringize(obj, false);
/** hide the second parameter for internal use only */
function stringize(obj: any, recurse = true): string {
	const arg = asType(obj);

	switch (arg.type) {
		case 'String':
			if (!recurse) {																				// these values must be stringified to preserve their type when objectified
				recurse = arg.value === 'true'
					|| arg.value === 'false'
					|| arg.value === 'null'
					|| isNumeric(arg.value)
			}

			return recurse
				? JSON.stringify(encode(arg.value))									// encode string for safe-storage
				: encode(arg.value);																// dont JSON.stringify a string

		case 'Number':
		case 'Null':
		case 'Boolean':
			return JSON.stringify(arg.value);											// JSON.stringify will correctly handle these

		case 'Undefined':
		case 'Void':
			return oneKey('Void', JSON.stringify('void'));				// preserve 'undefined' values

		case 'Object':
		case 'Record':
			return `${arg.type === 'Record' ? '#' : ''}{` + Object.entries(arg.value)
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => '"' + key + '":' + stringize(val))
				+ `}`;

		case 'Array':
		case 'Tuple':
			return `${arg.type === 'Tuple' ? '#' : ''}[` + arg.value
				.filter(val => isStringable(val))
				.map(val => stringize(val))
				+ `]`;

		case 'Map':
			const map = Array.from(arg.value.entries())
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => '[' + stringize(key) + ',' + stringize(val) + ']')
				.join(',')
			return oneKey(arg.type, `[${map}]`);

		case 'Set':
			const set = Array.from(arg.value.values())
				.filter(val => isStringable(val))
				.map(val => stringize(val))
				.join(',')
			return oneKey(arg.type, `[${set}]`);

		case 'RegExp':
			const { source, flags } = arg.value;
			return oneKey(arg.type, JSON.stringify({ source: encode(source), flags }));

		default:
			switch (true) {
				case !isStringable(arg.value):
					return void 0 as unknown as string;								// Object is not stringable

				case isFunction(arg.value.valueOf):									// Object has its own valueOf method
					return oneKey(arg.type, JSON.stringify(arg.value.valueOf()));

				case isFunction(arg.value.toString):								// Object has its own toString method
					return oneKey(arg.type, JSON.stringify(arg.value.toString()));

				case isFunction(arg.value.toJSON):									// Object has its own toJSON method
					return oneKey(arg.type, JSON.stringify(arg.value.toJSON(), replacer));

				default:																						// else standard stringify
					return oneKey(arg.type, JSON.stringify(arg.value, replacer));
			}
	}
}

/** rebuild an Object from its serialized representation */
export function objectify<T extends any>(str: any, sentinel?: Function): T {
	if (!isString(str))
		return str as T;																				// skip parsing

	try {
		const parse = JSON.parse(str, (_key, val) => decode(val)) as T;		// catch if cannot parse

		switch (true) {
			case str.startsWith('{') && str.endsWith('}'):				// looks like Object
			case str.startsWith('[') && str.endsWith(']'):				// looks like Array
			case str.startsWith('#{') && str.endsWith('}'):				// looks like Record
			case str.startsWith('#[') && str.endsWith(']'):				// looks like Tuple
				return traverse(parse, sentinel);										// recurse into object

			default:
				return parse;
		}
	} catch (err) {
		// console.warn(`objectify.parse: not a JSON string -> ${str}`);
		return str as T;
	}
}

/** Rebuild a single-key Object (that represents a item not currently serializable) */
function typeify(json: unknown, sentinel?: Function) {
	if (!isObject(json))
		return json;																						// only JSON Objects

	const entries = Object.entries(json) as [Types, any][];
	if (entries.length !== 1)																	// only single-key Objects
		return json;

	const [type, value] = entries[0];
	switch (type) {
		case 'String':
		case 'Boolean':
		case 'Object':
		case 'Array':
			return value;

		case 'Number':
			return Number(value);
		case 'BigInt':
			return BigInt(value);
		case 'Undefined':
		case 'Void':
			// return void 0;
			return sentinel?.();																	// run Sentinel function
		case 'Date':
			return new Date(value);
		case 'RegExp':
			return new RegExp(value.source, value.flags);
		case 'Map':
			return new Map(value);
		case 'Set':
			return new Set(value);
		case 'Record':
		// return Record(segment) ;															// TODO
		case 'Tuple':
		// return Tuple.from(segment) ;													// TODO

		case 'Tempo':
			return new Tempo(value);

		default:
			return json;																					// return JSON Object
	}
}

/**
 * Recurse into Object / Array, looking for special single-key Objects
 */
function traverse(obj: any, sentinel?: Function): any {
	if (isObject(obj)) {
		return typeify(Object.entries(obj)
			.reduce((acc, [key, val]) =>
				Object.assign(acc, { [key]: typeify(traverse(val, sentinel)) }),
				{}),
			sentinel
		)
	}

	if (isArray(obj)) {
		return Object.values(obj)
			.map(val => typeify(traverse(val, sentinel)))
	}

	// TODO
	if (isRecord(obj)) {

	}
	if (isTuple(obj)) {

	}

	return obj;
}