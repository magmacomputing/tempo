import '#core/temporal.polyfill.js';
import type { IntRange, LooseUnion, NonOptional, Property, Plural, Type } from '#core/shared/type.library.js';
import * as enums from '#core/tempo.config/tempo.enum.js';
import { Token, Snippet, Layout, Event, Period } from '#core/tempo.config/tempo.default.js';
import '#core/shared/prototype.library.js';
declare module '#core/shared/type.library.js' {
    interface TypeValueMap<T> {
        Tempo: {
            type: 'Tempo';
            value: Tempo;
        };
    }
}
/** key to use for storage / globalThis Symbol */ export declare const $Tempo: unique symbol;
/**
 * # Tempo
 * A powerful wrapper around `Temporal.ZonedDateTime` for flexible parsing and intuitive manipulation of date-time objects.
 * Bridges the gap between raw string/number inputs and the strict requirements of the ECMAScript Temporal API.
 */
export declare class Tempo {
    #private;
    /** Weekday names (short-form) */ static get WEEKDAY(): import("#core/shared/enumerate.library.js").Enum.wrap<import("#core/shared/type.library.js").Index<["All", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]>>;
    /** Weekday names (long-form) */ static get WEEKDAYS(): import("#core/shared/enumerate.library.js").Enum.wrap<import("#core/shared/type.library.js").Index<["Everyday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]>>;
    /** Month names (short-form) */ static get MONTH(): import("#core/shared/enumerate.library.js").Enum.wrap<import("#core/shared/type.library.js").Index<["All", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]>>;
    /** Month names (long-form) */ static get MONTHS(): import("#core/shared/enumerate.library.js").Enum.wrap<import("#core/shared/type.library.js").Index<["Every", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]>>;
    /** Time durations as seconds (singular) */ static get DURATION(): import("#core/shared/enumerate.library.js").Enum.wrap<{
        readonly year: 31536000;
        readonly month: 2628000;
        readonly week: 604800;
        readonly day: 86400;
        readonly hour: 3600;
        readonly minute: 60;
        readonly second: 1;
        readonly millisecond: 0.001;
        readonly microsecond: 0.000001;
        readonly nanosecond: 1e-9;
    }>;
    /** Time durations as milliseconds (plural) */ static get DURATIONS(): import("#core/shared/enumerate.library.js").Enum.wrap<{
        readonly years: number;
        readonly months: number;
        readonly weeks: number;
        readonly days: number;
        readonly hours: number;
        readonly minutes: number;
        readonly seconds: number;
        readonly milliseconds: number;
        readonly microseconds: number;
        readonly nanoseconds: number;
    }>;
    /** Quarterly Seasons */ static get SEASON(): import("#core/shared/enumerate.library.js").Enum.wrap<{
        readonly Summer: "summer";
        readonly Autumn: "autumn";
        readonly Winter: "winter";
        readonly Spring: "spring";
    }>;
    /** Compass cardinal points */ static get COMPASS(): import("#core/shared/enumerate.library.js").Enum.wrap<{
        readonly North: "north";
        readonly East: "east";
        readonly South: "south";
        readonly West: "west";
    }>;
    /** Tempo to Temporal DateTime Units map */ static get ELEMENT(): import("#core/shared/enumerate.library.js").Enum.wrap<{
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
    /** Pre-configured format {name -> string} pairs */ static get FORMAT(): enums.FormatEnum;
    /** some useful Dates */ static get LIMIT(): import("#core/shared/type.library.js").SecureObject<{
        readonly maxTempo: bigint;
        readonly minTempo: bigint;
    }>;
    /**
     * Bootstrap the library with a Custom Global Discovery object.
     *
     * This replaces the manual `globalThis[Symbol.for($Tempo)] = { ... }` pattern
     * and automatically calls `Tempo.init()` to apply the discovered configuration.
     *
     * @param config - The Global Discovery object to register.
     * @returns The resolved global configuration.
     */
    static discover(config: Tempo.Discovery): {
        [key: string]: any;
        /** configuration (global | local) */ scope: "global" | "local";
        /** pre-configured format strings */ formats: Tempo.Format;
        anchor: Temporal.ZonedDateTime;
        timeZone: Temporal.TimeZoneLike;
        store: string;
        discovery: string;
        debug: boolean | undefined;
        catch: boolean | undefined;
        calendar: Temporal.CalendarLike;
        locale: string;
        sphere: Tempo.COMPASS | undefined;
        timeStamp: Tempo.TimeStamp;
        plugins: Tempo.Plugin | Tempo.Plugin[];
    };
    /**
     * Initializes the global default configuration for all subsequent `Tempo` instances.
     *
     * Settings are inherited in this priority:
     * 1. Reasonable library defaults (defined in tempo.config.js)
     * 2. Persistent storage (e.g. localStorage), if available.
     * 3. `options` provided to this method.
     *
     * @param options - Configuration overrides to apply globally.
     * @returns The resolved global configuration.
     */
    static init(options?: Tempo.Options): {
        [key: string]: any;
        /** configuration (global | local) */ scope: "global" | "local";
        /** pre-configured format strings */ formats: Tempo.Format;
        anchor: Temporal.ZonedDateTime;
        timeZone: Temporal.TimeZoneLike;
        store: string;
        discovery: string;
        debug: boolean | undefined;
        catch: boolean | undefined;
        calendar: Temporal.CalendarLike;
        locale: string;
        sphere: Tempo.COMPASS | undefined;
        timeStamp: Tempo.TimeStamp;
        plugins: Tempo.Plugin | Tempo.Plugin[];
    };
    /** release global config and reset library to defaults */
    static [Symbol.dispose](): void;
    /**
     * Extends the Tempo class with new functionality.
     * Plugins can add static or instance methods to the library.
     */
    static extend(plugin: Tempo.Plugin, options?: any): typeof Tempo;
    /** Reads options from persistent storage (e.g., localStorage). */
    static readStore(key?: string): Tempo.Options;
    /** Writes configuration into persistent storage. */
    static writeStore(config?: Tempo.Options, key?: string): void;
    /** lookup or registers a new `Symbol` for a given key. */
    static getSymbol(key?: string | symbol): symbol;
    /** translates {layout} into an anchored, case-insensitive RegExp. */
    static regexp(layout: string | RegExp, snippet?: Snippet): RegExp;
    /** Compares two `Tempo` instances or date-time values. */
    static compare(tempo1?: Tempo.DateTime | Tempo.Options, tempo2?: Tempo.DateTime | Tempo.Options): number;
    /** global Tempo configuration */
    static get config(): {
        [key: string]: any;
        /** configuration (global | local) */ scope: "global" | "local";
        /** pre-configured format strings */ formats: Tempo.Format;
        anchor: Temporal.ZonedDateTime;
        timeZone: Temporal.TimeZoneLike;
        store: string;
        discovery: string;
        debug: boolean | undefined;
        catch: boolean | undefined;
        calendar: Temporal.CalendarLike;
        locale: string;
        sphere: Tempo.COMPASS | undefined;
        timeStamp: Tempo.TimeStamp;
        plugins: Tempo.Plugin | Tempo.Plugin[];
    };
    /** global discovery configuration */
    static get discovery(): any;
    /**
 * Returns a snapshot of the configuration layers used by Tempo.
 * Useful for debugging how the final configuration is built.
 */
    static get options(): {
        default: import("#core/shared/type.library.js").SecureObject<{
            readonly scope: "default";
            readonly timeZone: import("#core/shared/type.library.js").Extend<{
                readonly utc: "UTC";
                readonly gmt: "Europe/London";
                readonly est: "America/New_York";
                readonly cst: "America/Chicago";
                readonly mst: "America/Denver";
                readonly pst: "America/Los_Angeles";
                readonly aest: "Australia/Sydney";
                readonly acst: "Australia/Adelaide";
                readonly awst: "Australia/Perth";
                readonly nzt: "Pacific/Auckland";
                readonly cet: "Europe/Paris";
                readonly eet: "Europe/Helsinki";
                readonly ist: "Asia/Kolkata";
                readonly npt: "Asia/Kathmandu";
                readonly jst: "Asia/Tokyo";
            }, string, string>;
            readonly store?: string | undefined;
            readonly discovery?: string | undefined;
            readonly debug?: boolean | undefined;
            readonly catch?: boolean | undefined;
            readonly calendar?: string | import("#core/shared/type.library.js").SecureObject<Temporal.ZonedDateTime> | import("#core/shared/type.library.js").SecureObject<Temporal.PlainDate> | import("#core/shared/type.library.js").SecureObject<Temporal.PlainDateTime> | import("#core/shared/type.library.js").SecureObject<Temporal.PlainMonthDay> | import("#core/shared/type.library.js").SecureObject<Temporal.PlainYearMonth> | undefined;
            readonly locale?: string | undefined;
            readonly pivot?: number | undefined;
            readonly sphere?: Tempo.COMPASS | undefined;
            readonly timeStamp?: Tempo.TimeStamp | undefined;
            readonly mdyLocales?: string | import("#core/shared/type.library.js").SecureArray<string> | undefined;
            readonly mdyLayouts?: import("#core/shared/type.library.js").SecureArray<Tempo.Pair> | undefined;
            readonly snippet?: string | import("#core/shared/type.library.js").SecureObject<import("#core/shared/type.library.js").Extend<{
                readonly [Token.yy]: RegExp;
                readonly [Token.mm]: RegExp;
                readonly [Token.dd]: RegExp;
                readonly [Token.hh]: RegExp;
                readonly [Token.mi]: RegExp;
                readonly [Token.ss]: RegExp;
                readonly [Token.ff]: RegExp;
                readonly [Token.mer]: RegExp;
                readonly [Token.sfx]: RegExp;
                readonly [Token.wkd]: RegExp;
                readonly [Token.tzd]: RegExp;
                readonly [Token.nbr]: RegExp;
                readonly [Token.afx]: RegExp;
                readonly [Token.mod]: RegExp;
                readonly [Token.sep]: RegExp;
                readonly [Token.unt]: RegExp;
                readonly [Token.brk]: RegExp;
            }, symbol, RegExp>> | import("#core/shared/type.library.js").SecureObject<RegExp> | import("#core/shared/type.library.js").SecureObject<Record<string | symbol, Tempo.Pattern>> | import("#core/shared/type.library.js").SecureArray<Tempo.PatternOption<Tempo.Pattern>> | undefined;
            readonly layout?: string | import("#core/shared/type.library.js").SecureObject<RegExp> | import("#core/shared/type.library.js").SecureObject<Record<string | symbol, Tempo.Pattern>> | import("#core/shared/type.library.js").SecureArray<Tempo.PatternOption<Tempo.Pattern>> | import("#core/shared/type.library.js").SecureObject<import("#core/shared/type.library.js").Extend<{
                readonly [Token.dt]: "({dd}{sep}?{mm}({sep}?{yy})?|{mod}?({evt}))";
                readonly [Token.tm]: "({hh}{mi}?{ss}?{ff}?{mer}?|{per})";
                readonly [Token.dtm]: "({dt})(?:(?:{sep}+|T)({tm}))?{tzd}?{brk}?";
                readonly [Token.
                    dmy]: "({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?";
                readonly [Token.mdy]: "({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?";
                readonly [Token.ymd]: "({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?";
                readonly [Token.wkd]: "{mod}?{wkd}{afx}?{sfx}?";
                readonly [Token.off]: "{mod}?{dd}{afx}?";
                readonly [Token.rel]: "{nbr}{sep}?{unt}{sep}?{afx}";
            }, symbol, string>> | undefined;
            readonly event?: Tempo.Logic | import("#core/shared/type.library.js").SecureObject<import("#core/shared/type.library.js").Extend<{
                readonly 'new.?years? ?eve': "31 Dec";
                readonly nye: "31 Dec";
                readonly 'new.?years?( ?day)?': "01 Jan";
                readonly ny: "01 Jan";
                readonly 'christmas ?eve': "24 Dec";
                readonly christmas: "25 Dec";
                readonly 'xmas ?eve': "24 Dec";
                readonly xmas: "25 Dec";
                readonly now: (this: any) => any;
                readonly today: (this: any) => any;
                readonly tomorrow: (this: any) => any;
                readonly yesterday: (this: any) => any;
            }, string, string | Function>> | import("#core/shared/type.library.js").SecureObject<Record<string | symbol, Tempo.Logic>> | import("#core/shared/type.library.js").SecureArray<Tempo.PatternOption<Tempo.Logic>> | undefined;
            readonly period?: Tempo.Logic | import("#core/shared/type.library.js").SecureObject<Record<string | symbol, Tempo.Logic>> | import("#core/shared/type.library.js").SecureArray<Tempo.PatternOption<Tempo.Logic>> | import("#core/shared/type.library.js").SecureObject<import("#core/shared/type.library.js").Extend<{
                readonly 'mid[ -]?night': "24:00";
                readonly morning: "8:00";
                readonly 'mid[ -]?morning': "10:00";
                readonly 'mid[ -]?day': "12:00";
                readonly noon: "12:00";
                readonly 'after[ -]?noon': "3:00pm";
                readonly evening: "18:00";
                readonly night: "20:00";
            }, string, string | Function>> | undefined;
            readonly formats?: import("#core/shared/type.library.js").SecureObject<Property<any>> | undefined;
            readonly plugins?: Tempo.Plugin | import("#core/shared/type.library.js").SecureArray<Tempo.Plugin> | undefined;
            readonly value?: string | number | bigint | import("#core/shared/type.library.js").SecureObject<Temporal.ZonedDateTime> | import("#core/shared/type.library.js").SecureObject<typeof Temporal> | import("#core/shared/type.library.js").SecureObject<Tempo> | import("#core/shared/type.library.js").SecureObject<Date> | import("#core/shared/type.library.js").SecureObject<Temporal.ZonedDateTimeLikeObject> | null | undefined;
            readonly anchor?: import("#core/shared/type.library.js").SecureObject<Temporal.ZonedDateTime> | undefined;
        }>;
        discovery: any;
        storage: {
            key: string;
            scope: string;
        } & Partial<Tempo.BaseOptions> & Record<string, any>;
        global: {
            [key: string]: any;
            /** configuration (global | local) */ scope: "global" | "local";
            /** pre-configured format strings */ formats: Tempo.Format;
            anchor: Temporal.ZonedDateTime;
            timeZone: Temporal.TimeZoneLike;
            store: string;
            discovery: string;
            debug: boolean | undefined;
            catch: boolean | undefined;
            calendar: Temporal.CalendarLike;
            locale: string;
            sphere: Tempo.COMPASS | undefined;
            timeStamp: Tempo.TimeStamp;
            plugins: Tempo.Plugin | Tempo.Plugin[];
        };
    };
    /** Creates a new `Tempo` instance. */
    static from(options?: Tempo.Options): Tempo;
    static from(tempo: Tempo.DateTime | undefined, options?: Tempo.Options): Tempo;
    static now(): bigint;
    /** static Tempo.terms getter */
    static get terms(): import("#core/shared/type.library.js").SecureArray<{
        key: string;
        scope?: string;
        description: string;
    }>;
    /** Registers a new term plugin (available on `tempo.term`). See `doc/tempo.md`. */
    static addTerm(...plugin: Tempo.TermPlugin[]): void;
    /** static Tempo properties getter */
    static get properties(): import("#core/shared/type.library.js").SecureArray<string | symbol>;
    /** Tempo initial default settings */
    static get default(): import("#core/shared/type.library.js").SecureObject<{
        readonly scope: "default";
        readonly timeZone: import("#core/shared/type.library.js").Extend<{
            readonly utc: "UTC";
            readonly gmt: "Europe/London";
            readonly est: "America/New_York";
            readonly cst: "America/Chicago";
            readonly mst: "America/Denver";
            readonly pst: "America/Los_Angeles";
            readonly aest: "Australia/Sydney";
            readonly acst: "Australia/Adelaide";
            readonly awst: "Australia/Perth";
            readonly nzt: "Pacific/Auckland";
            readonly cet: "Europe/Paris";
            readonly eet: "Europe/Helsinki";
            readonly ist: "Asia/Kolkata";
            readonly npt: "Asia/Kathmandu";
            readonly jst: "Asia/Tokyo";
        }, string, string>;
        readonly store?: string | undefined;
        readonly discovery?: string | undefined;
        readonly debug?: boolean | undefined;
        readonly catch?: boolean | undefined;
        readonly calendar?: string | import("#core/shared/type.library.js").SecureObject<Temporal.ZonedDateTime> | import("#core/shared/type.library.js").SecureObject<Temporal.PlainDate> | import("#core/shared/type.library.js").SecureObject<Temporal.PlainDateTime> | import("#core/shared/type.library.js").SecureObject<Temporal.PlainMonthDay> | import("#core/shared/type.library.js").SecureObject<Temporal.PlainYearMonth> | undefined;
        readonly locale?: string | undefined;
        readonly pivot?: number | undefined;
        readonly sphere?: Tempo.COMPASS | undefined;
        readonly timeStamp?: Tempo.TimeStamp | undefined;
        readonly mdyLocales?: string | import("#core/shared/type.library.js").SecureArray<string> | undefined;
        readonly mdyLayouts?: import("#core/shared/type.library.js").SecureArray<Tempo.Pair> | undefined;
        readonly snippet?: string | import("#core/shared/type.library.js").SecureObject<import("#core/shared/type.library.js").Extend<{
            readonly [Token.yy]: RegExp;
            readonly [Token.mm]: RegExp;
            readonly [Token.dd]: RegExp;
            readonly [Token.hh]: RegExp;
            readonly [Token.mi]: RegExp;
            readonly [Token.ss]: RegExp;
            readonly [Token.ff]: RegExp;
            readonly [Token.mer]: RegExp;
            readonly [Token.sfx]: RegExp;
            readonly [Token.wkd]: RegExp;
            readonly [Token.tzd]: RegExp;
            readonly [Token.nbr]: RegExp;
            readonly [Token.afx]: RegExp;
            readonly [Token.mod]: RegExp;
            readonly [Token.sep]: RegExp;
            readonly [Token.unt]: RegExp;
            readonly [Token.brk]: RegExp;
        }, symbol, RegExp>> | import("#core/shared/type.library.js").SecureObject<RegExp> | import("#core/shared/type.library.js").SecureObject<Record<string | symbol, Tempo.Pattern>> | import("#core/shared/type.library.js").SecureArray<Tempo.PatternOption<Tempo.Pattern>> | undefined;
        readonly layout?: string | import("#core/shared/type.library.js").SecureObject<RegExp> | import("#core/shared/type.library.js").SecureObject<Record<string | symbol, Tempo.Pattern>> | import("#core/shared/type.library.js").SecureArray<Tempo.PatternOption<Tempo.Pattern>> | import("#core/shared/type.library.js").SecureObject<import("#core/shared/type.library.js").Extend<{
            readonly [Token.dt]: "({dd}{sep}?{mm}({sep}?{yy})?|{mod}?({evt}))";
            readonly [Token.tm]: "({hh}{mi}?{ss}?{ff}?{mer}?|{per})";
            readonly [Token.dtm]: "({dt})(?:(?:{sep}+|T)({tm}))?{tzd}?{brk}?";
            readonly [Token.
                dmy]: "({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?";
            readonly [Token.mdy]: "({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?";
            readonly [Token.ymd]: "({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?";
            readonly [Token.wkd]: "{mod}?{wkd}{afx}?{sfx}?";
            readonly [Token.off]: "{mod}?{dd}{afx}?";
            readonly [Token.rel]: "{nbr}{sep}?{unt}{sep}?{afx}";
        }, symbol, string>> | undefined;
        readonly event?: Tempo.Logic | import("#core/shared/type.library.js").SecureObject<import("#core/shared/type.library.js").Extend<{
            readonly 'new.?years? ?eve': "31 Dec";
            readonly nye: "31 Dec";
            readonly 'new.?years?( ?day)?': "01 Jan";
            readonly ny: "01 Jan";
            readonly 'christmas ?eve': "24 Dec";
            readonly christmas: "25 Dec";
            readonly 'xmas ?eve': "24 Dec";
            readonly xmas: "25 Dec";
            readonly now: (this: any) => any;
            readonly today: (this: any) => any;
            readonly tomorrow: (this: any) => any;
            readonly yesterday: (this: any) => any;
        }, string, string | Function>> | import("#core/shared/type.library.js").SecureObject<Record<string | symbol, Tempo.Logic>> | import("#core/shared/type.library.js").SecureArray<Tempo.PatternOption<Tempo.Logic>> | undefined;
        readonly period?: Tempo.Logic | import("#core/shared/type.library.js").SecureObject<Record<string | symbol, Tempo.Logic>> | import("#core/shared/type.library.js").SecureArray<Tempo.PatternOption<Tempo.Logic>> | import("#core/shared/type.library.js").SecureObject<import("#core/shared/type.library.js").Extend<{
            readonly 'mid[ -]?night': "24:00";
            readonly morning: "8:00";
            readonly 'mid[ -]?morning': "10:00";
            readonly 'mid[ -]?day': "12:00";
            readonly noon: "12:00";
            readonly 'after[ -]?noon': "3:00pm";
            readonly evening: "18:00";
            readonly night: "20:00";
        }, string, string | Function>> | undefined;
        readonly formats?: import("#core/shared/type.library.js").SecureObject<Property<any>> | undefined;
        readonly plugins?: Tempo.Plugin | import("#core/shared/type.library.js").SecureArray<Tempo.Plugin> | undefined;
        readonly value?: string | number | bigint | import("#core/shared/type.library.js").SecureObject<Temporal.ZonedDateTime> | import("#core/shared/type.library.js").SecureObject<typeof Temporal> | import("#core/shared/type.library.js").SecureObject<Tempo> | import("#core/shared/type.library.js").SecureObject<Date> | import("#core/shared/type.library.js").SecureObject<Temporal.ZonedDateTimeLikeObject> | null | undefined;
        readonly anchor?: import("#core/shared/type.library.js").SecureObject<Temporal.ZonedDateTime> | undefined;
    }>;
    /**
     * configuration governing the static 'rules' used when parsing Tempo.DateTime argument
     */
    static get parse(): Tempo.Parse;
    /** iterate over Tempo properties */
    static [Symbol.iterator](): ArrayIterator<string | symbol>;
    /** allow for auto-convert of Tempo to BigInt, Number or String */
    [Symbol.toPrimitive](hint?: 'string' | 'number' | 'default'): string | number | bigint;
    /** iterate over instance formats */
    [Symbol.iterator](): ArrayIterator<import("#core/shared/type.library.js").EntryOf<enums.Formats>>;
    get [Symbol.toStringTag](): string;
    /**
     * Instantiates a new `Tempo` object.
     *
     * @param tempo - The date-time value to parse. Can be a string, number, BigInt, Date, or another Tempo/Temporal object.
     * @param options - Configuration options for this specific instance.
     */
    constructor(options?: Tempo.Options);
    constructor(tempo: Tempo.DateTime, options?: Tempo.Options);
    /** 4-digit year (e.g., 2024) */ get yy(): number;
    /** 4-digit ISO week-numbering year */ get wy(): number;
    /** Month number: Jan=1, Dec=12 */ get mm(): Tempo.mm;
    /** ISO week number of the year */ get ww(): Tempo.ww;
    /** Day of the month (1-31) */ get dd(): number;
    /** Day of the month (alias for `dd`) */ get day(): number;
    /** Hour of the day (0-23) */ get hh(): Tempo.hh;
    /** Minutes of the hour (0-59) */ get mi(): Tempo.mi;
    /** Seconds of the minute (0-59) */ get ss(): Tempo.ss;
    /** Milliseconds of the second (0-999) */ get ms(): Tempo.ms;
    /** Microseconds of the millisecond (0-999) */ get us(): Tempo.us;
    /** Nanoseconds of the microsecond (0-999) */ get ns(): Tempo.ns;
    /** Fractional seconds (e.g., 0.123456789) */ get ff(): number;
    /** IANA Time Zone ID (e.g., 'Australia/Sydney') */ get tz(): string;
    /** Unix timestamp (defaults to milliseconds) */ get ts(): number | bigint;
    /** Short month name (e.g., 'Jan') */ get mmm(): "All" | "Jan" | "Feb" | "Mar" | "Apr" | "May" | "Jun" | "Jul" | "Aug" | "Sep" | "Oct" | "Nov" | "Dec";
    /** Full month name (e.g., 'January') */ get mon(): "May" | "Every" | "January" | "February" | "March" | "April" | "June" | "July" | "August" | "September" | "October" | "November" | "December";
    /** Short weekday name (e.g., 'Mon') */ get www(): "All" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    /** Full weekday name (e.g., 'Monday') */ get wkd(): "Everyday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
    /** ISO weekday number: Mon=1, Sun=7 */ get dow(): Tempo.Weekday;
    /** Nanoseconds since Unix epoch (BigInt) */ get nano(): bigint;
    /** current Tempo configuration */
    get config(): {
        [key: string]: any;
        /** configuration (global | local) */ scope: "global" | "local";
        /** pre-configured format strings */ formats: Tempo.Format;
        anchor: Temporal.ZonedDateTime;
        timeZone: Temporal.TimeZoneLike;
        store: string;
        discovery: string;
        debug: boolean | undefined;
        catch: boolean | undefined;
        calendar: Temporal.CalendarLike;
        locale: string;
        sphere: Tempo.COMPASS | undefined;
        timeStamp: Tempo.TimeStamp;
        plugins: Tempo.Plugin | Tempo.Plugin[];
    };
    /** Instance-specific parse rules (merged with global) */ get parse(): Tempo.Parse;
    /** Object containing results from all term plugins */ get term(): Tempo.Terms;
    /** Formatted results for all pre-defined format codes */ get fmt(): enums.Formats;
    /** units since epoch */ get epoch(): import("#core/shared/type.library.js").SecureObject<{
        /** seconds since epoch */ readonly ss: number;
        /** milliseconds since epoch */ readonly ms: number;
        /** microseconds since epoch */ readonly us: number;
        /** nanoseconds since epoch */ readonly ns: bigint;
    }>;
    /** time duration until (with unit, returns number) */ until(until: Tempo.Until, opts?: Tempo.Options): number;
    /** time duration until another date-time (with unit) */ until(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, until: Tempo.Until): number;
    /** time duration until (returns Duration) */ until(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): Tempo.Duration;
    /** time elapsed since (with unit) */ since(until: Tempo.Until, opts?: Tempo.Options): string;
    /** time elapsed since another date-time (with unit) */ since(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, until: Tempo.Until): string;
    /** time elapsed since (without unit) */ since(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): string;
    /** applies a format to the instance. See `doc/tempo.md`. */ format<K extends enums.Format>(fmt: K): enums.FormatType<K>;
    /** returns a new `Tempo` with specific duration added. */ add(tempo?: Tempo.DateTime | Tempo.Options, options?: Tempo.Options): Tempo;
    /** returns a new `Tempo` with specific offsets. */ set(tempo?: Tempo.DateTime | Tempo.Options, options?: Tempo.Options): Tempo;
    /** returns a clone of the current `Tempo` instance. */ clone(): Tempo;
    /** returns the underlying Temporal.ZonedDateTime */ toDateTime(): Temporal.ZonedDateTime;
    /** returns a Temporal.PlainDate representation */ toPlainDate(): Temporal.PlainDate;
    /** returns a Temporal.PlainTime representation */ toPlainTime(): Temporal.PlainTime;
    /** returns a Temporal.PlainDateTime representation */ toPlainDateTime(): Temporal.PlainDateTime;
    /** returns the underlying Temporal.Instant */ toInstant(): Temporal.Instant;
    /** the date-time as a standard `Date` object. */ toDate(): Date;
    /** the ISO8601 string representation of the date-time. */ toString(): string;
    /** Custom JSON serialization for `JSON.stringify`. */ toJSON(): {
        value: string;
        /** configuration (global | local) */ scope: "global" | "local";
        /** pre-configured format strings */ formats: Tempo.Format;
        anchor: Temporal.ZonedDateTime;
        timeZone: Temporal.TimeZoneLike;
        store: string;
        discovery: string;
        debug: boolean | undefined;
        catch: boolean | undefined;
        calendar: Temporal.CalendarLike;
        locale: string;
        sphere: Tempo.COMPASS | undefined;
        timeStamp: Tempo.TimeStamp;
        plugins: Tempo.Plugin | Tempo.Plugin[];
    };
    /** `true` if the underlying date-time is valid. */ isValid(): boolean;
}
export declare namespace Tempo {
    /** the value that Tempo will attempt to interpret as a valid ISO date / time */
    export type DateTime = string | number | bigint | Date | Tempo | typeof Temporal | Temporal.ZonedDateTimeLike | undefined | null;
    export type Pattern = string | RegExp;
    export type Logic = string | number | Function;
    export type Pair = [string, string];
    export type Groups = Record<string, string>;
    export type Registry = Map<symbol, RegExp>;
    export type PatternOption<T> = T | Record<string | symbol, T> | PatternOption<T>[];
    /** the Options object found in a config-module, or passed to a call to Tempo.init({}) or 'new Tempo({})' */
    export interface BaseOptions {
        /** localStorage key */ store: string;
        /** globalThis Discovery Symbol */ discovery: string;
        /** additional console.log for tracking */ debug: boolean | undefined;
        /** catch or throw Errors */ catch: boolean | undefined;
        /** Temporal timeZone */ timeZone: Temporal.TimeZoneLike;
        /** Temporal calendar */ calendar: Temporal.CalendarLike;
        /** locale (e.g. en-AU) */ locale: string;
        /** pivot year for two-digit years */ pivot: number;
        /** hemisphere for term.qtr or term.szn */ sphere: Tempo.COMPASS | undefined;
        /** granularity of timestamps (ms | ns) */ timeStamp: Tempo.TimeStamp;
        /** locale-names that prefer 'mm-dd-yy' date order */ mdyLocales: string | string[];
        /** swap parse-order of layouts */ mdyLayouts: Tempo.Pair[];
        /** date-time snippets to help compose a Layout */ snippet: Snippet | Tempo.PatternOption<Tempo.Pattern>;
        /** patterns to help parse value */ layout: Layout | Tempo.PatternOption<Tempo.Pattern>;
        /** custom date aliases (events). */ event: Event | Tempo.PatternOption<Tempo.Logic>;
        /** custom time aliases (periods). */ period: Period | Tempo.PatternOption<Tempo.Logic>;
        /** custom format strings to merge in the FORMAT enum */ formats: Property<any>;
        /** plugins to be automatically Extended via Tempo.extend() */ plugins: Plugin | Plugin[];
        /** supplied value to parse */ value: Tempo.DateTime;
        /** @internal temporary anchor used during parsing */ anchor: Temporal.ZonedDateTime;
    }
    export type Options = Partial<BaseOptions> & Record<string, any>;
    /** define a new term plugin */
    export type TermPlugin = {
        key: string;
        scope?: string;
        description: string;
        define: (this: Tempo, keyOnly?: boolean) => any;
    };
    /** plugin function that can extend the Tempo prototype or static space */
    export type Plugin = (options: any, TempoClass: typeof Tempo, factory: (val: any) => Tempo) => void;
    /** internal metadata for a plugin to track installation */
    export interface PluginContainer extends Plugin {
        installed?: boolean;
    }
    /** the encapsulated state of a Tempo instance */
    export interface State {
        /** current defaults for all Tempo instances */ config: Tempo.Config;
        /** parsing rules */ parse: Tempo.Parse;
    }
    /** Debugging results of a parse operation. See `doc/tempo.api.md`. */
    export interface Parse {
        /** Locales which prefer 'mm-dd-yyyy' date-order */ mdyLocales: {
            locale: string;
            timeZones: string[];
        }[];
        /** Layout names that are switched to mdy */ mdyLayouts: Tempo.Pair[];
        /** is a timeZone that prefers 'mmddyyyy' date order */ isMonthDay?: boolean;
        /** Symbol registry */ token: Token;
        /** Tempo snippets to aid in parsing */ snippet: Snippet;
        /** Tempo layout strings */ layout: Layout;
        /** Map of regex-patterns to match input-string */ pattern: Tempo.Registry;
        /** configured Events */ event: Event;
        /** configured Periods */ period: Period;
        /** pivot year for two-digit years */ pivot?: number;
        /** parsing match result */ result: Tempo.Match[];
    }
    /** debug a Tempo instantiation */
    export interface Match {
        /** pattern which matched the input */ match?: string | undefined;
        /** groups from the pattern match */ groups?: Tempo.Groups;
        /** the type of the original input */ type: LooseUnion<Type>;
        /** the value of the original input */ value: any;
        /** was this a nested/anchored parse? */ isAnchored?: boolean;
    }
    /** drop the parse-only Options */
    type OptionsKeep = Omit<BaseOptions, "mdyLocales" | "mdyLayouts" | "pivot" | "snippet" | "layout" | "event" | "period" | "value">;
    /** Instance configuration derived from supply, storage, and discovery. */
    export interface Config extends Required<Omit<OptionsKeep, "formats">> {
        /** configuration (global | local) */ scope: 'global' | 'local';
        /** pre-configured format strings */ formats: Format;
        [key: string]: any;
    }
    /** Timestamp precision */
    export type TimeStamp = 'ss' | 'ms' | 'us' | 'ns';
    /** structured configuration for Global Discovery via Symbol.for('$Tempo') */
    export interface Discovery {
        /** pre-defined config options for Tempo.#global */ options?: Options | (() => Options);
        /** aliases to merge in the TimeZone dictionary */ timeZones?: Record<string, string>;
        /** term plugins to be registered via Tempo.addTerm() */ terms?: TermPlugin | TermPlugin[];
        /** plugins to be automatically extended via Tempo.extend() */ plugins?: Plugin | Plugin[];
        /** custom format strings to merge in the FORMAT dictionary */ formats?: Property<any>;
    }
    /** Configuration to use for #until() and #since() argument */
    export type Unit = Temporal.DateUnit | Temporal.TimeUnit | Plural<Temporal.DateUnit | Temporal.TimeUnit>;
    export type Until = (Tempo.Options & {
        unit?: Tempo.Unit;
    }) | Tempo.Unit;
    export type Mutate = 'start' | 'mid' | 'end';
    export type Set = Partial<Record<Mutate, Unit> & Record<'date' | 'time' | 'event' | 'period', string> & {
        timeZone?: Temporal.TimeZoneLike;
        calendar?: Temporal.CalendarLike;
    }>;
    export type Add = Partial<Record<Tempo.Unit, number>>;
    /** pre-configured format strings */
    export type OwnFormat = enums.OwnFormat;
    /** mapping of format names to instance-resolutions (string | number) */
    export type Formats = enums.Formats;
    /** Enum registry of format strings */
    export type Format = enums.FormatEnum;
    export type FormatType<K extends PropertyKey> = enums.FormatType<K>;
    /** mapping of terms to their resolved values */
    export type Terms = Property<any>;
    export type Modifier = '=' | '-' | '+' | '<' | '<=' | '-=' | '>' | '>=' | '+=' | 'this' | 'next' | 'prev' | 'last' | 'first' | undefined;
    export type Relative = 'ago' | 'hence' | 'prior';
    export type mm = IntRange<0, 12>;
    export type hh = IntRange<0, 24>;
    export type mi = IntRange<0, 60>;
    export type ss = IntRange<0, 60>;
    export type ms = IntRange<0, 999>;
    export type us = IntRange<0, 999>;
    export type ns = IntRange<0, 999>;
    export type ww = IntRange<1, 53>;
    export type Duration = NonOptional<Temporal.DurationLikeObject> & Record<"iso", string> & Record<"sign", number> & Record<"blank", boolean> & Record<"unit", string | undefined>;
    export type WEEKDAY = enums.WEEKDAY;
    export type WEEKDAYS = enums.WEEKDAYS;
    export type MONTH = enums.MONTH;
    export type MONTHS = enums.MONTHS;
    export type DURATION = enums.DURATION;
    export type DURATIONS = enums.DURATIONS;
    export type COMPASS = enums.COMPASS;
    export type ELEMENT = enums.ELEMENT;
    export type Weekday = enums.Weekday;
    export type Month = enums.Month;
    export type Element = enums.Element;
    /** Type for consistency in expected arguments for helper functions */
    export type Params<T> = {
        (tempo?: Tempo.DateTime, options?: Tempo.Options): T;
        (options: Tempo.Options): T;
    };
    export {};
}
type Fmt = {
    <F extends string>(fmt: F, tempo?: Tempo.DateTime, options?: Tempo.Options): enums.FormatType<F>;
    <F extends string>(fmt: F, options: Tempo.Options): enums.FormatType<F>;
};
/** check valid Tempo */ export declare const isTempo: (tempo?: unknown) => tempo is Tempo;
/** current timestamp (ts) */ export declare const getStamp: Tempo.Params<number | bigint>;
/** create new Tempo */ export declare const getTempo: Tempo.Params<Tempo>;
/** format a Tempo */ export declare const fmtTempo: Fmt;
export {};
