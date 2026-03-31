import { $Target, $Extensible } from '#library/symbol.library.js';
import { enumify, Enum } from '#library/enumerate.library.js';
import { getProxy } from '#library/proxy.library.js';
import { allDescriptors, ownKeys } from '#library/reflection.library.js';
import { clearCache } from '#library/function.library.js';
import { isUndefined, isDefined } from '#library/type.library.js';
import type { OwnOf, KeyOf, ValueOf, LooseUnion, Mutable, Property } from '#library/type.library.js';

/** calendar seasons */
export const SEASON = enumify({
	Spring: 'spring',
	Summer: 'summer',
	Autumn: 'autumn',
	Winter: 'winter'
}, false);
export type SEASON = ValueOf<typeof SEASON>

/** cardinal directions */
export const COMPASS = enumify({
	North: 'north',
	South: 'south',
	East: 'east',
	West: 'west'
}, false);
export type COMPASS = ValueOf<typeof COMPASS>

/**
 * Various enumerations used throughout Tempo library.
 * These are exported and added as static getters of the Tempo class.
 */

// #region Private Mutable State Registry ~~~~~~~~~~~~~~~~~~
/** @internal LIVE state for all registries */
const DEFAULTS = {
	NUMBER: {
		zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
	},
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
	},
	TIMEZONE: {
		'utc': 'UTC',
		'gmt': 'Europe/London',
		'est': 'America/New_York',
		'cst': 'America/Chicago',
		'mst': 'America/Denver',
		'pst': 'America/Los_Angeles',
		'aest': 'Australia/Sydney',
		'acst': 'Australia/Adelaide',
		'awst': 'Australia/Perth',
		'nzt': 'Pacific/Auckland',
		'cet': 'Europe/Paris',
		'eet': 'Europe/Helsinki',
		'ist': 'Asia/Kolkata',
		'npt': 'Asia/Kathmandu',
		'jst': 'Asia/Tokyo',
	},
	DURATIONS: {
		/** approx number of milliseconds in a year */					years: 31_536_000_000,
		/** approx number of milliseconds in a month */					months: 2_628_000_000,
		/** number of milliseconds in a week */									weeks: 604_800_000,
		/** number of milliseconds in a day */									days: 86_400_000,
		/** number of milliseconds in an hour */								hours: 3_600_000,
		/** number of milliseconds in a minute */								minutes: 60_000,
		/** number of milliseconds in a second */								seconds: 1_000,
		/** one millisecond */																	milliseconds: 1,
		/** number of milliseconds in a microsecond */					microseconds: .001,
		/** number of milliseconds in a nanosecond */						nanoseconds: .000_001,
	},
	FORMAT: {
		/** useful for standard date display */									display: '{www}, {dd} {mmm} {yyyy}',
		/** useful for standard datestamps */										weekDate: '{www}, {yyyy}-{mmm}-{dd}',
		/** useful for standard timestamps */										weekTime: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}',
		/** useful for standard full timestamps */							weekStamp: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}',
		/** useful for readable month and day */								dayMonth: '{dd}-{mmm}',
		/** useful for readable year, month and day */					dayDate: '{dd}-{mmm}-{yyyy}',
		/** display with Time */																dayTime: '{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}',
		/** useful for stamping logs */													logStamp: '{yyyy}{mm}{dd}T{hhmiss}.{ff}',
		/** useful for sorting display-strings */								sortTime: '{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}',
		/** useful for sorting week order */										yearWeek: '{yw}{ww}',
		/** useful for sorting month order */										yearMonth: '{yyyy}{mm}',
		/** useful for sorting date order */										yearMonthDay: '{yyyy}{mm}{dd}',
		/** just Date portion */																date: '{yyyy}-{mm}-{dd}',
		/** just Time portion */																time: '{hh}:{mi}:{ss}',
	},
	LIMIT: {
		/** Tempo(31-Dec-9999.23:59:59).ns */										get maxTempo() { return Temporal.Instant.from('9999-12-31T23:59:59.999999999+00:00').epochNanoseconds },
		/** Tempo(01-Jan-1000.00:00:00).ns */										get minTempo() { return Temporal.Instant.from('1000-01-01T00:00+00:00').epochNanoseconds },
	},
} as const;

/** @internal Centralized mutable state for all extendable registries */
export const STATE = {
	NUMBER: allDescriptors(DEFAULTS.NUMBER),
	DURATION: allDescriptors(DEFAULTS.DURATION),
	TIMEZONE: allDescriptors(DEFAULTS.TIMEZONE),
	DURATIONS: allDescriptors(DEFAULTS.DURATIONS),
	FORMAT: allDescriptors(DEFAULTS.FORMAT),
	LIMIT: allDescriptors(DEFAULTS.LIMIT),
} as const;

(STATE.NUMBER as any)[$Extensible] = true;
(STATE.FORMAT as any)[$Extensible] = true;
(STATE.TIMEZONE as any)[$Extensible] = true;

// #endregion

// #endregion

