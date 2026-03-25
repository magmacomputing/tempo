import { $Target, $Extensible } from '#library/symbol.library.js';
import { enumify } from '#library/enumerate.library.js';
import { getProxy } from '#library/proxy.library.js';
import { clearCache } from '#library/function.library.js';
import type { Enum } from '#library/enumerate.library.js';
import type { OwnOf, KeyOf, ValueOf, LooseUnion, Mutable, Property } from '#library/type.library.js';

/**
 * Various enumerations used throughout Tempo library.
 * These are exported and added as static getters of the Tempo class.
 */

// #region Private Mutable State Registry ~~~~~~~~~~~~~~~~~~
/** @internal Centralized mutable state for all extendable registries */
export const STATE = {
	NUMBER: {
		zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
	} as Record<string, number>,

	DURATION: {
		/** approx number of seconds in a year */								year: 31_536_000,
		/** approx number of seconds in a month */							month: 2_628_000,
		/** number of seconds in a week */											week: 604_800,
		/** number of seconds in a day */												day: 86_400,
		/** number of seconds in an hour */											hour: 3_600,
		/** number of seconds in a minute */										minute: 60,
		/** one second */																				second: 1,
		/** number of seconds in a millisecond */								millisecond: .001,
		/** number of seconds in a microsecond */								microsecond: .000_001,
		/** number of seconds in a nanosecond */								nanosecond: .000_000_001,
	} as Record<string, number>,

	DURATIONS: {} as Record<string, number>,

	FORMAT: {
		/** useful for standard date display */									display: '{www}, {dd} {mmm} {yyyy}',
		/** useful for standard datestamps */										weekDate: '{www}, {yyyy}-{mmm}-{dd}',
		/** useful for standard timestamps */										weekTime: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}',
		/** useful for standard full timestamps */							weekStamp: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}',
		/** useful for readable month and day */								dayMonth: '{dd}-{mmm}',
		/** useful for Date */																	dayDate: '{dd}-{mmm}-{yyyy}',
		/** display with Time */																dayTime: '{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}',
		/** useful for stamping logs */													logStamp: '{yyyy}{mm}{dd}T{hhmiss}.{ff}',
		/** useful for sorting display-strings */								sortTime: '{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}',
		/** useful for sorting week order */										yearWeek: '{wy}{ww}',
		/** useful for sorting month order */										yearMonth: '{yyyy}{mm}',
		/** useful for sorting date order */										yearMonthDay: '{yyyy}{mm}{dd}',
		/** just Date portion */																date: '{yyyy}-{mm}-{dd}',
		/** just Time portion */																time: '{hh}:{mi}:{ss}',
	} as Record<string, string>,

	LIMIT: {
		/** Tempo(31-Dec-9999.23:59:59).ns */										maxTempo: Temporal.Instant.from('9999-12-31T23:59:59.999999999+00:00').epochNanoseconds,
		/** Tempo(01-Jan-1000.00:00:00).ns */										minTempo: Temporal.Instant.from('1000-01-01T00:00+00:00').epochNanoseconds,
	} as Record<string, bigint>,
};

// initialize DURATIONS based on DURATION
Object.assign(STATE.DURATIONS, {
	years: STATE.DURATION.year * 1_000,
	months: STATE.DURATION.month * 1_000,
	weeks: STATE.DURATION.week * 1_000,
	days: STATE.DURATION.day * 1_000,
	hours: STATE.DURATION.hour * 1_000,
	minutes: STATE.DURATION.minute * 1_000,
	seconds: STATE.DURATION.second * 1_000,
	milliseconds: 1,
	microseconds: .001,
	nanoseconds: .000_001,
});

(STATE.NUMBER as any)[$Extensible] = true;
(STATE.FORMAT as any)[$Extensible] = true;

// #endregion

/** compass points (North | South) for Hemisphere detection */
export enum COMPASS {
	North = 'North',
	South = 'South'
}
export type COMPASS = ValueOf<typeof COMPASS>

