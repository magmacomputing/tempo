import { secure } from '#core/shared/reflection.library.js';
import type { Tempo } from '#core/shared/tempo.class.js';

// #region local const variables ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const VERSION = '0.2.0';																		// semantic version
const STORAGEKEY = '_Tempo_';																// for stash in persistent storage

/** common RegExp patterns */
export const Match = secure({
	/** string that looks like a BigInt */										bigint: /^\d+n$/,
	/** string that looks like a RegExp */										regexp: /^\/.*\/[a-zA-Z]+$/,
	/** match all {} pairs */																	braces: /{([^}]+)}/g,
	/** event */																							event: /^evt\d+$/,
	/** period */																							period: /^per\d+$/,
	/** two digit year */																			twoDigits: /^\d{2}$/,
	/** year-term */																					yearTerm: /(?<yy>yy).?#(?<term>\w+)/,
	/** hour-minute-second with no separator */								hhmiss: /(hh)(m[i|m])(ss)?/i,
	/** separator characters (/-. ,) */												separators: /[\/\-\.\s,]/,
	/** modifier characters (+-<>=) */												modifiers: /[\+\-\<\>][\=]?/,
})

/** Tempo Symbol registry */
export const Sym = secure({
	/** date pattern */																				dt: Symbol('date'),
	/** time pattern */																				tm: Symbol('time'),
	/** date and time pattern */															dtm: Symbol('dateTime'),
	/** day-month-year pattern */															dmy: Symbol('dayMonthYear'),
	/** month-day-year pattern */															mdy: Symbol('monthDayYear'),
	/** year-month-day pattern */															ymd: Symbol('yearMonthDay'),
	/** day-of-week pattern */																dow: Symbol('dayOfWeek'),
	/** Tempo event pattern */																evt: Symbol('event'),
	/** Tempo period pattern */																per: Symbol('period'),
	/** Tempo term (zodiac) */																zdc: Symbol('zodiac'),
	/** Tempo term (season) */																szn: Symbol('season'),
	/** Tempo term (quarter) */																qtr: Symbol('quarter'),
})

/**
 * user will need to know these in order to configure their own patterns  
 * Tempo.Unit is a simple regex	snippet													, e.g. { yy: /(\d{2})?\d{2})/ }    
 * Tempo.Layout is translated into an anchored regex {pattern}	, e.g. Map([[ Symbol('ymd'), /^{yy}{mm}{dd}?$/ ]])    
 * {pattern} will be used to parse a string | number in the constructor {DateTime} argument    
 */
export const Unit = secure({																				// define some components to help interpret input-strings
	/** arbitrary upper-limit of yy=9999 */										yy: /(?<yy>(\d{2})?\d{2})/,
	/** month-name (abbrev or full) or month-number 01-12 */	mm: /(?<mm>[0\s]?[1-9]|1[0-2]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/,
	/** day-number 00-31 */																		dd: /(?<dd>[0\s]?[1-9]|[12][0-9]|3[01])/,
	/** day-name (abbrev or full) */													dow: /((?<dow>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)(?:[\/\-\s\,])*)/,
	/** hour-number 00-24 */																	hh: /(?<hh>2[0-4]|[01]?\d)/,
	/** minute-number 00-59 */																mi: /(\:(?<mi>[0-5]\d))/,
	/** seconds-number 00-59 */																ss: /(\:(?<ss>[0-5]\d))/,
	/** fractional-seconds up-to 9-digits */									ff: /(\.(?<ff>\d{1,9}))/,
	/** meridiem suffix (am,pm) */														mer: /(\s*(?<mer>am|pm))/,
	/** time-component suffix "T {tm}*/												sfx: /((?:[\s,T])({tm}))/,
	/** date-component separator character "/\\-., " */				sep: new RegExp(`(?<sep>${Match.separators.source})`),
	/** modifier (+,-,<,<=,>,>=) plus optional offset-count */mod: new RegExp(`((?<mod>${Match.modifiers.source})?(?<cnt>\d*)\s*)`),
})
// Note: computed Units ('tm', 'dt', 'evt', 'per') are added during 'Tempo.init()' and 'new Tempo()'

/** a {layout} is a combination of {unit}-codes describing an expected DateTime format */
export const Layout = secure([
	[Sym.dow, '{mod}?{dow}{sfx}?'],														// special layout (no {dt}!) used for day-of-week calcs (only one that requires {dow} unit)
	[Sym.dt, '{dt}'],																					// calendar or event
	[Sym.tm, '{tm}'],																					// clock or period
	[Sym.dtm, '({dt}){sfx}?'],																// calendar/event and clock/period
	[Sym.dmy, '{dow}?{dd}{sep}?{mm}({sep}{yy})?{sfx}?'],			// day-month(-year)
	[Sym.mdy, '{dow}?{mm}{sep}?{dd}({sep}{yy})?{sfx}?'],			// month-day(-year)
	[Sym.ymd, '{dow}?{yy}{sep}?{mm}({sep}{dd})?{sfx}?'],			// year-month(-day)
	[Sym.evt, '{evt}'],																				// event only
	[Sym.per, '{per}'],																				// period only
]) as [symbol, string][]

/** Tempo.Event is a Tuple of regex-patterns that describe pre-defined Date strings */
export const Event = secure([
	['new.?years? ?eve', '31 Dec'],
	['nye', '31 Dec'],
	['new.?years?( ?day)?', '01 Jan'],
	['ny', '01 Jan'],
	['christmas ?eve', '24 Dec'],
	['christmas', '25 Dec'],
	['xmas ?eve', '24 Dec'],
	['xmas', '25 Dec'],
]) as [string, string][]

/** Tempo.Period is a Tuple of regex-patterns that describe pre-defined Time strings */
export const Period = secure([
	['mid[ -]?night', '24:00'],
	['morning', '8:00'],
	['mid[ -]?morning', '10:00'],
	['mid[ -]?day', '12:00'],
	['noon', '12:00'],
	['after[ -]?noon', '3:00pm'],
	['evening', '18:00'],
	['night', '20:00'],
]) as [string, string][]

/** Reasonable default options for initial Tempo config */
export const Default = secure({
	version: VERSION,
	key: STORAGEKEY,
	debug: false,
	catch: false,
	pivot: 75,																								/** @link https://en.wikipedia.org/wiki/Date_windowing */
	timeStamp: 'ms',
	calendar: 'iso8601',
	sphere: 'north',
	monthDay: ['en-US', 'en-AS'],															/** @link https://en.wikipedia.org/wiki/Date_format_by_country */
	layout: new Map(Layout),
	event: [...Event],
	period: [...Period],
} as Tempo.Options)

// #endregion