// import { Tempo } from '@module/shared/tempo.class';			// circular reference
import { asType, isEmpty, isFunction, isString } from '@module/shared/type.library';

/** YOU MUST REMOVE THIS LINE AFTER TEMPORAL REACHES STAGE-4 IN THE BROWSER */
import { Temporal } from '@js-temporal/polyfill';

/** make a deep-copy, using standard browser or JSON functions */
export const clone = <T>(obj: T) => {
	let copy = obj;																						// default to original object

	// try {
	// 	copy = structuredClone?.(obj);												// structuredClone is not available in 'node'
	// } catch (error) {
	try {
		copy = JSON.parse(JSON.stringify(obj));
	} catch (error) {
		console.warn('Could not serialize object: ', obj);
	}
	// }

	return copy;
}

type Copy = {
	/** deep-copy an Object	*/
	<T>(obj: T): T;
	/** deep-copy and replace \<undefined> field with a call to Sentinel */
	<T>(obj: T, sentinel: Function): T;
};
/** deep-copy and replace \<undefined> field with a Sentinel function */
export const copy: Copy = <T>(obj: T, sentinel?: Function) => {
	try {
		return objectify(stringify(obj), sentinel) as T;
	} catch (error) {
		console.warn('Could not serialize object: ', obj);
		return obj;
	}
}

const replacer = (key: string, val: any) => isEmpty(key) ? val : stringify(val);
const reviver = (sentinel?: Function) => (key: string, val: any) => isEmpty(key) ? val : objectify(val, sentinel);
const clean = (val: string) => val
	// .replace(/\"\['/g, '[')
	// .replace(/\]\"/g, ']')
	// .replace(/\"\{/g, '{')
	// .replace(/\}\"/g, '}')
	// .replace(/\=\\\"/g, '=\'')
	// .replace(/\;\\\"/g, ';\'')
	// .replace(/\\\"/g, '\"')
	.replaceAll('"[', '[')
	.replaceAll(']"', ']')
	.replaceAll('"{', '{')
	.replaceAll('}"', '}')
	.replaceAll('=\\"', "=\'")																// try to keep embedded quotes
	.replaceAll(';\\"', ";\'")																// around html inline attributes
	.replaceAll('\\"', '\"')

/** Serialize an object for stashing in Web Storage, Cache, etc */
export const stringify = (obj: any, prefix = true): string => {
	const arg = asType(obj);
	const val = prefix ? `${arg.type}:` : '';

	switch (arg.type) {
		case 'Object':
		case 'Array':
			return clean(JSON.stringify(arg.value, replacer));

		case 'String':											    								// return as-is
			return arg.value;

		case 'Number':
		case 'BigInt':
			return val + arg.value.toString();

		case 'Map':																							// special treatment
			return val + clean(JSON.stringify(Array.from(arg.value.entries()), replacer))

		case 'Set':																							// special treatment
			return val + clean(JSON.stringify(Array.from(arg.value.values()), replacer))

		case 'Date':																						// special treatment
			return val + arg.value.toISOString();

		// case 'Blob':                                            // TODO
		// 	return val + arg.value.size;

		case 'Undefined':
		case 'Null':
		case 'Symbol':                                          // TODO
			return val;

		case 'Function':																				// TODO
			return '{}';

		default:
			switch (true) {
				case isFunction(arg.value.toJSON):									// Object has its own toJSON method
					return val + stringify(arg.value.toJSON());
				case isFunction(arg.value.toString):								// Object has its own toString method
					return val + arg.value.toString();
				default:
					return val + JSON.stringify(arg.value);						// else standard stringify
			}
	}
}

/** Decode a string to rebuild the original Object-type */
export const objectify = <T extends any>(obj: any, sentinel?: Function): T => {
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
