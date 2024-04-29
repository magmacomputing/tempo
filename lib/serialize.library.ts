import { Tempo } from '@module/shared/tempo.class.js';
import { curry } from '@module/shared/function.library.js';
import { isNumeric } from '@module/shared/number.library.js';
import { allEntries } from '@module/shared/reflect.library.js';

import { isType, asType, isEmpty, isDefined, isUndefined, isNullish, isString, isObject, isArray, isFunction, isRecord, isTuple, type Types, isSymbolFor, isSymbol } from '@module/shared/type.library.js';

// be aware that 'structuredClone' preserves \<undefined> values...  
// but JSON.stringify() does not

/** make a deep-copy, using standard browser or JSON functions */
export function clone<T>(obj: T) {
	let copy = { ...obj };																		// default to original object

	try {
		if (!globalThis.structuredClone)
			throw new Error('clone: structuredClone');						// skip, if not supported
		copy = globalThis.structuredClone(obj);
	} catch (error) {
		copy = cleanify(obj);
	}

	return copy;
}

/** return a copy, remove \<undefined> */
export function cleanify<T>(obj: T) {
	let copy = { ...obj };

	try {
		copy = JSON.parse(JSON.stringify(obj));									// run any toString() methods
	} catch (error) {
		console.warn('Could not clean object: ', obj);
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
	} catch (error) {
		console.warn('Could not cloneify object: ', obj);
		console.warn('stack: ', (error as Error).stack);
		return obj;
	}
}

function replacer(key: string, obj: any): any { return isEmpty(key) ? obj : stringize(obj) }
function reviver() { return (_key: string, val: any) => decode(val) }

/** encode control characters, then replace a safe-subset back to text-string */
function encode(val: string) {
	return encodeURI(val)
		.replace(/%20/g, ' ')
		.replace(/%22/g, '"')
		.replace(/%3B/g, ';')
		.replace(/%3C/g, '<')
		.replace(/%3D/g, '=')
		.replace(/%3E/g, '>')
		.replace(/%5B/g, '[')
		.replace(/%5D/g, ']')
		.replace(/%5E/g, '^')
		.replace(/%60/g, '`')
		.replace(/%7B/g, '{')
		.replace(/%7D/g, '}')
}

/** decode control characters */
function decode(val: string) {
	if (isString(val)) {
		try {
			return decodeURI(val);																// might fail if badly encoded '%'
		} catch (error) {
			console.warn(`decodeURI: ${(error as Error).message} -> ${val}`);
		}
	}

	return val;																								// return original value
}

/** check type can be stringify'd */
function isStringable(val: unknown): boolean {
	return !isType(val, 'Function', 'AsyncFunction', 'WeakMap', 'WeakSet', 'WeakRef');
}

/** string representation of a single-key Object */
function oneKey(type: Types, value: string) {
	return `{"${type}":${value}}`;
}

/** Symbols in an Object-key will need special treatment */
function fromSymbol(key: string | number | symbol) {
	if (isSymbol(key))																				// @@(name) for global, @(name) for local
		return `${isSymbolFor(key) ? '@' : ''}@(${key.description || ''})`;

	return key.toString();
}

/** reconstruct a Symbol */
function toSymbol(key: string | number | symbol) {
	const symKey = /^@(@)?\(([^\)]*)\)$/;											// pattern to match a stringify'd Symbol
	const [pat, keyFor, desc] = key.toString().match(symKey) || [null, void 0, void 0];

	switch (true) {
		case isSymbol(key):																			// already a Symbol
		case isNullish(pat):																		// incorrect encoded Symbol
		case isDefined(keyFor) && isUndefined(desc):						// incorrect encoded global Symbol
			return key;

		case isDefined(keyFor) && isDefined(desc):							// global Symbol
			return Symbol.for(desc);

		case isUndefined(keyFor):																// local Symbol
		default:
			return Symbol(desc);
	}
}

/**
 * For items which are not currently serializable via standard JSON.stringify (Undefined, BigInt, Set, Map, etc.)  
 * this creates a stringified, single-key Object to represent the value; for example  '{ "BigInt": 123 }'  
 * I would have preferred to use something more robust than strings for the keys  (perhaps a Symbol? but that doesn't fit in well with serializing to a String),  
 * as this single-key Object is open to abuse.  But the risk is acceptable within the scope of small projects.  
 * 
 * Drawbacks:  
 * no support Function / WeakMap / WeakSet / WeakRef  
 * limited support for user-defined Classes (must be specifically coded)
 */

/**
 * serialize Objects for string-safe stashing in WebStorage, Cache, etc  
 * uses JSON.stringify where available, else returns stringified single-key Object '{"[type]": value}'  
 */
export function stringify(obj: any) {
	return stringize(obj, false);
}

