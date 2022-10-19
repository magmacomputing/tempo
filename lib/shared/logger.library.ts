import { sprintf } from '@module/shared/string.library';
import { isString } from '@module/shared/type.library';

/** setup a reference for debug(), bind the current component name */
export const dbg = (self: any, component?: string) =>
	lprintf.bind(self, component || self.constructor.name);

/** console.log() formatter */
export const lprintf = (name: string = '', fmt?: any, ...msg: any[]) => {
	const [type, log] = fprintf(fmt, ...msg);
	const sep = isString(fmt) && (fmt.includes(':') || msg.length === 0)
		? '.'
		: ': '
	const info = `${name}${sep}${log}`;

	console[type](info);
	return info;
}

enum Level {
	Debug,
	Verbose,
	Info,
	Warn,
	Error,
	Silent,
}
type method = Extract<keyof Console, 'log' | 'info' | 'debug' | 'warn' | 'error'>;

/** break a fmt/msg into a Console[type] and 'message' */
const fprintf = (fmt?: any, ...msg: any[]) => {
	let type = 'log';

	if (isString(fmt)) {
		const keys = ['log', 'info', 'debug', 'warn', 'error'] as method[];
		const match = fmt.match(/(\w*;)/i) ?? [];
		const part = match[1];

		if (keys.map(out => out + ';').includes(part)) {
			type = part.slice(0, -1);
			fmt = fmt.substring(type.length + 1).trim();
		}
	}

	const message = sprintf(fmt, ...msg);

	return [type, message] as [method, string];
}