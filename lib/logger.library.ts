import { sprintf } from '@core/shared/string.library.js';
import { isString } from '@core/shared/type.library.js';

/** setup a reference for debug(), bind the current component name */
export const dbg = (self: any, component?: string) =>
	lprintf.bind(self, component || self.constructor.name);

enum Level {
	Log = 'log',
	Debug = 'debug',
	Info = 'info',
	Warn = 'warn',
	Error = 'error',
}

/** console[method]() formatter */
export const lprintf = (method: Logger, name: string = '', fmt?: any, ...msg: any[]) => {
	const log = fprintf(fmt, ...msg);
	const sep = isString(fmt) && (fmt.includes(':') || msg.length === 0)
		? '.'
		: ': '
	const info = `${name}${sep}${log}`;

	console[method](info);
	return info;
}

class Logify {
	static log = Logify.#log.bind(this, Level.Log);
	static info = Logify.#log.bind(this, Level.Info);
	static warn = Logify.#log.bind(this, Level.Warn);
	static debug = Logify.#log.bind(this, Level.Debug);
	static error = Logify.#log.bind(this, Level.Error);
	static #log(method = Level.Info, ...msg: any[]) {
		console[method](...msg);
	}
}

export type Logger = Extract<keyof Console, 'log' | 'info' | 'debug' | 'warn' | 'error'>;

/** break a fmt/msg into a Console[method] and 'message' */
const fprintf = (fmt?: any, ...msg: any[]) => {
	let type = 'log';

	if (isString(fmt)) {
		const keys = ['log', 'info', 'debug', 'warn', 'error'] as Logify[];
		const match = fmt.match(/(\w*;)/i) ?? [];
		const part = match[1];

		if (keys.map(out => out + ';').includes(part)) {
			type = part.slice(0, -1);
			fmt = fmt.substring(type.length + 1).trim();
		}
	}

	const message = sprintf(fmt, ...msg);

	return message as Logify;
}