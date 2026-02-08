import { patBigInt, patRegExp } from '#core/shared/pattern.library.js';
import type { Tempo } from '#core/shared/tempo.class.js';
import type { Extend } from '#core/shared/type.library.js';

// #region local const variables ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/** common RegExp patterns */
export const Match = {
	/** string that looks like a BigInt */										bigint: patBigInt,
	/** string that looks like a RegExp */										regexp: patRegExp,
	/** match all {} pairs */																	braces: /{([^}]+)}/g,
	/** event */																							event: /^evt\d+$/,
	/** period */																							period: /^per\d+$/,
	/** two digit year */																			twoDigits: /^\d{2}$/,
	/** hour-minute-second with no separator */								hhmiss: /(hh)(m[i|m])(ss)?/i,
	/** separator characters (/ - . ,) */											separators: /[\/\-\.\s,]/,
	/** modifier characters (+-<>=) */												modifiers: /[\+\-\<\>][\=]?|this|next|prev|first|last/,
} as const

/** Tempo Symbol registry */
const $Token = {
	// Snippet Symbols ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/** year */																								yy: Symbol('yy'),
	/** month */																							mm: Symbol('mm'),
	/** day */																								dd: Symbol('dd'),
	/** hour */																								hh: Symbol('hh'),
	/** minute */																							mi: Symbol('mi'),
	/** second */																							ss: Symbol('ss'),
	/** fraction */																						ff: Symbol('ff'),
	/** meridiem */																						mer: Symbol('mer'),
	/** short weekday name */																	www: Symbol('www'),
	/** weekday-suffix */																			afx: Symbol('afx'),
	/** time-suffix */																				sfx: Symbol('sfx'),
	/** separator */																					sep: Symbol('sep'),
	/** modifier */																						mod: Symbol('mod'),
	/** time zone offset */																		tzd: Symbol('tzd'),
// Layout Symbols ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/** date */																								dt: Symbol('date'),
	/** time */																								tm: Symbol('time'),
	/** date and time */																			dtm: Symbol('dateTime'),
	/** day-month-year */																			dmy: Symbol('dayMonthYear'),
	/** month-day-year */																			mdy: Symbol('monthDayYear'),
	/** year-month-day */																			ymd: Symbol('yearMonthDay'),
	/** weekday */																						wkd: Symbol('weekday'),
	/** Tempo event */																				evt: Symbol('event'),
	/** Tempo period */																				per: Symbol('period'),
} as const
export const Token = $Token as Extend<typeof $Token, string, symbol>
export type Token = typeof Token

/**
 * user will need to know these in order to configure their own patterns  
 * Tempo.Snippet is a simple regex pattern		, e.g. { yy: /(\d{2})?\d{2})/ }    
 * Tempo.Layout is a string-combination of Snippet names	, e.g. '{yy}{sep}{mm}({sep}{dd})?{sfx}?'  
 * Tempo.Pattern converts a Layout into an anchored regex, used to parse a string | number in the Tempo constructor {DateTime} argument\
 */
