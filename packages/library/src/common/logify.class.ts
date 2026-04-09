import { Immutable } from '#library/class.library.js';
import { $Logify, markConfig } from '#library/symbol.library.js';
import { asType, isObject, isEmpty, type ValueOf } from '#library/type.library.js';

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
	#opts: Logify.Constructor = { [$Logify]: true };

	/**
	 * if {catch:true} then show a warning on the console and return  
	 * otherwise show an error on the console and re-throw the error
	 */
	#trap(method: Logify.Method, ...msg: any[]) {
		const config = (isObject(msg[0]) && (msg[0] as any)[$Logify] === true) ? msg.shift() : this.#opts;

		if (method === Method.Debug && !config.debug) return;

		const output = msg.map(m => {
			if (m instanceof Error) return m.message;
			if (isObject(m)) {
				try { return JSON.stringify(m); } catch { return '[Object]'; }
			}
			return String(m);
		}).filter(s => !isEmpty(s)).join(' ');

		if (!config.silent && !isEmpty(output))
			(console as any)[method](`${this.#name}: ${output}`);

		if (method === Method.Error && !config.catch) {
			const e = msg.find(m => m instanceof Error);
			const message = `${this.#name}: ${output}`;
			if (e) {
				e.message = message;
				throw e;
			}
			throw new Error(message);
		}
	}

	/** console.log */		log = (...msg: any[]) => this.#trap(Method.Log, ...msg);
	/** console.info */		info = (...msg: any[]) => this.#trap(Method.Info, ...msg);
	/** console.warn */		warn = (...msg: any[]) => this.#trap(Method.Warn, ...msg);
	/** console.debug */	debug = (...msg: any[]) => this.#trap(Method.Debug, ...msg);
	/** console.error */	error = (...msg: any[]) => this.#trap(Method.Error, ...msg);

	constructor(self?: Logify.Constructor | string, opts = {} as Logify.Constructor) {
		opts = { ...opts };																				// defensive copy of the options
		const arg = asType(self);
		this.#name = (arg.type === 'String')
			? arg.value
			: (self as any)?.constructor?.name
			?? 'Logify';

		if (arg.type === 'Object') {
			const cfg = { ...arg.value as object };
			markConfig(cfg);																			// auto-mark if it's a config object
			Object.assign(opts, cfg);
		}

		markConfig(opts);																				// auto-mark the options object

		this.#opts.debug = opts.debug ?? false;									// default debug to 'false'
		this.#opts.catch = opts.catch ?? false;									// default catch to 'false'
		this.#opts.silent = opts.silent ?? false;								// default silent to 'false'
	}
}

export namespace Logify {
	export type Method = ValueOf<typeof Method>

	export interface Constructor {
		debug?: boolean | undefined,
		catch?: boolean | undefined,
		silent?: boolean | undefined,
		[$Logify]?: boolean | undefined
	}
}