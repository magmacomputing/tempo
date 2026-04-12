import '#library/temporal.polyfill.js';
import { isString, isEmpty, isUndefined, isDefined, isTemporal } from '#library/type.library.js';
import { ownKeys, ownEntries } from '#library/reflection.library.js';
import { pad, singular } from '#library/string.library.js';
import { Match } from '../../tempo.default.js';
import enums from '../../tempo.enum.js';
import * as t from '../../tempo.type.js';

/**
 * Internal Lexer helpers for the Tempo parsing engine.  
 * Extracted from Tempo class to reduce core file size.
 */

namespace Lexer {
	export type GroupWkd = { wkd?: t.WEEKDAY; mod?: t.Modifier; nbr?: string; sfx?: t.Relative; afx?: t.Relative } & { [K in 'hh' | 'mi' | 'ss' | 'ms' | 'us' | 'ns' | 'ff' | 'mer']?: string };
	export type GroupDate = { mod?: t.Modifier; nbr?: string; afx?: t.Relative; unt?: string; yy?: string; mm?: string; dd?: string; }
	export type GroupModifier = { mod?: t.Modifier | t.Relative, adjust: number, offset: number, period: number }
}

/** return a new object, with only numeric values */
function num(groups: Record<string, string | number>) {
	return ownEntries(groups)
		.reduce((acc: Record<string, number>, [key, val]: [string, any]) => {
			const low = isString(val) ? val.toLowerCase() : '';
			if (Number.isFinite(Number(val)))
				acc[key] = Number(val);
			else if (low in enums.NUMBER)
				acc[key] = enums.NUMBER[low as t.Number];

			return acc;
		}, {} as Record<string, number>);
}

/** conform weekday/month names using prefix matching */
export function prefix<T extends t.WEEKDAY | t.MONTH>(str: any): T {
	let value = str;
	if (isString(value)) {
		const low = value.toLowerCase();
		const match = Object.keys(enums.NUMBER).find(key => key.startsWith(low));
		if (match) return enums.NUMBER[match as t.Number] as any;

		// search in weekdays and months
		for (const dict of [enums.WEEKDAY, enums.MONTH]) {
			const found = dict.keys().find((key: string) => low.startsWith(key.toLowerCase()));
			if (found) return found as T;
		}
	}
	return value as T;
}

/** resolve a relative modifier (+, -, next, ago, etc) */
function parseModifier({ mod, adjust, offset, period }: Lexer.GroupModifier) {
	adjust = Math.abs(adjust);
	switch (mod) {
		case void 0:
		case '=':
		case 'this':
			return 0
		case '+':
		case 'next':
			return adjust;
		case '-':
		case 'prev':
		case 'last':
			return -adjust;
		case '<':
		case 'ago':
			return (period <= offset) ? -adjust : -(adjust - 1)
		case '<=':
		case '-=':
			return (period < offset) ? -adjust : -(adjust - 1)
		case '>':
		case 'hence':
		case 'from now':
			return (period >= offset) ? adjust : (adjust - 1)
		case '>=':
		case '+=':
			return (period > offset) ? adjust : (adjust - 1)
		default:
			return 0;
	}
}

/**
 * if named-group 'wkd' detected (with optional 'mod', 'nbr', 'sfx' or time-units), then calc relative weekday offset  
 * | Example | Result | Note |
 * | :--- | :---- | :---- |
 * | `Wed` | Wed this week | might be earlier or later or equal to current day |
 * | `-Wed` | Wed last week | same as new Tempo('Wed').add({ weeks: -1 }) |
 * | `+Wed` | Wed next week | same as new Tempo('Wed').add({ weeks:  1 }) |
 * | `-3Wed` | Wed three weeks ago | same as new Tempo('Wed').add({ weeks: -3 }) |
 * | `<Wed` | Wed prior to today | might be current or previous week |
 * | `<=Wed` | Wed prior to tomorrow | might be current or previous week |
 * | `Wed noon` | Wed this week at 12:00pm | even though time-periods may be present, ignore them in this method |
 * 
 * @returns  ZonedDateTime with computed date-offset  
 */
