import { sprintf } from '#core/shared/string.library.js';
import { isString, type ValueOf } from '#core/shared/type.library.js';
import { ownValues } from './reflection.library.ts';

/** setup a reference for debug(), bind the current component name */
export const dbg = (self: any, component?: string) =>
	lprintf.bind(self, component || self.constructor.name);

const Level = {
	Log: 'log',
	Debug: 'debug',
	Info: 'info',
	Warn: 'warn',
	Error: 'error',
} as const
type Level = ValueOf<typeof Level>

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

export type Logger = Extract<keyof Console, ValueOf<typeof Level>>;

/** break a fmt/msg into a Console[method] and 'message' */
const fprintf = (fmt?: any, ...msg: any[]) => {
	let type = 'log';

	if (isString(fmt)) {
		const keys = ownValues(Level);
		const match = fmt.match(/(\w*;)/i) ?? [];
		const part = match[1];

		if (keys.map(out => out + ';').includes(part)) {
			type = part.slice(0, -1);
			fmt = fmt.substring(type.length + 1).trim();
		}
	}

	const message = sprintf(fmt, ...msg);

	return message;
}