/**
 * internal function to process stringify-requests (and hide second parameter)  
 * where first argument is the object to stringify, and  
 * the second argument is a boolean to indicate if function is being called recursively
 */
function stringize(obj: any, recurse = true): string {			// hide the second parameter: for internal use only
	const arg = asType(obj);
	const one = curry(oneKey)(arg.type);											// seed the oneKey() function

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
				: encode(arg.value);																// dont JSON.stringify a top-level string

		case 'Null':
		case 'Number':
		case 'Boolean':
			return JSON.stringify(arg.value);											// JSON.stringify will correctly handle these

		case 'Void':
		case 'Undefined':
			return one(JSON.stringify('void'));										// preserve 'undefined' values		

		case 'BigInt':
			return one(arg.value.toString());											// even though BigInt has a toString method, it is not supported in JSON.stringify

		case 'Object':
		case 'Record':
			const obj = allEntries(arg.value)
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => `${stringize(fromSymbol(key))}:${stringize(val)}`)
				.join(',')
			return `${arg.type === 'Record' ? '#' : ''}{${obj}}`;

		case 'Array':
		case 'Tuple':
			const arr = arg.value
				.filter(val => isStringable(val))
				.map(val => stringize(val))
				.join(',')
			return `${arg.type === 'Tuple' ? '#' : ''}[${arr}]`;

		case 'Map':
			const map = Array.from(arg.value.entries())
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => `[${stringize(fromSymbol(key))},${stringize(val)}]`)
				.join(',')
			return one(`[${map}]`);

		case 'Set':
			const set = Array.from(arg.value.values())
				.filter(val => isStringable(val))
				.map(val => stringize(val))
				.join(',')
			return one(`[${set}]`);

		case 'Symbol':
			return one(stringize(fromSymbol(arg.value)));

		case 'RegExp':
			return one(stringize(arg.value.toString()));

		default:
			switch (true) {
				case !isStringable(arg.value):
					return void 0 as unknown as string;								// Object is not stringify-able

				case isFunction(arg.value.toString):								// Object has its own toString method
					return one(JSON.stringify(arg.value.toString()));

				case isFunction(arg.value.toJSON):									// Object has its own toJSON method
					return one(JSON.stringify(arg.value.toJSON(), replacer));

				case isFunction(arg.value.valueOf):									// Object has its own valueOf method		
					return one(JSON.stringify(arg.value.valueOf()));

				default:																						// else standard stringify
					return one(JSON.stringify(arg.value, replacer));
			}
	}
}

/** rebuild an Object from its stringified representation */
export function objectify<T extends any>(str: any, sentinel?: Function): T {
	if (!isString(str))
		return str as T;																				// skip parsing

	try {
		const parse = JSON.parse(str, reviver()) as T;					// catch if cannot parse

		switch (true) {
			case str.startsWith('{') && str.endsWith('}'):				// looks like Object
			case str.startsWith('[') && str.endsWith(']'):				// looks like Array
			case str.startsWith('#{') && str.endsWith('}'):				// looks like Record
			case str.startsWith('#[') && str.endsWith(']'):				// looks like Tuple
				return traverse(parse, sentinel);										// recurse into object

			default:
				return parse;
		}
	} catch (error) {
		console.warn(`objectify.parse: -> ${str}, ${(error as Error).message}`);
		return str as T;
	}
}

/** Recurse into Object / Array, looking for special single-key Objects */
function traverse(obj: any, sentinel?: Function): any {
	if (isObject(obj)) {
		return typeify(allEntries(obj)
			.reduce((acc, [key, val]) =>
				Object.assign(acc, { [toSymbol(key)]: typeify(traverse(val, sentinel)) }),
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

/** Rebuild an Object from its single-key representation */
function typeify(json: Record<string | symbol, string>, sentinel?: Function) {
	if (!isObject(json))
		return json;																						// only JSON Objects

	// const entries = Object.entries(json) as [Types, any][];
	const entries = allEntries(json) as [Types, any][];
	if (entries.length !== 1)																	// only single-key Objects accepted
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
		case 'Null':
			return null;
		case 'Undefined':
		case 'Void':
			return sentinel?.();																	// run Sentinel function
		case 'Date':
			return new Date(value);
		case 'RegExp':
			return new RegExp(value);
		case 'Symbol':
			return toSymbol(value) ?? json;												// reconstruct Symbol
		case 'Map':
			return new Map(value);
		case 'Set':
			return new Set(value);
		case 'Record':
		// return Record(value) ;																// TODO
		case 'Tuple':
		// return Tuple.from(value) ;														// TODO

		case 'Tempo':
			return new Tempo(value);

		default:
			return json;																					// return JSON Object
	}
}
