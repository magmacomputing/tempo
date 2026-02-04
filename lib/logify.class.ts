import { Immutable } from '#core/shared/class.library.js';
import { asType, type ValueOf } from '#core/shared/type.library.js';

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
		if (this.#opts.debug)
			console[method](this.#name, ...msg);
	}

	/**
	 * if {catch:true} then show a warning on the console and return  
	 * otherwise show an error on the console and re-throw the error
	 */
	catch(...msg: any[]) {
		if (this.#opts.catch) {
			this.warn(...msg);																		// show a warning on the console
			return;																								// safe-return
		}

		this.error(...msg);																			// this goes to the console
		throw new Error(`${this.#name}${msg}`);									// this goes back to the caller
	}

	/** console.log */																				log = this.#log.bind(this, Method.Log);
	/** console.info */																				info = this.#log.bind(this, Method.Info);
	/** console.warn */																				warn = this.#log.bind(this, Method.Warn);
	/** console.debug */																			debug = this.#log.bind(this, Method.Debug);
	/** console.error */																			error = this.#log.bind(this, Method.Error);

	constructor(self?: Logify.Constructor | string, opts = {} as Logify.Constructor) {
		const arg = asType(self);
		switch (arg.type) {
			case 'String':
				this.#name = arg.value;
				break;
			// @ts-ignore
			case 'Object':
				Object.assign(opts, arg.value);
			default:
				this.#name = (self ?? this).constructor.name.concat(': ') ?? '';
		}

		this.#opts.debug = opts.debug ?? false;									// default debug to 'false'
		this.#opts.catch = opts.catch ?? false;									// default catch to 'false'								
	}
}

export namespace Logify {
	export type Method = ValueOf<typeof Method>

	export interface Constructor {
		debug?: boolean | undefined,
		catch?: boolean | undefined
	}
}