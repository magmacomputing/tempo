import { looseIndex } from '#core/shared/object.library.js';
import { secure } from '#core/shared/utility.library.js';
// BE VERY CAREFUL NOT TO BREAK THE REGEXP PATTERNS BELOW
// TEMPO functionality heavily depends on these patterns
/** common RegExp patterns */
export const Match = {
    /** match all {} pairs, if they start with a word char */ braces: /{([\w]+(?:\.[\w]+)*)}/g,
    /** named capture-group, if it starts with a letter */ captures: /\(\?<([a-zA-Z][\w]*)>(.*?)(?<!\\)\)/g,
    /** event */ event: /^(g|l)evt[0-9]+$/,
    /** period */ period: /^(g|l)per[0-9]+$/,
    /** two digit year */ twoDigit: /^[0-9]{2}$/,
    /** date */ date: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
    /** time */ time: /^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$/,
    /** hour-minute-second with no separator */ hhmiss: /(hh)(m[i|m])(ss)?/i,
    /** separator characters (/ - . ,) */ separator: /[\/\-\.\s,]/,
    /** modifier characters (+-<>=) */ modifier: /[\+\-\<\>][\=]?|this|next|prev|last/,
    /** offset post keywords (ago|hence) */ affix: /ago|hence/,
    /** strip out these characters from a string */ strips: /\(|\)/g,
    /** whitespace characters */ spaces: /\s+/g,
    /** Z character */ zed: /^Z$/,
};
/** Tempo Symbol registry */
export const Token = looseIndex()({
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Snippet Symbols
    /** year */ yy: Symbol('yy'),
    /** month */ mm: Symbol('mm'),
    /** day */ dd: Symbol('dd'),
    /** hour */ hh: Symbol('hh'),
    /** minute */ mi: Symbol('mi'),
    /** second */ ss: Symbol('ss'),
    /** fraction */ ff: Symbol('ff'),
    /** meridiem */ mer: Symbol('mer'),
    /** short weekday name */ www: Symbol('www'),
    /** relative-suffix */ afx: Symbol('afx'),
    /** time-suffix */ sfx: Symbol('sfx'),
    /** time unit */ unt: Symbol('unt'),
    /** separator */ sep: Symbol('sep'),
    /** modifier */ mod: Symbol('mod'),
    /** generic number */ nbr: Symbol('nbr'),
    /** Tempo event */ evt: Symbol('evt'),
    /** Tempo period */ per: Symbol('per'),
    /** time zone offset */ tzd: Symbol('tzd'),
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Layout Symbols
    /** date */ dt: Symbol('date'),
    /** time */ tm: Symbol('time'),
    /** date and time */ dtm: Symbol('dateTime'),
    /** day-month-year */ dmy: Symbol('dayMonthYear'),
    /** month-day-year */ mdy: Symbol('monthDayYear'),
    /** year-month-day */ ymd: Symbol('yearMonthDay'),
    /** day of month offset */ off: Symbol('offset'),
    /** weekDay */ wkd: Symbol('weekDay'),
    /** relative offset (years, days, hours, etc) */ rel: Symbol('relativeOffset'),
    /** timezone/calendar brackets */ brk: Symbol('brackets'),
});
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
// Note: computed Components ('evt', 'per') are added during 'Tempo.init()' (for static) and/or 'new Tempo()' (per instance)
export const Snippet = looseIndex()({
    [Token.yy]: /(?<yy>([0-9]{2})?[0-9]{2})/, // arbitrary upper-limit of yy=9999
    [Token.mm]: /(?<mm>[0\s]?[1-9]|1[0-2]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/, // month-name (abbrev or full) or month-number 01-12
    [Token.dd]: /(?<dd>[0\s]?[1-9]|[12][0-9]|3[01])(?:\s?(?:st|nd|rd|th))?/, // day-number 01-31
    [Token.hh]: /(?<hh>2[0-4]|[01]?[0-9])/, // hour-number 00-24
    [Token.mi]: /(\:(?<mi>[0-5][0-9]))/, // minute-number 00-59
    [Token.ss]: /(\:(?<ss>[0-5][0-9]))/, // seconds-number 00-59
    [Token.ff]: /(\.(?<ff>[0-9]{1,9}))/, // fractional-seconds up-to 9-digits
    [Token.mer]: /(\s*(?<mer>am|pm))/, // meridiem suffix (am,pm)
    [Token.sfx]: /((?:{sep}+|T)({tm}){tzd}?)/, // time-pattern suffix 'T {tm} Z'
    [Token.wkd]: /(?<wkd>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)/, // day-name (abbrev or full)
    [Token.tzd]: /(?<tzd>Z|(?:\+(?:(?:0[0-9]|1[0-3]):?[0-5][0-9]|14:00)|-(?:(?:0[0-9]|1[0-1]):?[0-5][0-9]|12:00)))/, // time-zone offset	+14:00 to -12:00
    [Token.nbr]: /(?<nbr>[0-9]*)/, // modifier count
    [Token.afx]: new RegExp(`((s)? (?<afx>${Match.affix.source}))?{sep}?`), // affix optional plural 's' and (ago|hence)
    [Token.mod]: new RegExp(`((?<mod>${Match.modifier.source})?{nbr} *)`), // modifier (+,-,<,<=,>,>=) plus optional offset-count
    [Token.sep]: new RegExp(`(?:${Match.separator.source})`), // date-input separator character "/\\-., " (non-capture group)
    [Token.unt]: /(?<unt>year|month|week|day|hour|minute|second|millisecond)(?:s)?/, // useful for '2 days ago' etc
    [Token.brk]: /(\[(?<brk>[^\]]+)\](?:\[(?<cal>[^\]]+)\])?)?/, // timezone/calendar brackets [...]
});
/**
 * a {layout} is a Record of snippet-combinations describing an input DateTime argument
 * the Layout's keys are in the order that they will be checked against an input value
 */
