import type { Enum } from '#core/shared/enumerate.library.js';
import type { OwnOf, KeyOf, ValueOf, LooseUnion, Mutable } from '#core/shared/type.library.js';
/**
 * Various enumerations used throughout Tempo library.
 * These are exported and added as static getters of the Tempo class.
 * Usage example:
 * ```typescript
 * 			const dayNames = Tempo.WEEKDAY.keys();	// ['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
 * ```
 */
/** */
export declare const WEEKDAY: Enum.wrap<import("#core/shared/type.library.js").Index<["All", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]>>;
export declare const WEEKDAYS: Enum.wrap<import("#core/shared/type.library.js").Index<["Everyday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]>>;
export type WEEKDAY = KeyOf<typeof WEEKDAY>;
export type WEEKDAYS = KeyOf<typeof WEEKDAYS>;
export type Weekday = ValueOf<typeof WEEKDAY>;
export declare const MONTH: Enum.wrap<import("#core/shared/type.library.js").Index<["All", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]>>;
export declare const MONTHS: Enum.wrap<import("#core/shared/type.library.js").Index<["Every", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]>>;
export type MONTH = KeyOf<typeof MONTH>;
export type MONTHS = KeyOf<typeof MONTHS>;
export type Month = ValueOf<typeof MONTH>;
export declare const SEASON: Enum.wrap<{
    readonly Summer: "summer";
    readonly Autumn: "autumn";
    readonly Winter: "winter";
    readonly Spring: "spring";
}>;
export declare const COMPASS: Enum.wrap<{
    readonly North: "north";
    readonly East: "east";
    readonly South: "south";
    readonly West: "west";
}>;
export type SEASON = ValueOf<typeof SEASON>;
export type COMPASS = ValueOf<typeof COMPASS>;
/** number of seconds in a time unit */
export declare const DURATION: Enum.wrap<{
    /** approx number of seconds in a year */ readonly year: 31536000;
    /** approx number of seconds in a month */ readonly month: 2628000;
    /** number of seconds in a week */ readonly week: 604800;
    /** number of seconds in a day */ readonly day: 86400;
    /** number of seconds in an hour */ readonly hour: 3600;
    /** number of seconds in a minute */ readonly minute: 60;
    /** one second */ readonly second: 1;
    /** number of seconds in a millisecond */ readonly millisecond: 0.001;
    /** number of seconds in a microsecond */ readonly microsecond: 0.000001;
    /** number of seconds in a nanosecond */ readonly nanosecond: 1e-9;
}>;
/** number of milliseconds in a time unit */
export declare const DURATIONS: Enum.wrap<{
    /** approx number of milliseconds in a year */ readonly years: number;
    /** approx number of milliseconds in a month */ readonly months: number;
    /** number of milliseconds in a week */ readonly weeks: number;
    /** number of milliseconds in a day */ readonly days: number;
    /** number of milliseconds in an hour */ readonly hours: number;
    /** number of milliseconds in a minute */ readonly minutes: number;
    /** number of milliseconds in a second */ readonly seconds: number;
    /** one millisecond */ readonly milliseconds: number;
    /** number of milliseconds in a microsecond */ readonly microseconds: number;
    /** number of milliseconds in a nanosecond */ readonly nanoseconds: number;
}>;
export type DURATION = KeyOf<typeof DURATION>;
export type DURATIONS = KeyOf<typeof DURATIONS>;
/** pre-defined Format code short-cuts */
export declare const FORMAT: Enum.wrap<{
    /** useful for standard date display */ readonly display: "{www}, {dd} {mmm} {yyyy}";
    /** useful for standard datestamps */ readonly weekDate: "{www}, {yyyy}-{mmm}-{dd}";
    /** useful for standard timestamps */ readonly weekTime: "{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}";
    /** useful for standard full timestamps */ readonly weekStamp: "{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}";
    /** useful for readable month and day */ readonly dayMonth: "{dd}-{mmm}";
    /** useful for Date */ readonly dayDate: "{dd}-{mmm}-{yyyy}";
    /** display with Time */ readonly dayTime: "{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}";
    /** useful for stamping logs */ readonly logStamp: "{yyyy}{mm}{dd}T{hhmiss}.{ff}";
    /** useful for sorting display-strings */ readonly sortTime: "{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}";
    /** useful for sorting week order */ readonly yearWeek: "{wy}{ww}";
    /** useful for sorting month order */ readonly yearMonth: "{yyyy}{mm}";
    /** useful for sorting date order */ readonly yearMonthDay: "{yyyy}{mm}{dd}";
    /** just Date portion */ readonly date: "{yyyy}-{mm}-{dd}";
    /** just Time portion */ readonly time: "{hh}:{mi}:{ss}";
}>;
export type FORMAT = ValueOf<typeof FORMAT>;
export type Format = LooseUnion<KeyOf<typeof FORMAT>>;
/** patterns that return a number */
type NumericPattern = '{yyyy}{mm}' | '{yyww}' | '{yyyy}{mm}{dd}' | '{wy}{ww}' | '{wy}';
/** pre-configured format strings */
export type OwnFormat = Mutable<OwnOf<typeof FORMAT>>;
/** mapping of format names to instance-resolutions (string | number) */
export type FormatType<K extends PropertyKey> = K extends keyof OwnFormat ? (OwnFormat[K] extends NumericPattern ? number : string) : K extends NumericPattern ? number : string | number;
/** mapping of format names to instance-resolutions (string | number) */
export type Formats = {
    [K in keyof OwnFormat]: FormatType<K>;
} & Record<string, string | number>;
/** Enum registry of format strings */
export type FormatEnum = Enum.wrap<OwnFormat & Record<string, string | number>>;
export declare const LIMIT: import("#core/shared/type.library.js").SecureObject<{
    /** Tempo(31-Dec-9999.23:59:59).ns */ readonly maxTempo: bigint;
    /** Tempo(01-Jan-1000.00:00:00).ns */ readonly minTempo: bigint;
}>;
export declare const ELEMENT: Enum.wrap<{
    readonly yy: "year";
    readonly mm: "month";
    readonly ww: "week";
    readonly dd: "day";
    readonly hh: "hour";
    readonly mi: "minute";
    readonly ss: "second";
    readonly ms: "millisecond";
    readonly us: "microsecond";
    readonly ns: "nanosecond";
}>;
export type ELEMENT = ValueOf<typeof ELEMENT>;
export type Element = KeyOf<typeof ELEMENT>;
export declare const MUTATION: any;
export type MUTATION = ValueOf<typeof MUTATION>;
export type Mutation = KeyOf<typeof MUTATION>;
export declare const ZONED_DATE_TIME: any;
export type ZONED_DATE_TIME = ValueOf<typeof ZONED_DATE_TIME>;
export type ZonedDateTime = KeyOf<typeof ZONED_DATE_TIME>;
export declare const OPTION: Enum.wrap<import("#core/shared/type.library.js").Index<["value", "mdyLocales", "mdyLayouts", "store", "discovery", "debug", "catch", "timeZone", "calendar", "locale", "pivot", "sphere", "timeStamp", "snippet", "layout", "event", "period", "formats", "plugins"]>>;
export type OPTION = typeof OPTION;
export type Option = KeyOf<OPTION>;
export declare const PARSE: Enum.wrap<import("#core/shared/type.library.js").Index<["mdyLocales", "mdyLayouts", "formats", "pivot", "snippet", "layout", "event", "period", "anchor", "value", "discovery", "plugins"]>>;
export type PARSE = typeof PARSE;
export type Parse = KeyOf<PARSE>;
export {};
