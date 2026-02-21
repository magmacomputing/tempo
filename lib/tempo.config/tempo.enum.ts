import { enumify } from '#core/shared/enumerate.library.js';
import { secure } from '#core/shared/utility.library.js';
import type { KeyOf, ValueOf } from '#core/shared/type.library.js';

/**
 * Various enumerations used throughout Tempo library.  
 * These are exported and added as static getters of the Tempo class.  
 * Usage example:	
 ```javascript
			const dayNames = Tempo.WEEKDAY.keys();	// ['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
 */

/** */
export const WEEKDAY = enumify(['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
export const WEEKDAYS = enumify(['Everyday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
export type WEEKDAY = KeyOf<typeof WEEKDAY>
export type WEEKDAYS = KeyOf<typeof WEEKDAYS>
export type Weekday = ValueOf<typeof WEEKDAY>

export const MONTH = enumify(['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
export const MONTHS = enumify(['Every', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
export type MONTH = KeyOf<typeof MONTH>
export type MONTHS = KeyOf<typeof MONTHS>
export type Month = ValueOf<typeof MONTH>

export const DURATION = enumify(['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond']);
export const DURATIONS = enumify(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds']);
export type DURATION = KeyOf<typeof DURATION>
export type DURATIONS = KeyOf<typeof DURATIONS>

export const SEASON = enumify({ Summer: 'summer', Autumn: 'autumn', Winter: 'winter', Spring: 'spring' });
export const COMPASS = enumify({ North: 'north', East: 'east', South: 'south', West: 'west' });
export type SEASON = ValueOf<typeof SEASON>
export type COMPASS = ValueOf<typeof COMPASS>

export const TIME = enumify({
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
});
export const TIMES = enumify({
		/** approx number of milliseconds in a year */					years: TIME.year * 1_000,
		/** approx number of milliseconds in a month */					months: TIME.month * 1_000,
		/** number of milliseconds in a week */									weeks: TIME.week * 1_000,
		/** number of milliseconds in a day */									days: TIME.day * 1_000,
		/** number of milliseconds in an hour */								hours: TIME.hour * 1_000,
		/** number of milliseconds in a minute */								minutes: TIME.minute * 1_000,
		/** number of milliseconds in a second */								seconds: TIME.second * 1_000,
		/** one millisecond */																	milliseconds: TIME.millisecond * 1_000,
		/** number of milliseconds in a microsecond */					microseconds: TIME.microsecond * 1_000,
		/** number of milliseconds in a nanosecond */						nanoseconds: Number((TIME.nanosecond * 1_000).toPrecision(6)),
});
/** pre-defined Format code short-cuts */
export const FORMAT = enumify({
		/** useful for standard date display */									display: 'www, dd mmm yyyy',
		/** useful for standard datestamps */										wkdDate: 'www, yyyy-mmm-dd',
		/** useful for standard timestamps */										wkdTime: 'www, yyyy-mmm-dd hh:mi:ss',
		/** useful for standard full timestamps */							wkdStamp: 'www, yyyy-mmm-dd hh:mi:ss.ff',
		/** useful for readable month and day */								dayMonth: 'dd-mmm',
		/** useful for Date */																	dayDate: 'dd-mmm-yyyy',
		/** display with Time */																dayTime: 'dd-mmm-yyyy hh:mi:ss',
		/** useful for stamping logs */													logStamp: 'yyyymmdd.hhmiss.ff',
		/** useful for sorting display-strings */								sortTime: 'yyyy-mm-dd hh:mi:ss',
		/** useful for sorting week order */										yearWeek: 'yyyyww',
		/** useful for sorting month order */										yearMonth: 'yyyymm',
		/** useful for sorting date order */										yearMonthDay: 'yyyymmdd',
		/** just Date portion */																date: 'yyyy-mmm-dd',
		/** just Time portion */																time: 'hh:mi:ss',
});
export type FORMAT = ValueOf<typeof FORMAT>

export const LIMIT = secure({
		/** Tempo(31-Dec-9999.23:59:59).ns */										maxTempo: Temporal.Instant.from('9999-12-31T23:59:59.999999999+00:00').epochNanoseconds,
		/** Tempo(01-Jan-1000.00:00:00).ns */										minTempo: Temporal.Instant.from('1000-01-01T00:00+00:00').epochNanoseconds,
});

export const ELEMENT = enumify({
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
});
export type ELEMENT = ValueOf<typeof ELEMENT>
export type Element = KeyOf<typeof ELEMENT>