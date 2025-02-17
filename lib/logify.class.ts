const Level: Logify.Level = {
	Debug: 'debug',
	Log: 'log',
	Info: 'info',
	Warn: 'warn',
	Error: 'error',
} as const

export class Logify {
	console = false;

	log = this.#log.bind(this, Level.Log);
	info = this.#log.bind(this, Level.Info);
	warn = this.#log.bind(this, Level.Warn);
	debug = this.#log.bind(this, Level.Debug);
	error = this.#log.bind(this, Level.Error);

	#log(method: Logify.Method, ...msg: any[]) {

		if (this.console)
			console[method](...msg);
	}

	constructor(opts = {} as Logify.Constructor) {
		// this.console = console;
	}
}

export namespace Logify {
	export type Method = Extract<keyof Console, 'log' | 'info' | 'debug' | 'warn' | 'error'>;

	export type Level = { [Prop in Capitalize<Method>]: Method }

	export interface Constructor {
		debug?: boolean,
		catch?: boolean
	}
}