/** Gregorian calendar week-days */
export const WEEKDAY = enumify(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
/** Gregorian calendar week-days (plural) */
export const WEEKDAYS = enumify(['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']);

export type WEEKDAY = KeyOf<typeof WEEKDAY>
export type Weekday = ValueOf<typeof WEEKDAY>
export type WEEKDAYS = KeyOf<typeof WEEKDAYS>
export type Weekdays = ValueOf<typeof WEEKDAYS>

/** Gregorian calendar months */
export const MONTH = enumify(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
/** Gregorian calendar months (plural) */
export const MONTHS = enumify(['Januaries', 'Februaries', 'Marches', 'Aprils', 'Mays', 'Junes', 'Julies', 'Augusts', 'Septembers', 'Octobers', 'Novembers', 'Decembers']);

export type MONTH = KeyOf<typeof MONTH>
export type Month = ValueOf<typeof MONTH>
export type MONTHS = KeyOf<typeof MONTHS>
export type Months = ValueOf<typeof MONTHS>

/** calendar seasons */
export const SEASON = enumify(['Spring', 'Summer', 'Autumn', 'Winter']);
export type SEASON = KeyOf<typeof SEASON>
export type Season = ValueOf<typeof SEASON>

/** number names (0-10) */
export const NUMBER = getProxy(STATE.NUMBER, false);

/** number of seconds in a time unit */
export const DURATION = getProxy(enumify(STATE.DURATION, false), false);

/** number of milliseconds in a time unit */
export const DURATIONS = getProxy(enumify(STATE.DURATIONS, false), false);

export type DURATION = KeyOf<typeof DURATION>
export type DURATIONS = KeyOf<typeof DURATIONS>

/** pre-defined Format code short-cuts */
export const FORMAT = getProxy(enumify(STATE.FORMAT, false), false);

export type FORMAT = ValueOf<typeof FORMAT>
export type Format = LooseUnion<KeyOf<typeof FORMAT>>

/** patterns that return a number */
type NumericPattern = '{yyyy}{mm}' | '{yyww}' | '{yyyy}{mm}{dd}' | '{wy}{ww}' | '{wy}'

/** pre-configured format strings */
export type OwnFormat = Mutable<OwnOf<typeof FORMAT>>

/** mapping of format names to instance-resolutions (string | number) */
export type FormatType<K extends PropertyKey> = K extends keyof OwnFormat
	? (OwnFormat[K] extends NumericPattern ? number : string)
	: K extends NumericPattern ? number : string | number;

/** mapping of format names to instance-resolutions (string | number) */
export type Formats = {
	[K in keyof OwnFormat]: FormatType<K>;
} & Record<string, string | number>;

/** Enum registry of format strings */
export type FormatEnum = Enum.wrap<OwnFormat & Record<string, string | number>>;

export const LIMIT = getProxy(STATE.LIMIT, false);

export const ELEMENT = getProxy(enumify({
	yy: 'year',
	mm: 'month',
	ww: 'week',
	dd: 'day',
	hh: 'hour',
	mi: 'minute',
	ss: 'second',
	ms: 'millisecond',
	us: 'microsecond',
	ns: 'nanosecond',
}, false), false);
export type ELEMENT = ValueOf<typeof ELEMENT>
export type Element = KeyOf<typeof ELEMENT>

export const MUTATION = getProxy(enumify(ELEMENT.values(), false).extend(['event', 'period', 'clock', 'time', 'date', 'start', 'mid', 'end'], false), false) as any;
export type MUTATION = ValueOf<typeof MUTATION>
export type Mutation = KeyOf<typeof MUTATION>

export const ZONED_DATE_TIME = getProxy(enumify(['value', 'timeZoneId', 'calendarId', 'monthCode', 'offset', 'timeZone'], false).extend(ELEMENT.values(), false), false) as any;
export type ZONED_DATE_TIME = ValueOf<typeof ZONED_DATE_TIME>
export type ZonedDateTime = KeyOf<typeof ZONED_DATE_TIME>

export const OPTION = getProxy(enumify(['value', 'mdyLocales', 'mdyLayouts', 'store', 'discovery', 'debug', 'catch', 'timeZone', 'calendar', 'locale', 'pivot', 'sphere', 'timeStamp', 'snippet', 'layout', 'event', 'period', 'formats', 'plugins'], false), false);
export type Option = KeyOf<typeof OPTION>

export const PARSE = getProxy(enumify(['mdyLocales', 'mdyLayouts', 'formats', 'pivot', 'snippet', 'layout', 'event', 'period', 'anchor', 'value', 'discovery', 'plugins'], false), false);
export type Parse = KeyOf<typeof PARSE>

export const DISCOVERY = getProxy(enumify(['options', 'timeZones', 'terms', 'plugins', 'numbers', 'formats'], false), false);
export type Discovery = KeyOf<typeof DISCOVERY>

/** update a global registry with new discoverable data */
export function registryUpdate(name: 'NUMBER' | 'FORMAT', data: Record<string, any>) {
	const registry = (name === 'NUMBER' ? NUMBER : FORMAT) as any;
	const target = registry[$Target];

	if (target) {
		Object.assign(STATE[name], data);
		Object.assign(target, data);
		clearCache(target);
	}
}

export { }