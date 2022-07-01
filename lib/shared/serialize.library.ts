// import { Tempo } from '@module/shared/tempo.class';					// circular reference ??
// import { getTempo } from '@module/shared/tempo.class';
import { asType, isEmpty, isFunction, isString } from '@module/shared/type.library';

/** YOU MUST REMOVE THIS LINE AFTER TEMPORAL REACHES STAGE-4 IN THE BROWSER */
import { Temporal } from '@js-temporal/polyfill';

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
export function clonify<T>(obj: T): T;
/** deep-copy and replace \<undefined> field with a call to Sentinel */
export function clonify<T>(obj: T, sentinel: Function): T;
/** deep-copy and replace \<undefined> field with a Sentinel function */
export function clonify<T>(obj: T, sentinel?: Function): T {
	try {
		return objectify1(stringify(obj), sentinel) as T;
	} catch (error: any) {
		console.warn('Could not clonify object: ', obj);
		console.warn('stack: ', error.stack);
		return obj;
	}
}

function replacer1(key: string, obj: any): any { return isEmpty(key) ? obj : stringify1(obj) };
function reviver1(sentinel?: Function): any { return (key: string, str: any) => isEmpty(key) ? str : objectify1(str, sentinel) };
function clean(obj: string) {
	return obj
	// .replaceAll('"[', '[')
	// .replaceAll(']"', ']')
	// .replaceAll('"{', '{')
	// .replaceAll('}"', '}')
	// .replaceAll('\\"', '\"')
	// .replaceAll(quoteArray, (pat: string) => pat.slice(1, -1))
	// .replaceAll(quoteObject, (pat: string) => pat.slice(1, -1))
	// .replaceAll(htmlAttrib, (pat: string) => pat.replaceAll(`"`, `'`))// html inline attributes
}
function replacer(key: string, obj: any): string {
	const arg = asType(obj);
	const prefix = arg.type + ':';

	switch (arg.type) {
		case 'String':
		case 'Number':
			return arg.value.toString();

		case 'Object':
		case 'Array':
			return JSON.stringify(arg.value, replacer);

		case 'Undefined':
			return prefix;

		case 'Map':
		case 'Record':																					// TODO
			return prefix + JSON.stringify(Array.from(arg.value.entries()), replacer);

		case 'Set':
		case 'Tuple':																						// TODO
			return prefix + JSON.stringify(Array.from(arg.value.values()), replacer);

		default:
			switch (true) {
				case isFunction(arg.value.toJSON):									// Object has its own toJSON method
					return prefix + JSON.stringify(arg.value.toJSON(), replacer);
				case isFunction(arg.value.toString):								// Object has its own toString method
					return prefix + arg.value.toString();
				default:
					return prefix + JSON.stringify(arg.value);				// else standard stringify
			}
	}
}

/** Serialize an object for safe stashing in WebStorage, Cache, etc */
export function stringify(obj: any) {
	return JSON.stringify(obj, replacer)
		.replaceAll(/\\/g, '')
		.replace(/^".*:.*"$/, str => str.slice(1, -1))
}
export function stringify1(obj: any, ...rest: any[]): string {
	const arg = asType(obj);
	const prefix = `${arg.type}:`;

	switch (arg.type) {
		case 'Object':
		case 'Array':
			return clean(JSON.stringify(arg.value, replacer));

		case 'String':											    								// return as-is
			return arg.value;

		case 'Number':
			return arg.value as unknown as string;
		// return !rest.length
		// 	? prefix + arg.value.toString()												// top-level stringified
		// 	: arg.value as unknown as string;										// return as-is

		case 'BigInt':
			return prefix + arg.value.toString();

		case 'Map':																							// special treatment
			return prefix + clean(JSON.stringify(Array.from(arg.value.entries()), replacer))

		case 'Set':																							// special treatment
			return prefix + clean(JSON.stringify(Array.from(arg.value.values()), replacer))

		case 'Date':																						// special treatment
			return prefix + arg.value.toISOString();

		case 'Undefined':
		case 'Null':
		case 'Symbol':                                          // TODO
			return prefix;

		case 'Function':																				// TODO
			return '{}';

		case 'Record':																					// TODO
			return prefix + clean(JSON.stringify(Object(arg.value), replacer));

		case 'Tuple':
			return prefix + clean(JSON.stringify(Array.from(arg.value), replacer));

		default:
			switch (true) {
				case isFunction(arg.value.toJSON):									// Object has its own toJSON method
					return prefix + stringify(arg.value.toJSON());
				case isFunction(arg.value.toString):								// Object has its own toString method
					return prefix + arg.value.toString();
				default:
					return prefix + JSON.stringify(arg.value);					// else standard stringify
			}
	}
}

/** Decode a string to rebuild the original Object-type */
export function objectify<T>(obj: any, sentinel?: Function): T {
	if (!isString(obj))
		return obj as T;
	const str = obj.trim();				                						// easier to work with trimmed string
	const segment = str.substring(str.indexOf(':') + 1);			// qualified-type

	switch (true) {
		default:
			return obj as T;
	}
}
export function objectify1<T extends any>(obj: any, sentinel?: Function): T {
	if (!isString(obj))
		return obj as T;
	const str = obj.trim();				                						// easier to work with trimmed string
	const segment = str.substring(str.indexOf(':') + 1);			// qualified-type

	switch (true) {
		case str.startsWith('{') && str.endsWith('}'):
		case str.startsWith('[') && str.endsWith(']'):
			return JSON.parse(str, reviver1(sentinel));

		case str.startsWith('Object:{"') && str.endsWith('}'):
		case str.startsWith('Array:[') && str.endsWith(']'):
			return JSON.parse(segment, reviver1(sentinel)) as T;

		case str.startsWith('Number:'):
			return Number(segment) as T;

		case str.startsWith('Null:'):
			return null as T;

		case str.startsWith('Undefined:'):
		case str.startsWith('Void:'):
			return sentinel?.() as T;

		case str.startsWith('Map:[[') && str.endsWith(']]'):
		case str === 'Map:[]':
			return new Map(JSON.parse(segment, reviver1(sentinel))) as T;

		case str.startsWith('Set:[') && str.endsWith(']'):
			return new Set(JSON.parse(segment, reviver1(sentinel))) as T;

		case str.startsWith('Date:'):
			return new Date(segment) as T;

		case str.startsWith('BigInt:'):
			return BigInt(segment) as T;

		case str.startsWith('Boolean:'):
			return (segment === 'true') as T;

		case str.startsWith('Record:'):
			// return Record(segment) as T;												// TODO
			return JSON.parse(segment, reviver1(sentinel)) as T;

		case str.startsWith('Tuple:'):
			// return Tuple.from(segment) as T;										// TODO
			return JSON.parse(segment, reviver1(sentinel)) as T;

		// case str.startsWith('Tempo:'):
		// 	return Tempo.from(segment) as T;

		case str.startsWith('Temporal.'):												// we don't expect a Temporal.Now object
			const api = str.split('.')[1].split(':')[0] as Exclude<keyof typeof Temporal, 'Now'>;
			return Temporal[api].from(segment) as T;

		// case str.startsWith('Function:'):
		// return new Function();																// TODO

		default:
			return obj as T;
	}
}