const $Snippet = {																					// define some snippets to help interpret input-strings
	[Token.yy]: /(?<yy>(\d{2})?\d{2})/,												// arbitrary upper-limit of yy=9999
	[Token.mm]: /(?<mm>[0\s]?[1-9]|1[0-2]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/,	// month-name (abbrev or full) or month-number 01-12
	[Token.dd]: /(?<dd>[0\s]?[1-9]|[12][0-9]|3[01])/,					// day-number 01-31
	[Token.www]: /(?<wkd>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)/,//day-name (abbrev or full)
	[Token.hh]: /(?<hh>2[0-4]|[01]?\d)/,											// hour-number 00-24
	[Token.mi]: /(\:(?<mi>[0-5]\d))/,													// minute-number 00-59
	[Token.ss]: /(\:(?<ss>[0-5]\d))/,													// seconds-number 00-59
	[Token.ff]: /(\.(?<ff>\d{1,9}))/,													// fractional-seconds up-to 9-digits
	[Token.mer]: /(\s*(?<mer>am|pm))/,												// meridiem suffix (am,pm)
	[Token.sfx]: /((?:[\s,T])({tm}))/,												// time-pattern suffix "T {tm}"
	[Token.afx]: new RegExp(`((s)? (?<afx>ago|hence))?(?:${Match.separators.source})*`),// affix optional plural 's' and (ago|hence) to weekday
	[Token.sep]: new RegExp(`(?<sep>${Match.separators.source})`),	// date-pattern separator character "/\\-., "
	[Token.mod]: new RegExp(`((?<mod>${Match.modifiers.source})?(?<cnt>\\d*)\\s*)`),	// modifier (+,-,<,<=,>,>=) plus optional offset-count
	// Note: computed Components ('dt', 'tm', 'evt', 'per', 'tzd') are added during 'Tempo.init()' (for static) and/or 'new Tempo()' (for instance)
	// [Sym.dt]: new RegExp(''),																	// date and events
	// [Sym.tm]: new RegExp(''),																	// time and periods
	// [Sym.evt]: new RegExp(''),																// events
	// [Sym.per]: new RegExp(''),																// periods
	// [Sym.tzd]: new RegExp(''),																// time zone offset
} as const
export const Snippet = $Snippet as Extend<typeof $Snippet, symbol, RegExp>
export type Snippet = typeof Snippet

/**
 * a {layout} is a Record of snippet-combinations describing an input DateTime argument  
 * the Layout's keys are in the order that they will be checked against an input value  
 */
const $Layout = {
	[Token.dt]: '{dd}{sep}?{mm}({sep}?{yy})?|{mod}?({evt})',		// calendar or event
	[Token.tm]: '{hh}{mi}?{ss}?{ff}?{mer}?|{per}',							// clock or period 
	[Token.wkd]: '{mod}?{wkd}{afx}?{sfx}?',											// special layout (no {dt}!) used for weekday calcs (only one that requires {wkd} pattern)
	[Token.dtm]: '({dt}){sfx}?',																// calendar/event and clock/period
	[Token.dmy]: '{wkd}?{dd}{sep}?{mm}({sep}{yy})?{sfx}?',			// day-month(-year)
	[Token.mdy]: '{wkd}?{mm}{sep}?{dd}({sep}{yy})?{sfx}?',			// month-day(-year)
	[Token.ymd]: '{wkd}?{yy}{sep}?{mm}({sep}{dd})?{sfx}?',			// year-month(-day)
	[Token.evt]: '{evt}',																				// event component only
	[Token.per]: '{per}',																				// period component only
} as const
export const Layout = $Layout as Extend<typeof $Layout, symbol, string>
export type Layout = typeof Layout

/** an {event} is a Record of regex-pattern-like keys that describe pre-defined Date strings */
const $Event = {
	'new.?years? ?eve': '31 Dec',
	'nye': '31 Dec',
	'new.?years?( ?day)?': '01 Jan',
	'ny': '01 Jan',
	'christmas ?eve': '24 Dec',
	'christmas': '25 Dec',
	'xmas ?eve': '24 Dec',
	'xmas': '25 Dec',
} as const
export const Event = $Event as Extend<typeof $Event, string, string>
export type Event = typeof Event

/** a {period} is a Record of regex-pattern-like keys that describe pre-defined Time strings */
const $Period = {
	'mid[ -]?night': '24:00',
	'morning': '8:00',
	'mid[ -]?morning': '10:00',
	'mid[ -]?day': '12:00',
	'noon': '12:00',
	'after[ -]?noon': '3:00pm',
	'evening': '18:00',
	'night': '20:00',
} as const
export const Period = $Period as Extend<typeof $Period, string, string>
export type Period = typeof Period

/** Reasonable default options for initial Tempo config */
export const Default = {
	/** log to console */																			debug: false,
	/** catch or throw Errors */															catch: false,
	/** used to parse two-digit years*/												pivot: 75,										/** @link https://en.wikipedia.org/wiki/Date_windowing */
	/** precision to measure timestamps (ms | us) */					timeStamp: 'ms',
	/** calendaring system */																	calendar: 'iso8601',
	/** locales that prefer month-day order */								monthDay: ['en-US', 'en-AS'],	/** @link https://en.wikipedia.org/wiki/Date_format_by_country */
	/** layouts that need to swap parse-order */							swap: [['dayMonthYear', 'monthDayYear']],
	/** date-time snippets */																	snippet: Snippet,
	/** used to parse dateTime formats */											layout: Layout,
	/** used to parse Date strings */													event: Event,
	/** used to parse Time strings */													period: Period,
	/** internal symbols */																		token: Token,
} as Tempo.Options

// #endregion
