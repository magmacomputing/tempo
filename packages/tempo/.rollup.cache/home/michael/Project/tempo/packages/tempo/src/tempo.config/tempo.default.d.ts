import type { Tempo } from '#core/tempo.class.js';
/** common RegExp patterns */
export declare const Match: {
    /** match all {} pairs, if they start with a word char */ readonly braces: RegExp;
    /** named capture-group, if it starts with a letter */ readonly captures: RegExp;
    /** event */ readonly event: RegExp;
    /** period */ readonly period: RegExp;
    /** two digit year */ readonly twoDigit: RegExp;
    /** date */ readonly date: RegExp;
    /** time */ readonly time: RegExp;
    /** hour-minute-second with no separator */ readonly hhmiss: RegExp;
    /** separator characters (/ - . ,) */ readonly separator: RegExp;
    /** modifier characters (+-<>=) */ readonly modifier: RegExp;
    /** offset post keywords (ago|hence) */ readonly affix: RegExp;
    /** strip out these characters from a string */ readonly strips: RegExp;
    /** whitespace characters */ readonly spaces: RegExp;
    /** Z character */ readonly zed: RegExp;
};
/** Tempo Symbol registry */
export declare const Token: import("#core/shared/type.library.js").Extend<{
    /** year */ readonly yy: symbol;
    /** month */ readonly mm: symbol;
    /** day */ readonly dd: symbol;
    /** hour */ readonly hh: symbol;
    /** minute */ readonly mi: symbol;
    /** second */ readonly ss: symbol;
    /** fraction */ readonly ff: symbol;
    /** meridiem */ readonly mer: symbol;
    /** short weekday name */ readonly www: symbol;
    /** relative-suffix */ readonly afx: symbol;
    /** time-suffix */ readonly sfx: symbol;
    /** time unit */ readonly unt: symbol;
    /** separator */ readonly sep: symbol;
    /** modifier */ readonly mod: symbol;
    /** generic number */ readonly nbr: symbol;
    /** Tempo event */ readonly evt: symbol;
    /** Tempo period */ readonly per: symbol;
    /** time zone offset */ readonly tzd: symbol;
    /** date */ readonly dt: symbol;
    /** time */ readonly tm: symbol;
    /** date and time */ readonly dtm: symbol;
    /** day-month-year */ readonly dmy: symbol;
    /** month-day-year */ readonly mdy: symbol;
    /** year-month-day */ readonly ymd: symbol;
    /** day of month offset */ readonly off: symbol;
    /** weekDay */ readonly wkd: symbol;
    /** relative offset (years, days, hours, etc) */ readonly rel: symbol;
    /** timezone/calendar brackets */ readonly brk: symbol;
}, string, symbol>;
export type Token = typeof Token;
/**
 * user will need to know these in order to configure their own patterns
 * Tempo.Snippet is a simple regex pattern object						e.g. { Symbol('yy'): /(([0-9]{2})?[0-9]{2})/ }
 * Tempo.Layout is a string-combination of Snippet names		e.g. '{yy}{sep}{mm}({sep}{dd})?{sfx}?'
 * Tempo.Pattern is a translation of a Layout/Snippets into an anchored regex.
 * The {pattern} is used to parse a string | number in the Tempo constructor {DateTime} argument
 */
/**
 * a {snippet} is a simple, reusable regex pattern for a component of a date-time string (e.g. 'hh' or 'yy')
 */
export declare const Snippet: import("#core/shared/type.library.js").Extend<{
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
}, symbol, RegExp>;
export type Snippet = typeof Snippet;
/**
 * a {layout} is a Record of snippet-combinations describing an input DateTime argument
 * the Layout's keys are in the order that they will be checked against an input value
 */
export declare const Layout: import("#core/shared/type.library.js").Extend<{
    readonly [Token.dt]: "({dd}{sep}?{mm}({sep}?{yy})?|{mod}?({evt}))";
    readonly [Token.tm]: "({hh}{mi}?{ss}?{ff}?{mer}?|{per})";
    readonly [Token.dtm]: "({dt})(?:(?:{sep}+|T)({tm}))?{tzd}?{brk}?";
    readonly [Token.dmy]: "({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?";
    readonly [Token.mdy]: "({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?";
    readonly [Token.ymd]: "({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?";
    readonly [Token.wkd]: "{mod}?{wkd}{afx}?{sfx}?";
    readonly [Token.off]: "{mod}?{dd}{afx}?";
    readonly [Token.rel]: "{nbr}{sep}?{unt}{sep}?{afx}";
}, symbol, string>;
export type Layout = typeof Layout;
/**
 * an {event} is a Record of regex-pattern-like-string keys that describe Date strings.
 * values can be a string or a function.
 * if assigning a function, use standard 'function()' syntax to allow for 'this' binding.
 * also, a function should always have a .toString() method which returns a parse-able Date string
 */
export declare const Event: import("#core/shared/type.library.js").Extend<{
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
}, string, string | Function>;
export type Event = typeof Event;
/**
 * a {period} is a Record of regex-pattern-like keys that describe pre-defined Time strings.
 * values can be a string or a function.
 * if using a function, use regular 'function()' syntax to allow for 'this' binding.
 */
export declare const Period: import("#core/shared/type.library.js").Extend<{
    readonly 'mid[ -]?night': "24:00";
    readonly morning: "8:00";
    readonly 'mid[ -]?morning': "10:00";
    readonly 'mid[ -]?day': "12:00";
    readonly noon: "12:00";
    readonly 'after[ -]?noon': "3:00pm";
    readonly evening: "18:00";
    readonly night: "20:00";
}, string, string | Function>;
export type Period = typeof Period;
/**
 * a {timeZone} alias dictionary mapping common abbreviations to IANA strings.
 * Tempo will check this registry to convert abbreviations before passing them to Temporal.
 */
export declare const TimeZone: import("#core/shared/type.library.js").Extend<{
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
export type TimeZone = typeof TimeZone;
/** Reasonable default options for initial Tempo config */
export declare const Default: import("#core/shared/type.library.js").SecureObject<Tempo.Options>;
