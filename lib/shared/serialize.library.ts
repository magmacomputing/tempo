import { isNumeric } from '@module/shared/number.library';
import { isType, asType, isEmpty, isString, isObject, isArray, isFunction, Types } from '@module/shared/type.library';

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
		return objectify(stringify(obj), sentinel) as T;
	} catch (error: any) {
		console.warn('Could not cloneify object: ', obj);
		console.warn('stack: ', error.stack);
		return obj;
	}
}

function replacer(key: string, obj: any): any { return isEmpty(key) ? obj : stringify(obj) };
function reviver(sentinel?: Function): any { return (key: string, str: any) => isEmpty(key) ? str : objectify(str, sentinel) }

/** encode control characters, whilst allowing a subset as string */
function encode(val: string) {
	return encodeURI(val)
		.replace(/%20/g, ' ')
		.replace(/%5B/g, '[')
		.replace(/%5D/g, ']')
		.replace(/%5E/g, '^')
		.replace(/%60/g, '`')
		.replace(/%7B/g, '{')
		.replace(/%7D/g, '}')
		.replace(/%22/g, '\"')
}

/** check type can be stringify'd */
const isStringable: (val: unknown) => boolean = (val) => !isType(val, 'Function', 'Symbol', 'WeakMap', 'WeakSet', 'WeakRef');

/** string representation of a single-key Object */
const oneKey = (type: Types, val: string) => `{"${type}": ${val}}`;

/**
 * For items which are not currently serializable (Undefined, BigInt, Set, Map, etc.)  
 * we create a stringified, single-key Object to represent the value; for example  { 'BigInt': 123 }  
 * I would have preferred to use something more robust than strings for these keys  (perhaps a well-known Symbol),
 * as this single-key Object is open to abuse.  But the risk is acceptable within the scope of small projects.
 * 
 * Drawbacks:
 * no support Function / Symbol / WeakMap / WeakSet / WeakRef  
 * limited support for user-defined Classes (must be specifically coded)
 */

/**
 * Serialize Objects for string-safe stashing in WebStorage, Cache, etc    
 * uses JSON.stringify where available, else returns single-key Object {[type]: value}  
 */
export function stringify(obj: any): string {
	const arg = asType(obj);

	switch (arg.type) {
		case 'String':
			return JSON.stringify(encode(arg.value));							// encode string for safe-storage

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
				.map(([key, val]) => '"' + key + '":' + stringify(val))
				+ `}`;

		case 'Array':
		case 'Tuple':
			return `${arg.type === 'Tuple' ? '#' : ''}[` + arg.value
				.filter(val => isStringable(val))
				.map(val => stringify(val))
				+ `]`;

		case 'Map':
			const map = Array.from(arg.value.entries())
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => '[' + stringify(key) + ',' + stringify(val) + ']')
				.join(',')
			return oneKey(arg.type, `[${map}]`);

		case 'Set':
			const set = Array.from(arg.value.values())
				.filter(val => isStringable(val))
				.map(val => stringify(val))
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
					return oneKey(arg.type, arg.value.valueOf());

				case isFunction(arg.value.toString):								// Object has its own toString method
					return oneKey(arg.type, arg.value.toString());

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
		return str as T;

	const parse = JSON.parse(str, (_key, val) => {						// throw an Error if cannot parse
		if (isString(val)) {
			try {
				return decodeURI(val);															// might fail, if badly encoded '%'
			} catch (err) {
				console.warn(`objectify.decodeURI: ${(err as Error).message} -> ${val}`);
				return val;																					// return un-decoded
			}
		}
		return val;																							// return as-is
	})

	switch (true) {
		case str.startsWith('{') && str.endsWith('}'):					// looks like JSON
		case str.startsWith('[') && str.endsWith(']'):					// looks like Array
		case str.startsWith('#{') && str.endsWith('}'):					// looks like Record
		case str.startsWith('#[') && str.endsWith(']'):					// looks like Tuple
			return traverse(parse);																// recurse into object

		case isNumeric(str):																		// is Number
		case str.startsWith('"') && str.endsWith('"'):					// looks like String
		case str === 'true':																		// looks like Boolean
		case str === 'false':																		// looks like Boolean
		case str === 'null':																		// looks like Null
			return parse;

		default:
			console.log('Default: ', str);
			return str as T;
	}
}

/** Rebuild a single-key Object (that represents a item not currently serializable) */
function typeify(json: unknown) {
	if (!isObject(json))
		return json;																						// only JSON Objects

	const entries = Object.entries(json) as [string, any][];
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
			return void 0;
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

		default:
			return json;																					// return JSON Object
	}
}

/**
 * Recurse into Object / Array, looking for special single-key Objects
 */
function traverse(obj: any): any {
	if (isObject(obj)) {
		return typeify(Object.entries(obj)
			.reduce((acc, [key, val]) =>
				Object.assign(acc, { [key]: typeify(traverse(val)) }),
				{})
		)
	}

	if (isArray(obj)) {
		return Object.values(obj)
			.map(val => typeify(traverse(val)))
	}

	return obj;
}