export function parseWeekday(groups: t.Groups, dateTime: Temporal.ZonedDateTime, logger: any, config: any): Temporal.ZonedDateTime {
	const { wkd, mod, nbr = '1', sfx, afx, ...rest } = groups as Lexer.GroupWkd;
	if (isUndefined(wkd)) return dateTime;

	const time = ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'] as const;
	if (!ownKeys(rest).every(key => (time as ReadonlyArray<string>).includes(key as string)))
		return dateTime;

	if (!isEmpty(mod) && !isEmpty(sfx)) {
		logger.warn(config, `Cannot provide both a modifier '${mod}' and suffix '${sfx}'`);
		return dateTime;
	}

	const weekday = prefix<t.WEEKDAY>(wkd);
	const { nbr: adjust = 1 } = num({ nbr });
	const offset = enums.WEEKDAY.keys().findIndex((el: t.WEEKDAY) => el === weekday);

	const days = offset - dateTime.dayOfWeek
		+ (parseModifier({ mod: mod ?? sfx ?? afx, adjust, offset, period: dateTime.dayOfWeek }) * dateTime.daysInWeek);

	delete groups["wkd"];
	delete groups["mod"];
	delete groups["nbr"];
	delete groups["sfx"];

	return dateTime.add({ days });
}

/** resolve a date pattern match */
export function parseDate(groups: t.Groups, dateTime: Temporal.ZonedDateTime, logger: any, config: any, pivot: number = 75): Temporal.ZonedDateTime {
	const { mod, nbr = '1', afx, unt, yy, mm, dd } = groups as Lexer.GroupDate;
	if (isEmpty(yy) && isEmpty(mm) && isEmpty(dd) && isUndefined(unt))
		return dateTime;

	if (!isEmpty(mod) && !isEmpty(afx)) {
		logger.warn(config, `Cannot provide both a modifier '${mod}' and suffix '${afx}'`);
		return dateTime;
	}

	let { year, month, day } = num({
		year: yy ?? dateTime.year,
		month: mm ?? dateTime.month,
		day: dd ?? dateTime.day,
	} as any);

	if (unt) {
		const { nbr: adjust = 1 } = num({ nbr });
		const direction = (mod === '<' || mod === '-' || afx === 'ago') ? -1 : 1;
		const plural = `${singular(unt)}s`;
		dateTime = dateTime.add({ [plural]: adjust * direction } as any);

		delete groups["unt"];
		delete groups["nbr"];
		delete groups["afx"];
		delete groups["mod"];

		return dateTime;
	}

	if (year.toString().match(Match.twoDigit)) {
		const pivotYear = dateTime.subtract({ years: pivot }).year % 100;
		const century = Math.trunc(dateTime.year / 100);
		year += (century - Number(year >= pivotYear)) * 100;
	}

	const { nbr: adjust = 1 } = num({ nbr });
	const offset = Number(pad(month) + '.' + pad(day));
	const period = Number(pad(dateTime.month) + '.' + pad(dateTime.day + 1));

	year += parseModifier({ mod: mod ?? afx, adjust, offset, period });
	Object.assign(groups, { yy: year, mm: month, dd: day });

	delete groups["mod"];
	delete groups["nbr"];
	delete groups["afx"];

	return Temporal.PlainDate.from({ year, month, day }, { overflow: 'constrain' })
		.toZonedDateTime(dateTime.timeZoneId)
		.withPlainTime(dateTime.toPlainTime());
}

