import { Immutable } from '#library/class.library.js';
import { asType, isObject, type ValueOf } from '#library/type.library.js';

const Method = {
	Log: 'log',
	Info: 'info',
	Warn: 'warn',
	Debug: 'debug',
	Error: 'error',
} as const

/**
 * provide standard logging methods to the console for a class
 */
@Immutable
export class Logify {
	#name: string;
	#opts: Logify.Constructor = {};

	#log(method: Logify.Method, ...msg: any[]) {
		const config = (isObject(msg[0]) && ('silent' in msg[0] || 'debug' in msg[0])) ? msg.shift() : this.#opts;

		if (!config.silent && (config.debug || method === Method.Warn || method === Method.Error))
			console[method](this.#name, ...msg);
	}

	/**
	 * if {catch:true} then show a warning on the console and return  
	 * otherwise show an error on the console and re-throw the error
	 */
	catch(...msg: any[]) {
		const config = (isObject(msg[0]) && ('catch' in msg[0] || 'silent' in msg[0])) ? msg.shift() : this.#opts;
		const e = msg.find(m => m instanceof Error);

		if (config.catch) {
			this.#log(Method.Warn, config, ...msg);               // show a warning on the console
			return;                                               // safe-return
		}

		this.#log(Method.Error, config, ...msg);                // only show an error on the console if NOT silent
		const errorText = msg.map(m => m instanceof Error ? m.message : (isObject(m) ? JSON.stringify(m) : String(m))).join(' ');
		const message = `${this.#name}${errorText}`;

		if (e) {
			e.message = message;
			throw e;                                              // preserve type, stack and custom fields
		}

		throw new Error(message);                               // catch will be loud or silent, based on #catch config
	}

	/** console.log */																				log = (...msg: any[]) => this.#log(Method.Log, ...msg);
	/** console.info */																				info = (...msg: any[]) => this.#log(Method.Info, ...msg);
	/** console.warn */																				warn = (...msg: any[]) => this.#log(Method.Warn, ...msg);
	/** console.debug */																			debug = (...msg: any[]) => this.#log(Method.Debug, ...msg);
	/** console.error */																			error = (...msg: any[]) => this.#log(Method.Error, ...msg);

	constructor(self?: Logify.Constructor | string, opts = {} as Logify.Constructor) {
		const arg = asType(self);
		this.#name = (arg.type === 'String')
			? arg.value
			: (self as any)?.constructor?.name?.concat(': ')
			?? 'Logify: ';

		if (arg.type === 'Object')
			Object.assign(opts, arg.value);

		this.#opts.debug = opts.debug ?? false;               	// default debug to 'false'
		this.#opts.catch = opts.catch ?? false;               	// default catch to 'false'
		this.#opts.silent = opts.silent ?? false;             	// default silent to 'false'
	}
}

export namespace Logify {
	export type Method = ValueOf<typeof Method>

	export interface Constructor {
		debug?: boolean | undefined,
		catch?: boolean | undefined,
		silent?: boolean | undefined
	}
}