/** Gregorian calendar week-days (short-form) */
export const WEEKDAY = enumify(['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
/** Gregorian calendar week-days (long-form) */
export const WEEKDAYS = enumify(['Everyday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

export type WEEKDAY = KeyOf<typeof WEEKDAY>
export type Weekday = ValueOf<typeof WEEKDAY>
export type WEEKDAYS = KeyOf<typeof WEEKDAYS>
export type Weekdays = ValueOf<typeof WEEKDAYS>

/** Gregorian calendar months (short-form) */
export const MONTH = enumify(['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
/** Gregorian calendar months (long-form) */
export const MONTHS = enumify(['Every', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

export type MONTH = KeyOf<typeof MONTH>
export type Month = ValueOf<typeof MONTH>
export type MONTHS = KeyOf<typeof MONTHS>
export type Months = ValueOf<typeof MONTHS>

/** number names (0-10) */
export const NUMBER = enumify(STATE.NUMBER, false);
export type Number = KeyOf<typeof NUMBER>

/** common time-zone aliases */
export const TimeZone = getProxy(STATE.TIMEZONE, false);

/** number of seconds in a time unit */
export const DURATION = enumify(STATE.DURATION, false);
export type DURATION = KeyOf<typeof DURATION>

/** number of milliseconds in a time unit */
export const DURATIONS = enumify(STATE.DURATIONS, false);
export type DURATIONS = KeyOf<typeof DURATIONS>

/** common format aliases */
export const FORMAT = enumify(STATE.FORMAT, false);
export type FORMAT = ValueOf<typeof FORMAT>
export type Format = LooseUnion<KeyOf<typeof FORMAT> & string>

/** patterns that return a number */
type NumericPattern = '{yyyy}{mm}' | '{yyww}' | '{yyyy}{mm}{dd}' | '{yw}{ww}' | '{yw}'

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

/** date-time element tokens */
const elementKeys = ['yy', 'mm', 'ww', 'dd', 'hh', 'mi', 'ss', 'ms', 'us', 'ns'] as const;
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

/** allowed mutation keys for .set() and .add() */
const mutationKeys = [...elementKeys, 'event', 'period', 'clock', 'time', 'date', 'start', 'mid', 'end'] as const;
export const MUTATION = getProxy(enumify(mutationKeys, false), false);
export type MUTATION = ValueOf<typeof MUTATION>
export type Mutation = KeyOf<typeof MUTATION>

/** allowed keys for ZonedDateTime-like objects */
const zonedDateTimeKeys = ['value', 'timeZoneId', 'calendarId', 'monthCode', 'offset', 'timeZone', ...elementKeys] as const;
export const ZONED_DATE_TIME = getProxy(enumify(zonedDateTimeKeys, false), false);
export type ZONED_DATE_TIME = ValueOf<typeof ZONED_DATE_TIME>
export type ZonedDateTime = KeyOf<typeof ZONED_DATE_TIME>

/** allowed keys for Tempo configuration options */
const optionKeys = ['value', 'mode', 'mdyLocales', 'mdyLayouts', 'store', 'discovery', 'debug', 'catch', 'timeZone', 'calendar', 'locale', 'pivot', 'sphere', 'timeStamp', 'snippet', 'layout', 'event', 'period', 'formats', 'plugins'] as const;
export const OPTION = getProxy(enumify(optionKeys, false), false);
export type Option = KeyOf<typeof OPTION>

/** initialization strategies */
export const MODE = enumify({ Auto: 'auto', Strict: 'strict', Defer: 'defer', }, false);
export type Mode = ValueOf<typeof MODE>

/** allowed keys for internal parse state */
const parseKeys = ['mdyLocales', 'mdyLayouts', 'formats', 'pivot', 'snippet', 'layout', 'event', 'period', 'anchor', 'value', 'discovery', 'plugins', 'mode'] as const;
export const PARSE = getProxy(enumify(parseKeys, false), false);
export type Parse = KeyOf<typeof PARSE>

/** allowed keys for global discovery objects */
const discoveryKeys = ['options', 'timeZones', 'terms', 'plugins', 'numbers', 'formats'] as const;
export const DISCOVERY = getProxy(enumify(discoveryKeys, false), false);
export type Discovery = KeyOf<typeof DISCOVERY>


/** @internal LIVE Registries mapping (STATE key -> Enum/Proxy) */
const REGISTRIES: Record<string, any> = {
	NUMBER, DURATION, TIMEZONE: TimeZone, DURATIONS, FORMAT, LIMIT,
};

/** update a global registry with new discoverable data */
export function registryUpdate(name: keyof typeof STATE, data: Record<string, any>) {
	const registry = REGISTRIES[name];
	const target = registry?.[$Target] as Property<any>;
	const state = STATE[name] as Property<any>;

	Object.entries(data).forEach(([key, val]) => {
		if (isUndefined(state[key])) {													// only add if key does not exist
			state[key] = val;
			if (target) target[key] = val;
		}
	});

	if (target) clearCache(target);
}

/** Reset all extendable registries to their original built-in defaults */
export function registryReset() {
	ownKeys(STATE).forEach(name => {
		const state = STATE[name as keyof typeof STATE] as Property<any>;
		const target = REGISTRIES[name]?.[$Target] as Property<any>;
		const defaults = DEFAULTS[name as keyof typeof DEFAULTS] as Property<any>;

		// 1. Purge all own-properties from state and target (if configurable)
		[state, target].filter(isDefined).forEach(obj => {
			Reflect.ownKeys(obj).forEach(key => {
				const desc = Object.getOwnPropertyDescriptor(obj, key);
				if (desc?.configurable) delete obj[key];
			});
		});

		// 2. Restore defaults using property descriptors to preserve accessors/configurability
		Reflect.ownKeys(defaults).forEach(key => {
			const desc = Object.getOwnPropertyDescriptor(defaults, key);

			if (desc) {
				[state, target].filter(isDefined).forEach(obj => {
					Object.defineProperty(obj, key, desc);
				});
			}
		});

		if (target) clearCache(target);
		clearCache(state);														// clear cache for state object
	});
}
