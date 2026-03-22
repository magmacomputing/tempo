import { enumify } from '#core/shared/enumerate.library.js';
import { secure } from '#core/shared/utility.library.js';
/**
 * Various enumerations used throughout Tempo library.
 * These are exported and added as static getters of the Tempo class.
 * Usage example:
 * ```typescript
 * 			const dayNames = Tempo.WEEKDAY.keys();	// ['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
 * ```
 */
/** */
export const WEEKDAY = enumify(['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
export const WEEKDAYS = enumify(['Everyday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
export const MONTH = enumify(['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
export const MONTHS = enumify(['Every', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
export const SEASON = enumify({ Summer: 'summer', Autumn: 'autumn', Winter: 'winter', Spring: 'spring' });
export const COMPASS = enumify({ North: 'north', East: 'east', South: 'south', West: 'west' });
/** number of seconds in a time unit */
export const DURATION = enumify({
    /** approx number of seconds in a year */ year: 31_536_000,
    /** approx number of seconds in a month */ month: 2_628_000,
    /** number of seconds in a week */ week: 604_800,
    /** number of seconds in a day */ day: 86_400,
    /** number of seconds in an hour */ hour: 3_600,
    /** number of seconds in a minute */ minute: 60,
    /** one second */ second: 1,
    /** number of seconds in a millisecond */ millisecond: .001,
    /** number of seconds in a microsecond */ microsecond: .000_001,
    /** number of seconds in a nanosecond */ nanosecond: .000_000_001,
});
/** number of milliseconds in a time unit */
export const DURATIONS = enumify({
    /** approx number of milliseconds in a year */ years: DURATION.year * 1_000,
    /** approx number of milliseconds in a month */ months: DURATION.month * 1_000,
    /** number of milliseconds in a week */ weeks: DURATION.week * 1_000,
    /** number of milliseconds in a day */ days: DURATION.day * 1_000,
    /** number of milliseconds in an hour */ hours: DURATION.hour * 1_000,
    /** number of milliseconds in a minute */ minutes: DURATION.minute * 1_000,
    /** number of milliseconds in a second */ seconds: DURATION.second * 1_000,
    /** one millisecond */ milliseconds: DURATION.millisecond * 1_000,
    /** number of milliseconds in a microsecond */ microseconds: DURATION.microsecond * 1_000,
    /** number of milliseconds in a nanosecond */ nanoseconds: Number((DURATION.nanosecond * 1_000).toPrecision(6)),
});
/** pre-defined Format code short-cuts */
export const FORMAT = enumify({
    /** useful for standard date display */ display: '{www}, {dd} {mmm} {yyyy}',
    /** useful for standard datestamps */ weekDate: '{www}, {yyyy}-{mmm}-{dd}',
    /** useful for standard timestamps */ weekTime: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}',
    /** useful for standard full timestamps */ weekStamp: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}',
    /** useful for readable month and day */ dayMonth: '{dd}-{mmm}',
    /** useful for Date */ dayDate: '{dd}-{mmm}-{yyyy}',
    /** display with Time */ dayTime: '{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}',
    /** useful for stamping logs */ logStamp: '{yyyy}{mm}{dd}T{hhmiss}.{ff}',
    /** useful for sorting display-strings */ sortTime: '{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}',
    /** useful for sorting week order */ yearWeek: '{wy}{ww}',
    /** useful for sorting month order */ yearMonth: '{yyyy}{mm}',
    /** useful for sorting date order */ yearMonthDay: '{yyyy}{mm}{dd}',
    /** just Date portion */ date: '{yyyy}-{mm}-{dd}',
    /** just Time portion */ time: '{hh}:{mi}:{ss}',
});
export const LIMIT = secure({
    /** Tempo(31-Dec-9999.23:59:59).ns */ maxTempo: Temporal.Instant.from('9999-12-31T23:59:59.999999999+00:00').epochNanoseconds,
    /** Tempo(01-Jan-1000.00:00:00).ns */ minTempo: Temporal.Instant.from('1000-01-01T00:00+00:00').epochNanoseconds,
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
export const MUTATION = enumify(ELEMENT.values()).extend(['event', 'period', 'clock', 'time', 'date', 'start', 'mid', 'end']);
export const ZONED_DATE_TIME = enumify(['value', 'timeZoneId', 'calendarId', 'monthCode', 'offset', 'timeZone']).extend(ELEMENT.values());
export const OPTION = enumify(['value', 'mdyLocales', 'mdyLayouts', 'store', 'discovery', 'debug', 'catch', 'timeZone', 'calendar', 'locale', 'pivot', 'sphere', 'timeStamp', 'snippet', 'layout', 'event', 'period', 'formats', 'plugins']);
export const PARSE = enumify(['mdyLocales', 'mdyLayouts', 'formats', 'pivot', 'snippet', 'layout', 'event', 'period', 'anchor', 'value', 'discovery', 'plugins']);
//# sourceMappingURL=tempo.enum.js.map