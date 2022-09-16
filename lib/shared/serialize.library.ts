import { isNumeric } from '@module/shared/number.library';
import { asType, getType, isEmpty, isString, isObject, isArray, isFunction } from '@module/shared/type.library';

/** make a deep-copy, using standard browser or JSON functions */
export function clone<T>(obj: T) {
	let copy = obj;																						// default to original object

	// try {
	// 	copy = structuredClone?.(obj);												// structuredClone is not available in 'node'
	// } catch (error) {
	try {
		copy = JSON.parse(JSON.stringify(obj));									// this will also run any toString() methods
	} catch (error) {
		console.warn('Could not clone object: ', obj);
	}
	// }

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

function clean(val: string) {
	return encodeURI(val)
		.replace(/%20/g, ' ')
		.replace(/%5B/g, '[')
		.replace(/%5D/g, ']')
		.replace(/%60/g, '`')
		.replace(/%7B/g, '{')
		.replace(/%7D/g, '}')
		.replace(/%22/g, '\"')
}

/**
 * For items which are not currently serializable (Undefined, BigInt, Set, Map, etc.)  
 * we create a stringified, single-key Object to represent the value; for example  { 'BigInt': 123 }  
 * I would have preferred to use something more robust than strings for these keys  (perhaps a well-known Symbol),
 * as this single-key Object is open to abuse.  But the risk is acceptable within the scope of small projects.
 * 
 * Drawbacks:
 * no support WeakMap / WeakSet / WeakRef
 */

/**
 * Serialize Objects for string-safe stashing in WebStorage, Cache, etc    
 * uses JSON.stringify where available, else returns single-key Object {[type]: value}  
 */
export function stringify(obj: any): string {
	const arg = asType(obj);
	const prefix = '"' + arg.type + '":';
	const immute = ['Record', 'Tuple'].includes(arg.type) ? '#' : '';

	switch (arg.type) {
		case 'String':
			return JSON.stringify(clean(arg.value));

		case 'Null':
		case 'Boolean':
			return JSON.stringify(arg.value);

		case 'Undefined':
		case 'Void':
			return JSON.stringify({ "Void": "void" });

		case 'Number':
			return arg.value as unknown as string;

		case 'BigInt':
			return JSON.stringify({ [arg.type]: arg.value.toString() });

		case 'Date':
			return JSON.stringify({ [arg.type]: arg.value.toISOString() });

		case 'Object':
		case 'Record':																					// TODO
			return `${immute}{` + (Object.entries(arg.value))
				.map(([key, val]) => '"' + key + '":' + stringify(val))
				+ `}`;

		case 'Array':
		case 'Tuple':																						// TODO
			return `${immute}[` + arg.value
				.map((val) => stringify(val))
				+ `]`;

		case 'Map':
			const map = (Array.from(arg.value.entries()) as any[][])
				.map(([key, val]) => '[' + stringify(key) + ',' + stringify(val) + ']')
				.join(',')
			return `{"${arg.type}": [${clean(map)}]}`;

		case 'Set':
			const set = (Array.from(arg.value.values()) as any[])
				.map((val) => stringify(val))
				.join(',')
			return `{"${arg.type}": [${clean(set)}]}`;

		case 'Function':
			return '{}';																					// unsupported

		default:
			switch (true) {
				case isFunction(arg.value.toJSON):									// Object has its own toJSON method
					return `${prefix}${JSON.stringify(arg.value.toJSON(), replacer)}`;

				case isFunction(arg.value.toString):								// Object has its own toString method
					return `${prefix}${arg.value.toString()}`;

				default:
					return `${prefix}${JSON.stringify(arg.value)}`;		// else standard stringify
			}
	}
}

/**
 * rebuild an Object from its serialized representation
 */
export function objectify<T extends any>(str: any, sentinel?: Function): T {
	if (!isString(str))
		return str as T;

	let uri: string;
	let parse: any;

	try {
		uri = decodeURI(str);																		// check encoding
	} catch (err) {
		console.warn(`objectify.decodeURI: ${(err as Error).message} -> ${str}`);
		uri = str;																							// fallback to original string
	}

	try {
		parse = JSON.parse(uri);																// check parse
	} catch (err) {
		console.warn(`objectify.parse: ${(err as Error).message} -> ${str}`);
		return str as T;
	}

	switch (true) {
		case str.startsWith('{') && str.endsWith('}'):					// looks like JSON
		case str.startsWith('#{') && str.endsWith('}'):					// looks like Record
		case str.startsWith('[') && str.endsWith(']'):					// looks like Array
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

/**
 * Rebuild a single-key Object (that represents a item not currently serializable)
 */
function typeify(json: unknown, sentinel?: Function) {
	if (!isObject(json))
		return json;																						// only JSON Objects

	const entries = Object.entries(json) as [string, any][];
	if (entries.length !== 1)																	// only single-key Objects
		return json;

	const [type, value] = entries[0];
	switch (type) {
		case 'String':
			return decodeURI(value);
		case 'Boolean':
			return value;
		case 'Number':
			return Number(value);
		case 'BigInt':
			return BigInt(value);
		case 'Object':
			return value;
		case 'Array':
			return value;
		case 'Undefined':
		case 'Void':
			return void 0;
		case 'Date':
			return new Date(value);
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
 * Recurse into Object / Array, looking for single-key Objects
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