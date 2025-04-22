import { sprintf } from '#core/shared/string.library.js';

const Level = {
	Debug: 'debug',
	Log: 'log',
	Info: 'info',
	Warn: 'warn',
	Error: 'error',
} as const

export class Logify {
	#name;
	opts: Logify.Constructor = {};

	#log(method: Logify.Method, ...msg: any[]) {
		if (this.opts.debug)
			console[method](this.#name, ...msg);
	}

	catch(...msg: any[]) {
		if (this.opts.catch) {
			this.warn(...msg);																		// show a warning on the console.log
			return;																								// safe-return
		}

		this.error(...msg);																			// this goes to the console.log
		throw new Error(`${this.#name}${msg}`);									// this goes back to the caller
	}

	log = this.#log.bind(this, Level.Log);
	info = this.#log.bind(this, Level.Info);
	warn = this.#log.bind(this, Level.Warn);
	debug = this.#log.bind(this, Level.Debug);
	error = this.#log.bind(this, Level.Error);

	constructor(self?: any, opts = {} as Logify.Constructor) {
		this.#name = self?.constructor.name.concat(': ') ?? '';

		this.opts.debug = opts.debug ?? true;
		this.opts.catch = opts.catch ?? false;
	}
}

export namespace Logify {
	export type Method = Extract<keyof Console, 'log' | 'info' | 'debug' | 'warn' | 'error'>;

	export interface Constructor {
		debug?: boolean,
		catch?: boolean
	}
}