/** resolve a time pattern match */
export function parseTime(groups: t.Groups = {}, dateTime: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
	if (isUndefined(groups["hh"])) return dateTime;

	let { hh = 0, mi = 0, ss = 0, ms = 0, us = 0, ns = 0 } = num(groups);
	if (hh >= 24) {
		dateTime = dateTime.add({ days: Math.trunc(hh / 24) });
		hh %= 24;
	}

	if (isDefined(groups["ff"])) {
		const ff = groups["ff"].substring(0, 9).padEnd(9, '0');
		ms = +ff.substring(0, 3);
		us = +ff.substring(3, 6);
		ns = +ff.substring(6, 9);
	}

	if (groups["mer"]?.toLowerCase() === 'pm' && hh < 12 && (hh + mi + ss + ms + us + ns) > 0)
		hh += 12;
	if (groups["mer"]?.toLowerCase() === 'am' && hh >= 12)
		hh -= 12;

	return dateTime.withPlainTime({ hour: hh, minute: mi, second: ss, millisecond: ms, microsecond: us, nanosecond: ns });
}

/**
 * apply a timezone or calendar bracket to the current ZonedDateTime  
 * normalization is applied to ensure 'Z' is treated as 'UTC'
 */
export function parseZone(groups: t.Groups, dateTime: Temporal.ZonedDateTime, config?: any): Temporal.ZonedDateTime {
	if (!isTemporal(dateTime)) return dateTime;

	const tzd = groups["tzd"]?.replace(Match.zed, 'UTC');
	const brk = groups["brk"]?.replace(Match.zed, 'UTC');
	let zone: string | undefined = brk || tzd;

	let cal = groups["cal"];
	if (zone?.startsWith('u-ca=')) {
		cal = zone;
		zone = tzd;
	}

	const zdt = dateTime as any;
	if (zone && zone !== zdt.timeZoneId) {
		if (config) config.timeZone = zone;
		dateTime = zdt.toPlainDateTime().toZonedDateTime(zone);
	}
	if (cal && cal !== (dateTime as any).calendarId) {
		const calendar = cal.startsWith('u-ca=') ? cal.substring(5) : cal;
		if (config) config.calendar = calendar;
		dateTime = dateTime.withCalendar(calendar);
	}

	delete groups["brk"];
	delete groups["cal"];
	delete groups["tzd"];

	return dateTime;
}

// /** match an {event} string against a date pattern */
// function parseEvent(evt: string): t.Groups {
// 	const groups: t.Groups = {}
// 	const pats = this.#local.parse.isMonthDay							// first find out if we have a US-format timeZone
// 		? ['dtm', 'mdy', 'dmy', 'ymd', 'off', 'rel'] as const		// try all layouts to allow composite resolutions
// 		: ['dtm', 'dmy', 'mdy', 'ymd', 'off', 'rel'] as const

// 	for (const pat of pats) {
// 		const reg = this.#getPattern(pat);

// 		if (isDefined(reg)) {
// 			const match = this.#parseMatch(reg, evt);

// 			if (!isEmpty(match)) {
// 				this.#result({ type: 'Event', value: evt, match: pat, groups: cleanify(match) });
// 				Object.assign(groups, match);
// 			}
// 		}

// 		if (!isEmpty(groups)) break;													// return on the first matched pattern
// 	}

// 	return groups;																					// overlay the match date-components
// }

// /** match a {period} string against the time pattern */
// #parsePeriod(per: string): Tempo.Groups {
// 	const groups: Tempo.Groups = {}
// 	const pats = ['tm', 'dtm', 'ymd', 'dmy', 'mdy', 'rel'] as const;

// 	for (const pat of pats) {
// 		const reg = this.#getPattern(pat);
// 		if (isDefined(reg)) {
// 			const match = this.#parseMatch(reg, per);
// 			if (!isEmpty(match)) {
// 				this.#result({ type: 'Period', value: per, match: pat, groups: cleanify(match) });
// 				Object.assign(groups, match);
// 				break;
// 			}
// 		}
// 	}

// 	return groups;
// }


// /** lookup the RegExp for a given pattern name */
// #getPattern(pat: string) {
// 	const reg = this.#local.parse.pattern.get(Tempo.getSymbol(pat));

// 	if (isUndefined(reg))
// 		Tempo.#dbg.error(this.#local.config, `Cannot find pattern: "${pat}"`);

// 	return reg;
// }
