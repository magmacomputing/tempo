import { Tempo } from '#core/shared/tempo.class.js';
import { curry } from '#core/shared/function.library.js';
import { isNumeric } from '#core/shared/number.library.js';
import { enumify } from '#core/shared/enumerate.library.js';
import { ownKeys, ownValues, ownEntries } from '#core/shared/reflection.library.js';

import { isType, asType, isEmpty, isDefined, isUndefined, isNullish, isString, isObject, isArray, isFunction, type Types, isSymbolFor, isSymbol } from '#core/shared/type.library.js';

// be aware that 'structuredClone' preserves \<undefined> values...  
// and JSON.stringify() does not

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

/** deep-copy an Object, and optionally replace \<undefined> fields with a Sentinel function call	*/
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

// safe-characters [sp " ; < > [ ] ^ { | }]
const safeList = ['20', '22', '3B', '3C', '3E', '5B', '5D', '5E', '7B', '7C', '7D'];

/** encode control characters, then replace a safe-subset back to text-string */
function encode(val: string) {
	let enc = encodeURI(val);

	if (enc.includes('%')) {																	// if a encoded URI might be in string
		safeList.forEach(code => {
			const uri = '%' + code;
			const reg = new RegExp(uri, 'g');

			enc = enc.replace(reg, decodeURI(uri));
		})
	}

	return enc;
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
function fromSymbol(key: PropertyKey) {
	return stringize(isSymbol(key)														// @@(name) for global, @(name) for local symbols
		? `${isSymbolFor(key) ? '@' : ''}@(${key.description ?? ''})`
		: key)
}

const symKey = /^@(@)?\(([^\)]*)\)$/;												// pattern to match a stringify'd Symbol
/** reconstruct a Symbol */
function toSymbol(value: PropertyKey) {
	const [pat, keyFor, desc] = value.toString().match(symKey) || [null, void 0, void 0];

	switch (true) {
		case isSymbol(value):																		// already a Symbol
		case isNullish(pat):																		// incorrect encoded Symbol
		case isDefined(keyFor) && isUndefined(desc):						// incorrect encoded global Symbol
			return value;

		case isDefined(keyFor) && isDefined(desc):							// global Symbol
			return Symbol.for(desc);

		case isUndefined(keyFor):																// local Symbol
		default:
			return Symbol(desc);
	}
}

/**
 * For items which are not currently serializable via standard JSON.stringify (Undefined, BigInt, Set, Map, Symbol, etc.)  
 * this creates a stringified, single-key Object to represent the value; for example  '{ "BigInt": 123 }'  
 * I would have preferred to use something more robust than strings for the keys  (considered a Symbol? but that doesn't fit in well with serializing to a String),  
 * as this single-key Object is open to abuse.  But the risk is acceptable within the scope of small projects.  
 * 
 * Drawbacks:  
 * no support Function / WeakMap / WeakSet / WeakRef  
 * limited support for user-defined Classes (must be specifically coded)
 */

/**
 * serialize Objects for string-safe stashing in WebStorage, Cache, etc  
 * uses JSON.stringify where available, else returns stringified single-key Object '{[type]: value}'  
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
	const one = curry(oneKey)(arg.type);											// curry the oneKey() function

	switch (arg.type) {
		case 'String':
			if (!recurse) {
				recurse = arg.value === 'true'											// these words are stringified to preserve their type when objectified
					|| arg.value === 'false'
					|| arg.value === 'null'
					|| isNumeric(arg.value)
			}

			return recurse
				? JSON.stringify(encode(arg.value))									// encode string for safe-storage
				: encode(arg.value);																// dont JSON.stringify a top-level string

		case 'Boolean':
		case 'Null':
		case 'Number':
			return JSON.stringify(arg.value);											// JSON.stringify will correctly handle these

		case 'Void':
		case 'Undefined':
			return one(JSON.stringify('void'));										// preserve 'undefined' values		

		case 'BigInt':
			return one(arg.value.toString());											// even though BigInt has a toString method, it is not supported in JSON.stringify

		case 'Object':
			const obj = ownEntries(arg.value)
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => `${fromSymbol(key)}: ${stringize(val)}`)
				.join(',')
			return `{${obj}}`;

		case 'Array':
			const arr = arg.value
				.filter(val => isStringable(val))
				.map(val => stringize(val))
				.join(',')
			return `[${arr}]`;

		case 'Map':
			const map = Array.from(arg.value.entries())
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => `[${stringize(key)}, ${stringize(val)}]`)
				.join(',')
			return one(`[${map}]`);

		case 'Set':
			const set = Array.from(arg.value.values())
				.filter(val => isStringable(val))
				.map(val => stringize(val))
				.join(',')
			return one(`[${set}]`);

		case 'Symbol':
			return one(fromSymbol(arg.value));

		case 'RegExp':
			return one(stringize({ source: arg.value.source, flags: arg.value.flags }));

		case 'Class':																						// TODO
		default:
			switch (true) {
				case !isStringable(arg.value):											// Object is not stringify-able
					return void 0 as unknown as string;

				case isFunction(arg.value.toJSON):									// Object has its own toJSON method
					return one(stringize(arg.value.toJSON(), /** replacer */));

				case isFunction(arg.value.toString):								// Object has its own toString method
					return one(JSON.stringify(arg.value.toString()));

				case isFunction(arg.value.valueOf):									// Object has its own valueOf method		
					return one(JSON.stringify(arg.value.valueOf()));

				default:																						// else standard stringify
					return one(JSON.stringify(arg.value, replacer));
			}
	}
}

/** rebuild an Object from its stringified representation */
export function objectify<T>(str: any, sentinel?: Function): T {
	if (!isString(str))
		return str;																							// skip parsing

	try {
		const parse = JSON.parse(str, reviver()) as T;					// catch if cannot parse

		switch (true) {
			case str.startsWith('{') && str.endsWith('}'):				// looks like Object
			case str.startsWith('[') && str.endsWith(']'):				// looks like Array
				return traverse(parse, sentinel);										// recurse into object

			default:
				return parse;
		}
	} catch (error) {
		if (str.startsWith('"') && str.endsWith('"')) {
			console.warn(`objectify.parse: -> ${str}, ${(error as Error).message}`);
			return str as T;
		}
		else return objectify('"' + str + '"', sentinel);				// have another try, quoted
	}
}

/** Recurse into Object / Array, looking for special single-key Objects */
function traverse(obj: any, sentinel?: Function): any {
	if (isObject(obj)) {
		return typeify(ownEntries(obj)
			.reduce((acc, [key, val]) =>
				Object.assign(acc, { [toSymbol(key)]: typeify(traverse(val, sentinel)) }),
				{}),
			sentinel
		)
	}

	if (isArray(obj)) {
		return ownValues(obj)
			.map(val => typeify(traverse(val, sentinel)))
	}

	return obj;
}

/** Rebuild an Object from its single-key representation */
function typeify(json: Record<string, any>, sentinel?: Function) {
	if (!isObject(json) || ownKeys(json).length !== 1)
		return json;																						// only JSON Objects, with a single key:value pair

	const { type, value } = ownEntries(json)
		.reduce((acc, [type, value]) => Object.assign(acc, { type, value }), {} as { type: Types, value: any })

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
		case 'Empty':
		case 'Void':
			return sentinel?.();																	// run Sentinel function
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

		case 'Tempo':
			return new Tempo(value);
		case 'Enumify':
			return enumify(value);

		default:
			return json;																					// return JSON Object
	}
}
