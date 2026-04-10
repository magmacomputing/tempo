import { isString, isObject, isDefined, isUndefined } from '#library/type.library.js';
import { singular } from '#library/string.library.js';
import { getAccessors } from '#library/reflection.library.js';
import { ifDefined } from '#library/object.library.js';
import { getRelativeTime } from '#library/international.library.js';

import { defineInterpreterModule } from '../plugin.util.js';
import enums from '../../tempo.enum.js';
import type { Tempo } from '../../tempo.class.js';

declare module '../../tempo.class.js' {
	interface Tempo {
		/** time duration until (with unit, returns number) */	until(until: Tempo.Until, opts?: Tempo.Options): number;
		/** time duration until another date-time (with unit) */until(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, until: Tempo.Until): number;
		/** time duration until (returns Duration) */						until(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): Tempo.Duration;
		/** time duration until another date-time */						until(optsOrDate?: Tempo.DateTime | Tempo.Until | Tempo.Options, optsOrUntil?: Tempo.Options | Tempo.Until): number | Tempo.Duration;

		/** time elapsed since (with unit) */										since(until: Tempo.Until, opts?: Tempo.Options): string;
		/** time elapsed since another date-time (with unit) */	since(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, until: Tempo.Until): string;
		/** time elapsed since another date-time (w'out unit) */since(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): string;
		/** time elapsed since another date-time */							since(optsOrDate?: any, optsOrUntil?: any): string;
	}
}

/**
 * Internal implementation of Tempo.until and Tempo.since  
 * (moved out of tempo.class.ts to reduce core bundle size)
 */
function duration(this: Tempo, type: 'until' | 'since', arg?: any, until?: any) {
	const since = type === 'since';
	let value, opts: any = {}, unit: any;

	switch (true) {
		case isString(arg) && enums.ELEMENT.values().includes(singular(arg)):
			unit = arg;
			({ value, ...opts } = until || {});
			break;
		case isString(arg):
			value = arg;
			if (isObject(until))
				({ unit, ...opts } = until as any)
			else unit = until;
			break;
		case isObject(arg) && isString(until):
			unit = until;
			({ value, ...opts } = arg as any);
			break;
		case isObject(arg) && isObject(until):
			({ value, unit, ...opts } = Object.assign({}, arg, until) as any);
			break;
		case isString(until):
			unit = until;
			value = arg;
			break;
		case isObject(until):
			unit = (until as any).unit;
			value = arg;
			break;
		case isObject(arg) && isDefined((arg as any).unit):
			({ unit, value, ...opts } = arg as any);
			break;
		default:
			value = arg;
	}

	const selfZdt = this.toDateTime();
	const offset = new (this.constructor as any)(value, { ...opts, mode: enums.MODE.Strict });
	const offsetZdt = offset.toDateTime();

	const diffZone = selfZdt.timeZoneId !== offsetZdt.timeZoneId;
	const dur = selfZdt.until(offsetZdt.withCalendar(selfZdt.calendarId), {
		largestUnit: diffZone ? 'hours' : (unit ?? 'years')
	});

	if (isDefined(unit))
		unit = `${singular(unit)}s`;

	if (isUndefined(unit) || since) {
		const res = getAccessors(dur)
			.reduce((acc, d) => Object.assign(acc, ifDefined({ [d]: (dur as any)[d] })),
				{ iso: dur.toString(), unit } as Record<string, any>);

		if (!since) return res;

		// --- since logic ---
		const date = [dur.years, dur.months, dur.days] as const;
		const time = [dur.hours, dur.minutes, dur.seconds] as const;
		const fraction = [dur.milliseconds, dur.microseconds, dur.nanoseconds]
			.map(Math.abs)
			.map(nbr => nbr.toString().padStart(3, '0'))
			.join('')

		const locale = (this as any).config['locale'];
		const style = 'narrow';

		switch (res.unit) {
			case 'years': return getRelativeTime(date[0], res.unit, locale, style);
			case 'months': return getRelativeTime(date[1], res.unit, locale, style);
			case 'weeks': return getRelativeTime(res.weeks, res.unit, locale, style)
			case 'days': return getRelativeTime(date[2], res.unit, locale, style);
			case 'hours': return getRelativeTime(time[0], res.unit, locale, style);
			case 'minutes': return getRelativeTime(time[1], res.unit, locale, style);
			case 'seconds': return getRelativeTime(time[2], res.unit, locale, style);
			case 'milliseconds':
			case 'microseconds':
			case 'nanoseconds':
				return `${fraction}`;
			default:
				return dur.toString();
		}
	}

	return dur.total({ relativeTo: selfZdt, unit });
}

/**
 * Functional Module to attach duration methods to Tempo.
 */
// @ts-ignore
export const DurationModule: Tempo.Module = defineInterpreterModule('duration', duration);