export const Layout = looseIndex()({
    [Token.dt]: '({dd}{sep}?{mm}({sep}?{yy})?|{mod}?({evt}))', // calendar or event
    [Token.tm]: '({hh}{mi}?{ss}?{ff}?{mer}?|{per})', // clock or period
    [Token.dtm]: '({dt})(?:(?:{sep}+|T)({tm}))?{tzd}?{brk}?', // calendar/event and clock/period
    [Token.dmy]: '({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?', // day-month(-year)
    [Token.mdy]: '({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?', // month-day(-year)
    [Token.ymd]: '({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?', // year-month(-day)
    [Token.wkd]: '{mod}?{wkd}{afx}?{sfx}?', // special layout (no {dt}!) used for weekday calcs (only one that requires {wkd} pattern)
    [Token.off]: '{mod}?{dd}{afx}?', // day of month, with optional offset
    [Token.rel]: '{nbr}{sep}?{unt}{sep}?{afx}', // relative duration (e.g. 2 days ago)
});
/**
 * an {event} is a Record of regex-pattern-like-string keys that describe Date strings.
 * values can be a string or a function.
 * if assigning a function, use standard 'function()' syntax to allow for 'this' binding.
 * also, a function should always have a .toString() method which returns a parse-able Date string
 */
export const Event = looseIndex()({
    'new.?years? ?eve': '31 Dec',
    'nye': '31 Dec',
    'new.?years?( ?day)?': '01 Jan',
    'ny': '01 Jan',
    'christmas ?eve': '24 Dec',
    'christmas': '25 Dec',
    'xmas ?eve': '24 Dec',
    'xmas': '25 Dec',
    'now': function () { return this.toPlainDateTime(); },
    'today': function () { return this.toPlainDate(); },
    'tomorrow': function () { return this.toPlainDate().add({ days: 1 }); },
    'yesterday': function () { return this.toPlainDate().add({ days: -1 }); },
});
/**
 * a {period} is a Record of regex-pattern-like keys that describe pre-defined Time strings.
 * values can be a string or a function.
 * if using a function, use regular 'function()' syntax to allow for 'this' binding.
 */
export const Period = looseIndex()({
    'mid[ -]?night': '24:00',
    'morning': '8:00',
    'mid[ -]?morning': '10:00',
    'mid[ -]?day': '12:00',
    'noon': '12:00',
    'after[ -]?noon': '3:00pm',
    'evening': '18:00',
    'night': '20:00',
});
/**
 * a {timeZone} alias dictionary mapping common abbreviations to IANA strings.
 * Tempo will check this registry to convert abbreviations before passing them to Temporal.
 */
export const TimeZone = looseIndex()({
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
});
/** Reasonable default options for initial Tempo config */
export const Default = secure({
    /** log to console */ debug: false,
    /** catch or throw Errors */ catch: false,
    /** used to parse two-digit years*/ pivot: 75, /** @link https://en.wikipedia.org/wiki/Date_windowing */
    /** precision to measure timestamps (ms | us) */ timeStamp: 'ms',
    /** calendaring system */ calendar: 'iso8601',
    /** locales that prefer month-day order */ mdyLocales: ['en-US', 'en-AS'], /** @link https://en.wikipedia.org/wiki/Date_format_by_country */
    /** layouts that need to swap parse-order */ mdyLayouts: [['dayMonthYear', 'monthDayYear']],
});
//# sourceMappingURL=tempo.default.js.map