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

const quoteArray = /\"(\[.*?\])?\"/g;												// pattern to detect "[...]"
const quoteObject = /\"(\{.*?\})?\"/g;											// pattern to detect "{...}"

function replacer(key: string, obj: any): any { return isEmpty(key) ? obj : stringize(obj, true) };
function reviver(sentinel?: Function): any { return (key: string, str: any) => isEmpty(key) ? str : objectify(str, sentinel) };

/** Serialize an object for string-safe stashing in WebStorage, Cache, etc */
export function stringify(obj: any) {
	let str = stringize(obj)
		.replaceAll(/\\/g, '')																	// remove double-\
		.replaceAll(/\"\"/g, '"')																// replace double-" with single-"

	while (str.match(quoteArray))															// while match "[...]"
		str = str.replaceAll(quoteArray, '$1');									//	remove surrounding "
	while (str.match(quoteObject))														// while match "{...}"
		str = str.replaceAll(quoteObject, '$1');								// 	remove surrounding "
	return str;
}

/**
 * internal work-horse for stringify()  
 * obj:		any			is the object to serialize
 * level: boolean	indicates recursion (if true)
 */
function stringize(obj: any, ...level: any[]): string {
	const arg = asType(obj);
	const prefix = arg.type + ':';

	switch (arg.type) {
		case 'String':
			return JSON.stringify(arg.value)											// TODO:  why not convert embedded quotes to hidden-char?
				.replace('"', '\\"')																// TODO:  embedded double-quote needs to be prefixed with \\

		case 'Null':
		case 'Boolean':
			return level.length
				? prefix + JSON.stringify(arg.value)
				: JSON.stringify(arg.value)

		case 'Undefined':
			return level.length
				? prefix + 'void'
				: 'void'

		case 'Number':
			return level.length
				? arg.value as unknown as string
				: arg.value.toString()

		case 'BigInt':
			return level.length
				? prefix + arg.value.toString() + 'n'
				: arg.value.toString() + 'n'

		case 'Object':
		case 'Array':
			return JSON.stringify(arg.value, replacer)

		case 'Map':
		case 'Record':																					// TODO
			return prefix + JSON.stringify(Array.from(arg.value.entries()), replacer)

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

/** Decode a string to rebuild the original Object-type */
export function objectify<T>(obj: any, sentinel?: Function): T {
	if (!isString(obj))
		return obj as T;
	const str = obj.trim();				                						// easier to work with trimmed string
	const segment = str.substring(str.indexOf(':') + 1);			// qualified-type

	switch (true) {
		default:
			return obj as unknown as T;
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
			return JSON.parse(str, reviver(sentinel));

		case str.startsWith('Object:{"') && str.endsWith('}'):
		case str.startsWith('Array:[') && str.endsWith(']'):
			return JSON.parse(segment, reviver(sentinel)) as T;

		case str.startsWith('Number:'):
			return Number(segment) as T;

		case str.startsWith('Null:'):
			return null as T;

		case str.startsWith('Undefined:'):
		case str.startsWith('Void:'):
			return sentinel?.() as T;

		case str.startsWith('Map:[[') && str.endsWith(']]'):
		case str === 'Map:[]':
			return new Map(JSON.parse(segment, reviver(sentinel))) as T;

		case str.startsWith('Set:[') && str.endsWith(']'):
			return new Set(JSON.parse(segment, reviver(sentinel))) as T;

		case str.startsWith('Date:'):
			return new Date(segment) as T;

		case str.startsWith('BigInt:'):
			return BigInt(segment) as T;

		case str.startsWith('Boolean:'):
			return (segment === 'true') as T;

		case str.startsWith('Record:'):
			// return Record(segment) as T;												// TODO
			return JSON.parse(segment, reviver(sentinel)) as T;

		case str.startsWith('Tuple:'):
			// return Tuple.from(segment) as T;										// TODO
			return JSON.parse(segment, reviver(sentinel)) as T;

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
