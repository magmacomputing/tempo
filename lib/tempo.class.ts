// #region library modules~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { Pledge } from '@module/shared/pledge.class.js';
import { asArray, sortInsert } from '@module/shared/array.library.js';
import { enumKeys } from '@module/shared/enum.library.js';
import { enumify } from '@module/shared/enum.class.js';
import { cloneify } from '@module/shared/serialize.library.js';
import { getAccessors } from '@module/shared/object.library.js';
import { getStore, setStore } from '@module/shared/storage.library.js';
import { allEntries, omit, purge } from '@module/shared/reflect.library.js';
import { getContext, CONTEXT, sleep } from '@module/shared/utility.library.js';
import { asNumber, asInteger, isNumeric, ifNumeric } from '@module/shared/number.library.js';
import { asString, pad, singular, toProperCase, trimAll, sprintf } from '@module/shared/string.library.js';
import { asType, getType, isType, isEmpty, isNull, isNullish, isDefined, isUndefined, isString, isNumber, isObject, isRegExp } from '@module/shared/type.library.js';

import type { Enum } from '@module/shared/enum.class.js';
import type { Logger } from '@module/shared/logger.library.js';
import type { Entries, Types } from '@module/shared/type.library.js';

import '@module/shared/prototype.library.js';								// patch prototype

/** TODO: THIS IMPORT NEEDS TO BE REMOVED ONCE TEMPORAL IS SUPPORTED IN JAVASCRIPT RUNTIME */
import 'temporal-polyfill/global';
// import { Temporal } from '@js-temporal/polyfill';
// #endregion

/**
 * TODO: Localization options on output?  on input?  
 * this affects month-names, day-names !  
 */

// #region Const variables ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const VERSION = '0.1.0';																		// semantic version
const STORAGEKEY = '_Tempo_';																// for stash in persistent storage

/**
 * user will need to know these in order to configure their own patterns  
 * a {unit} is a simple regex	Object												e.g. { yy: /(\d{2})?\d{2})/ }  
 * {unit} keys are combined to build a {layout} Map					e.g. Map([[ Symbol('ymd'): '{yy}{mm}{dd}?' ]]    
 * {layout}s are translated into a regex {pattern} Map			e.g. Map([[ Symbol('ymd'), /^ ... $/ ]])    
 * the {pattern} will be used to parse a string | number in the constructor {DateTime} argument    
 */
const Units = {																							// define some components to help interpret input-strings
	yy: /(?<yy>(\d{2})?\d{2})/,																// arbitrary upper-limit of yy=9999
	mm: /(?<mm>[0\s]?[1-9]|1[0-2]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/,
	dd: /(?<dd>[0\s]?[1-9]|[12][0-9]|3[01])/,
	dow: /((?<dow>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)(?:[\/\-\s\,])*)/,
	hh: /(?<hh>2[0-4]|[01]?\d)/,															// hh:  00 - 24
	mi: /(\:(?<mi>[0-5]\d))/,																	// mi:  00 - 59
	ss: /(\:(?<ss>[0-5]\d))/,																	// ss:	00 - 59
	ff: /(\.(?<ff>\d{1,9}))/,																	// up-to 9-digits for fractional seconds
	mer: /(\s*(?<mer>am|pm))/,																// meridian am/pm suffix
	sep: /(?<sep>[\/\\\-\.\s,])/,															// date-component separator character
	sfx: /((?:[\s,T])({tm}))/,																// time-component as a suffix to another {layout}
	mod: /((?<mod>[\+\-\<\>][\=]?)?(?<cnt>\d*)\s*)/,					// modifiers (+,-,<,<=,>,>=) plus optional offset-count
} as Internal.Regexp
// Note: computed Units ('tm', 'dt', 'evt', 'per') are added during 'Tempo.init()' and 'new Tempo()'

/** Tempo Symbol registry */
const Sym = {
	dt: Symbol('date'),
	tm: Symbol('time'),
	dtm: Symbol('dateTime'),
	dmy: Symbol('dayMonthYear'),
	mdy: Symbol('monthDayYear'),
	ymd: Symbol('yearMonthDay'),
	dow: Symbol('dayOfWeek'),
	evt: Symbol('event'),
	per: Symbol('period'),
	zdc: Symbol('zodiac'),
	szn: Symbol('season'),
	qtr: Symbol('quarter'),
} as Internal.Symbol;

/** Reasonable defaults for initial Tempo options */
const Default = {
	version: VERSION,
	pivot: 75,																								// to assist in translating two-digit years into four-digit: https://en.wikipedia.org/wiki/Date_windowing
	catch: false,																							// catch Errors
	debug: false,																							// console.log
	timeStamp: 'ms',																					// precision to measure timestamps
	calendar: 'iso8601',
	sphere: 'north',																					// hemisphere (used to infer {term[@@qtr]}, {term[@@szn]} )
	monthDay: ['en-US', 'en-AS'],															// array of Locales that prefer 'mm-dd-yy' date order: https://en.wikipedia.org/wiki/Date_format_by_country
	terms: {																									// built-in terms ( are setup in init() )
		[Sym.zdc]: new Map(),																		// 12 Zodiac star-signs
		[Sym.szn]: new Map(),																		// 4 Seasons
		[Sym.qtr]: new Map(),																		// 4 Fiscal Quarters
	},
	layout: new Map([																					// built-in layouts to be checked, and in this order
		[Sym.dow, '{mod}?{dow}{sfx}?'],													// special layout (no {dt}!) used for day-of-week calcs (only one that requires {dow} unit)
		[Sym.dt, '{dt}'],																				// calendar or event
		[Sym.tm, '{tm}'],																				// clock or period
		[Sym.dtm, '({dt}){sfx}?'],															// calendar/event and clock/period
		[Sym.dmy, '{dow}?{dd}{sep}?{mm}({sep}{yy})?{sfx}?'],
		[Sym.mdy, '{dow}?{mm}{sep}?{dd}({sep}{yy})?{sfx}?'],
		[Sym.ymd, '{dow}?{yy}{sep}?{mm}({sep}{dd})?{sfx}?'],
		[Sym.evt, '{evt}'],																			// event only
		[Sym.per, '{per}'],																			// period only
	]),
	event: [																									// built-in events to be mapped to a date
		['new.?years? ?eve', '31 Dec'],
		['nye', '31 Dec'],
		['new.?years?( ?day)?', '01 Jan'],
		['ny', '01 Jan'],
		['christmas ?eve', '24 Dec'],
		['christmas', '25 Dec'],
		['xmas ?eve', '24 Dec'],
		['xmas', '25 Dec'],
	],
	period: [																									// built-in periods to be mapped to a time
		['mid[ -]?night', '24:00'],
		['morning', '8:00'],
		['mid[ -]?morning', '10:00'],
		['mid[ -]?day', '12:00'],
		['noon', '12:00'],
		['after[ -]?noon', '3:00pm'],
		['evening', '18:00'],
		['night', '20:00'],
	],
} as Tempo.Options

const Match = {																							// some common RegExp patterns
	/** string that looks like a BigInt */										bigint: /^\d+n$/,
	/** string that looks like a RegExp */										regexp: /^\/.*\/$/,
	/** match all {} pairs */																	braces: /{([^}]+)}/g,
	/** event */																							event: /^evt\d+$/,
	/** period */																							period: /^per\d+$/,
	/** two digit year */																			twoDigit: /^\d{2}$/,
	/** year-term */																					yearTerm: /(?<yy>yy).?#(?<term>\w+)/,
} as const

const Zodiac: Tempo.TermTuple[] = [												// https://www.calendar.best/zodiac-signs.html
	['Aries', { order: 1, day: 21, month: 3, symbol: 'Ram', longitude: 0, planet: 'Mars' }],
	['Taurus', { order: 2, day: 20, month: 4, symbol: 'Bull', longitude: 30, planet: 'Venus' }],
	['Gemini', { order: 3, day: 21, month: 5, symbol: 'Twins', longitude: 60, planet: 'Mercury' }],
	['Cancer', { order: 4, day: 22, month: 6, symbol: 'Crab', longitude: 90, planet: 'Moon' }],
	['Leo', { order: 5, day: 23, month: 7, symbol: 'Lion', longitude: 120, planet: 'Sun' }],
	['Virgo', { order: 6, day: 23, month: 8, symbol: 'Maiden', longitude: 150, planet: 'Mercury' }],
	['Libra', { order: 7, day: 23, month: 9, symbol: 'Scales', longitude: 180, planet: 'Venus' }],
	['Scorpio', { order: 8, day: 23, month: 10, symbol: 'Scorpion', longitude: 210, planet: 'Pluto & Mars' }],
	['Sagittarius', { order: 9, day: 22, month: 11, symbol: 'Centaur', longitude: 240, planet: 'Jupiter' }],
	['Capricorn', { order: 10, day: 22, month: 12, symbol: 'Goat', longitude: 270, planet: 'Saturn' }],
	['Aquarius', { order: 11, day: 20, month: 1, symbol: 'Ram', longitude: 300, planet: 'Uranus' }],
	['Pisces', { order: 12, day: 19, month: 2, symbol: 'Fish', longitude: 330, planet: 'Neptune' }],
]

// #endregion Const variables

/**
 * Wrapper class around Temporal.ZonedDateTime 
 * ````
 * (Instance)		new Tempo(DateTime, Options) or
 * (Static Method)		Tempo.from(DateTime, Options) or
 * (shortcut Function)	getTempo(DateTime, Options)  
 * 	DateTime?:	string | number | Tempo	- value to be interpreted as a Temporal.ZonedDateTime, default 'now'
 * 	Options?: 	object			- arguments to assist with parsing the <date> and configuring the instance
 * ````
 * A Tempo is an object that is used to wrap a Temporal.ZonedDateTime.  
 * It's strength is in it's flexibility to parse string|number|bigint|DateTime.  
 * It has accessors that report the value as DateTime components ('yy', 'dd', 'hh', ...)  
 * It has simple methods to perform manipulations (add, format, diff, offset, ...)  
 */
export class Tempo {
	// #region Static private properties~~~~~~~~~~~~~~~~~~~~~~
	static #ready = {
		static: new Pledge<boolean>('static'),									// wait for static-blocks to settle
		init: new Pledge<boolean>('Init'),											// wait for Tempo.init() to settle
	}

	static #global = {
		/** current defaults for all Tempo instances */					config: {},
		/** Tempo terms to allow date-range blocks */						terms: {},
		/** Tempo Symbol registry */														symbols: { ...Sym },
		/** Tempo units to aid in parsing */										units: { ...Units },
		/** Map of regex-patterns to match input-string */			patterns: new Map(),
	} as Internal.Shape

	static #timeStamp = {																			// lookup object for Tempo().ts resolution
		ss: 'epochSeconds',
		ms: 'epochMilliseconds',
		us: 'epochMicroseconds',
		ns: 'epochNanoseconds',
	} as Internal.TimeStamps

	// #endregion

	// #region Static private methods~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * {dt} is a special regex that combines date-related {units} (dd, mm -or- evt) into a pattern against which a string can be tested.  
	 * because it will also include a list of events (e.g. 'new_years' | 'xmas'), we need to rebuild {dt|} if the user adds a new event
	 */
	static #makeEvent(shape: Internal.Shape) {
		const events = shape.config.event
			.map(([pat, _], idx) => `(?<evt${idx}>${pat})`)				// assign a number to the pattern
			.join('|')																						// make an 'Or' pattern for the event-keys
		shape.units["evt"] = new RegExp(events);								// set the unit's 'event' pattern

		const date = Tempo.#isMonthDay(shape)										// we have a {locale} which prefers {mdy}
			? Tempo.regexp('{mm}{sep}?{dd}({sep}{yy})?|{mod}?({evt})')
			: Tempo.regexp('{dd}{sep}?{mm}({sep}{yy})?|{mod}?({evt})')
		shape.units["dt"] = new RegExp(date.source.slice(1, -1))// set the units {dt} pattern (without anchors)
	}

	/** determine if we have a {locale} which prefers {mdy} date-order */
	static #isMonthDay(shape: Internal.Shape) {
		let locale = shape.config.monthDay											// find monthDay that contains our {timeZone}
			.find(itm => itm.timeZones?.includes(shape.config.timeZone))?.locale;// found an Intl.Locale which prefers {mdy} and contains our {timeZone}

		locale ??= shape.config.monthDay												// find a monthDay that contains our {locale}
			.find(itm => itm.locale === shape.config.locale)?.locale;

		return locale;																					// true if {mdy}
	}

	/**
	 * {tm} is a special regex that combines time-related units (hh, mi, ss, ff, mer) into a pattern against which a string can be tested.  
	 * because it will also include a list of periods (e.g. 'midnight' | 'afternoon' ), we need to rebuild {tm} if the user adds a new period
	 */
	static #makePeriod(shape: Internal.Shape) {
		const periods = shape.config.period
			.map(([pat, _], idx) => `(?<per${idx}>${pat})`)				// {pattern} is the 1st element of the tuple
			.join('|')																						// make an 'or' pattern for the period-keys
		shape.units["per"] = new RegExp(periods);								// set the units 'period' pattern

		const time = Tempo.regexp('{hh}{mi}?{ss}?{ff}?{mer}?|{per}')
			.source.slice(1, -1);																	// set the {tm} pattern (without anchors)
		shape.units["tm"] = new RegExp(`(${time})`);						// set the {tm} unit
		shape.units["tzd"] = new RegExp(`(?<tzd>[+-]${time}|Z)`)// TODO
	}

	/**
	 * swap parsing-order of patterns (to suit different locales)  
	 * this allows the parser to interpret '04012023' as Apr-01-2023 instead of 04-Jan-2023  
	 */
	static #swap(shape: Internal.Shape) {
		const isMonthDay = Tempo.#isMonthDay(shape);						// found an Intl.Locale which prefers {mdy} and conatains our {timeZone}
		const swap = [																					// regexs to swap (to change conform priority)
			['dmy', 'mdy'],																				// swap {dmy} for {mdy}
		] as const;

		const layouts = [...shape.config.layout.entries()];			// get entries of each layout mapping 
		let chg = false;																				// no need to rebuild, if no change

		swap
			.forEach(([dmy, mdy]) => {														// loop over each swap-tuple
				const idx1 = layouts.findIndex(([key]) => key.description === dmy);	// 1st swap element exists in {layouts}
				const idx2 = layouts.findIndex(([key]) => key.description === mdy);	// 2nd swap element exists in {layouts}

				if (idx1 === -1 || idx2 === -1)
					return;																						// no pair to swap

				const swap1 = (idx1 < idx2) && isMonthDay;					// we prefer {mdy} and the 1st tuple was found earlier than the 2nd
				const swap2 = (idx1 > idx2) && !isMonthDay;					// we dont prefer {mdy} and the 1st tuple was found later than the 2nd

				if (swap1 || swap2) {
					[layouts[idx1], layouts[idx2]] = [layouts[idx2], layouts[idx1]];	// since {layouts} is an array, ok to swap inline
					chg = true;
				}
			})

		if (chg)
			shape.config.layout = new Map(layouts);								// rebuild Map in new parse order

		return isMonthDay;
	}

	/** setup seasons inferred from current hemisphere */
	static #season(shape: Internal.Shape) {
		const range: Tempo.TermTuple[] = shape.config.sphere !== Tempo.COMPASS.South
			? [['Spring', { day: 20, month: 3 }], ['Summer', { day: 21, month: 6 }], ['Autumn', { day: 22, month: 9 }], ['Winter', { day: 21, month: 12 }]]
			: [['Autumn', { day: 1, month: 3 }], ['Winter', { day: 1, month: 6 }], ['Spring', { day: 1, month: 9 }], ['Summer', { day: 1, month: 12 }]]

		return Tempo.#makeTerm(shape, 'szn.season', range);
	}

	/** setup quarters, inferred from current hemisphere */
	static #quarter(shape: Internal.Shape) {
		const month = shape.config.sphere !== Tempo.COMPASS.North
			? Tempo.MONTH.Oct
			: Tempo.MONTH.Jul

		const range: Tempo.TermTuple[] = [											// Map of start months for each quarter
			[1, { day: 1, month: month }],
			[2, { day: 1, month: (month + 3) % 12 }],
			[3, { day: 1, month: (month + 6) % 12 }],
			[4, { day: 1, month: (month + 9) % 12 }],
		]

		return Tempo.#makeTerm(shape, 'qtr.quarter', range);
	}

	/** add a Term's range definition to {terms} */
	static #makeTerm(shape: Internal.Shape, key: string, range: Tempo.TermTuple[]) {
		const sym = Tempo.getSymbol(shape, key);

		shape.terms ??= {};																			// ensure parent object exists
		shape.terms[sym] = new Map();														// remove prior {term}

		range
			.sort(([keyA, rangeA], [keyB, rangeB]) => {
				let result = 0;

				isNumber(keyA) && (rangeA.order ??= keyA);					// add an {order} field if numeric {term} key
				isNumber(keyB) && (rangeB.order ??= keyB);

				Tempo.elements.forEach(elm => { result ||= (rangeA[elm] ?? 0) - (rangeB[elm] ?? 0) });
				return result;
			})
			.forEach(([key, range]) => shape.terms[sym].set(isString(key) ? key.toLocaleLowerCase() : key, range));

		return shape.terms[sym];
	}

	/** properCase week-day / calendar-month */
	static #prefix = <T extends Tempo.Weekday | Tempo.Calendar>(str: T) =>
		toProperCase(str.substring(0, 3)) as T;

	/** get first Canonical name of a supplied locale */
	static #locale = (locale: string) => {
		let language: string | undefined;

		try {																										// lookup locale
			language = Intl.getCanonicalLocales(locale.replace('_', '-'))[0];
		} catch (error) { }																			// catch unknown locale

		return language ??
			navigator.languages[0] ??															// fallback to current first navigator.languages[]
			navigator.language ??																	// else navigator.language
			locale																								// cannot determine locale
	}

	/** try to infer hemisphere using the timezone's daylight-savings setting */
	static #dst = (shape: Internal.Shape) => {
		if (isUndefined(shape.config.timeZone) || isDefined(shape.config.sphere))
			return shape.config.sphere;														// already specified

		const tz = new Temporal.TimeZone(shape.config.timeZone);
		const yy = Temporal.Now.plainDateISO(tz).year;					// current year
		const jan = tz.getOffsetNanosecondsFor(Temporal.Instant.from(`${yy}-${Tempo.MONTH.Jan}-01T00:00+00:00`));
		const jun = tz.getOffsetNanosecondsFor(Temporal.Instant.from(`${yy}-${Tempo.MONTH.Jun}-01T00:00+00:00`));
		const dst = jan - jun;																	// timezone offset difference between Jan and Jun

		if (dst < 0)
			return shape.config.sphere = Tempo.COMPASS.North;

		if (dst > 0)
			return shape.config.sphere = Tempo.COMPASS.South;

		omit(shape.config, 'sphere');
		return void 0;																					// timeZone does not observe DST
	}

	/**
	 * conform input of Layout / Event / Period options 
	 * This is needed because we allow the user to flexibly provide detail as {[key]:val} or {[key]:val}[] or [key,val][]
	 * for example:    
	 * 	Tempo.init({ layout: {'ddmm': ['{dd}{sep}?{mm}']} })
	 * 	Tempo.init({ layout: {'yy': /20\d{2}/, 'mm': /[0-9|1|2]\d/ } })
	 *	Tempo.init({ layout: '{dow}' })												(can be a single string)
	 *	Tempo.init({ layout: ['{dow}?', / /, '{dd}'] })				(dont have to provide a 'key' for the {layout})
	 *	Tempo.init({ layout: new Map([['{dow}{yy}']]) })			(unlikely, but can be a single unit-string)
	 *	Tempo.init({ layout: new Map([['name1', ['{dow}','{yy}']], ['name2', ['{mm}', '{sep}', '{dd}']]]) })  

	 * 	Tempo.init({event: {'canada ?day': '01-Jun', 'aus(tralia)? ?day': '26-Jan'} })  
	 * 	Tempo.init({period: [{'morning tea': '09:30' }, {'elevenses': '11:00' }]})  
	 * 	new Tempo('birthday', {event: [["birth(day)?", "20-May"], ["anniversay", "01-Jul"] ]})
	 */
	static #setConfig(shape: Internal.Shape, ...options: (Tempo.Options | Tempo.Config)[]) {
		shape.config["layout"] ??= new Map();
		shape.config["event"] ??= [];
		shape.config["period"] ??= [];
		shape.config["terms"] ??= {};
		let idx = -1;

		options.forEach(option => {
			(Object.entries(option) as Entries<Tempo.Options>)
				.forEach(([optKey, optVal]) => {
					const arg = asType(optVal);
					const user = `usr${++idx}`;

					switch (optKey) {
						case 'layout':
							const map = shape.config["layout"];						// reference to the layout-map

							switch (arg.type) {
								case 'Object':															// add key-value pairs to Map()
									Object.entries(arg.value)
										.forEach(([key, val]) => map.set(Tempo.getSymbol(shape, user), asArray(val)));
									break;

								case 'String':															// add string with unique key to Map()
									map.set(Tempo.getSymbol(shape, user), asArray(arg.value));
									break;

								case 'RegExp':															// add pattern with unique key to Map()
									map.set(Tempo.getSymbol(shape, user), asArray(arg.value.source));
									break;

								case 'Array':
									if (isObject(arg.value[0])) {							// add array of objects to Map()
										(arg.value as unknown as NonNullable<Record<string, Internal.StringPattern | Internal.StringPattern[]>>[])
											.forEach(obj => Object.entries(obj)
												.forEach(([key, val]) => map.set(Tempo.getSymbol(shape, key), asArray(val)))
											)
									} else {																	// add array of <string | RegExp> to Map()
										map.set(Tempo.getSymbol(shape, user), (arg.value as Internal.StringPattern[])
											.map(itm => isString(itm) ? itm : itm.source));
									}
									break;

								case 'Map':
									for (const [key, val] of arg.value as typeof map)
										map.set(key, asArray(val));
									break;

								default:
									Tempo.#catch(shape.config, `Unexpected type for "layout": ${arg.type}`);
									break;
							}

							break;

						case 'event':
						case 'period':
							const arr = shape.config[optKey];							// reference to the config Array

							switch (arg.type) {
								case 'Object':
									arr.unshift(...Object.entries(arg.value));
									break;

								case 'Array':
									if (isObject(arg.value[0])) {							// add array of objects to []
										(arg.value as typeof arr)
											.forEach(obj => arr.unshift(...Object.entries(obj)))
									} else {																	// add array of <string | RegExp> to []
										arr.unshift(...arg.value as typeof arr);
									}
									break;

								case 'String':															// we are only expecting a string-value
									arr.unshift([user, arg.value]);
									break;

								case 'Map':																	// not really expecting Map() at this release
									arr.unshift(...(arg.value as unknown as Internal.StringTuple[]));
									break;

								default:
									Tempo.#catch(shape.config, `Unexpected type for "${optKey}": ${arg.type}`);
							}
							break;

						case 'monthDay':
							shape.config.monthDay = asArray(arg.value as string | string[])
								.map(locale => new Intl.Locale(locale))
								.map(locale => ({ locale: locale.baseName, timeZones: locale.timeZones }))
							break;

						case 'terms':																		// TODO: allow for different format of {terms}
							Object.entries(arg.value as Record<string, Tempo.TermTuple[]>)
								.forEach(([term, range]) => Tempo.#makeTerm(shape, term, range))
							break;

						default:
							Object.assign(shape.config, { [optKey]: optVal });	// just move the option to the config
							break;
					}
				})
		})

		return shape.config;
	}

	/** build RegExp patterns */
	static #makePattern(shape: Internal.Shape) {
		shape.patterns.clear();																	// reset {patterns} Map

		for (const [sym, units] of shape.config.layout)
			shape.patterns.set(sym, Tempo.regexp(shape.units, ...units))
	}

	/** use debug:boolean to determine if console() */
	static #info = Tempo.#debug.bind(this, 'info');
	static #warn = Tempo.#debug.bind(this, 'warn');
	static #error = Tempo.#debug.bind(this, 'error');
	static #debug(method: Logger = 'info', config: Tempo.Config, ...msg: any[]) {
		if (config.debug)
			console[method](sprintf('tempo:', ...msg));
	}

	/** use catch:boolean to determine whether to throw or return  */
	static #catch(config: Tempo.Config, ...msg: any[]) {
		if (config.catch) {
			Tempo.#warn(config, ...msg);													// catch, but warn {error}
			return;
		}

		Tempo.#error(config, ...msg);														// assume {error}
		throw new Error(sprintf('tempo:', ...msg));
	}

	// #endregion Static private methods

	// #region Static public methods~~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * set a default configuration for a subsequent 'new Tempo()' instance to inherit.  
	 * Tempo.#config is set from  
	 * a) reasonable default values, then  
	 * b) local storage, then  
	 * c) 'init' argument values  
	 */
	static init = (options: Tempo.Options = {}) => {
		return Promise.race([
			Tempo.#ready["static"].promise,												// wait until static-blocks are fully parsed
			sleep('Tempo setup timed out', Tempo.TIME.second * 2),// or two-second timeout
		])
			.then(_ => {
				if (Tempo.#ready["init"].status.state !== Pledge.STATE.Pending)
					Tempo.#ready["init"] = new Pledge<boolean>('Init')// reset Init Pledge

				if (isEmpty(options)) {															// if no options supplied, reset all
					const dateTime = Intl.DateTimeFormat().resolvedOptions();
					const [country] = dateTime.timeZone.toLowerCase().split('/');

					// setup static Tempo defaults, overload with local-storage
					purge(Tempo.#global.config);											// remove previous config
					Tempo.#setConfig(Tempo.#global, Default);

					Object.assign(Tempo.#global.config, {							// some global locale-specific defaults
						level: Internal.LEVEL.Global,
						calendar: dateTime.calendar,
						timeZone: dateTime.timeZone,
						locale: dateTime.locale,
					})

					switch (country) {																// TODO: better country detection
						case 'australia':
							Object.assign(Tempo.#global.config, {
								sphere: Tempo.COMPASS.South,
								locale: 'en-AU',
							});
							break;

						default:
							break;
					}

					// allow for storage-values to overwrite
					Tempo.#setConfig(Tempo.#global, Tempo.read());
				}
				else Tempo.#setConfig(Tempo.#global, options);			// overload with init() argument {options}

				// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				Tempo.#dst(Tempo.#global);													// setup hemisphere
				if (isEmpty(Tempo.#global.terms[Tempo.getSymbol(Tempo.#global, 'zdc.zodiac')]))
					Tempo.#makeTerm(Tempo.#global, 'zdc.zodiac', Zodiac)// setup default Zodiac star-signs
				if (isEmpty(Tempo.#global.terms[Tempo.getSymbol(Tempo.#global, 'szn.season')]))
					Tempo.#season(Tempo.#global);											// setup default seasons
				if (isEmpty(Tempo.#global.terms[Tempo.getSymbol(Tempo.#global, 'qtr.quarter')]))
					Tempo.#quarter(Tempo.#global);										// setup default quarters

				const locale = Tempo.#swap(Tempo.#global);					// determine if we need to swap the order of some {layouts}
				if (locale && !options.locale)
					Tempo.#global.config.locale = locale;							// found an override locale based on timeZone
				Tempo.#global.config.locale = Tempo.#locale(Tempo.#global.config.locale);

				Tempo.#makeEvent(Tempo.#global);										// setup special Date {layout} (before patterns!)
				Tempo.#makePeriod(Tempo.#global);										// setup special Time {layout} (before patterns!)
				Tempo.#makePattern(Tempo.#global);									// setup Regex DateTime patterns

				if (getContext().type === CONTEXT.Browser || options.debug === true)
					Tempo.#info(Tempo.config, 'Tempo:', Tempo.#global.config);

				return true;
			})
			.catch(err => Tempo.#catch(Tempo.#global.config, err.message))
			.finally(() => Tempo.#ready["init"].resolve(true))		// Tempo.init() has completed
	}

	/** read Options from persistent storage */
	static read() {
		return getStore(STORAGEKEY, {}) as Tempo.Options;
	}

	/** write Options into persistent storage */
	static write(config?: Tempo.Options) {
		setStore(STORAGEKEY, config);
	}

	/** lookup local Symbol registry */
	static getSymbol(shape: Internal.Shape, key: string) {
		const [sym, description = key] = key.split('.');				// for example, 'zdc.zodiac'
		const idx = allEntries(shape.symbols)
			.find(([symKey, symVal]) => symKey === sym || symVal.description === description);

		return idx
			? shape.symbols[idx[0]]																// identified Symbol
			: shape.symbols[sym] = Symbol(description)						// else allocate and assign a new Symbol
	}

	/**
	 * combine array of <string | RegExp> to an anchored, case-insensitive RegExp.  
	 * layouts generally have {unit} placeholders, for example:  '{yy}{sep}?{mm}?'  
	 */
	static regexp: {
		(...layouts: Internal.StringPattern[]): RegExp;
		(units: Internal.Regexp, ...layouts: Internal.StringPattern[]): RegExp;
	}
		= (units: Internal.Regexp | Internal.StringPattern, ...layouts: Internal.StringPattern[]) => {
			if (!isObject(units)) {
				layouts.splice(0, 0, units);												// stash 1st argument into {regs} array
				units = Tempo.#global.units;												// set units to static value
			}

			const names: Record<string, boolean> = {};						// to detect if multiple instances of the same named-group
			const pattern = layouts
				.map(layout => {																		// for each {layout} in the arguments
					if (isRegExp(layout))
						layout = layout.source;
					if (layout.match(Match.regexp))										// string that looks like a RegExp
						layout = layout.substring(1, -1);

					const it = layout.matchAll(Match.braces);					// iterator to match all "{}" patterns in a {layout}
					for (const pat of it) {
						const { ["1"]: unit } = pat;										// {unit} is the code between the {}

						let reg = (units as Internal.Regexp)[unit];		// check if a defined {unit}
						if (isNullish(reg))
							continue;																			// if not a {unit}, pass back as-is

						const inner = reg.source.matchAll(Match.braces);// {unit} might contain "{.*}" as well
						for (const sub of inner) {
							const { ["1"]: word } = sub;
							const lkp = (units as Internal.Regexp)[word];

							if (isNullish(lkp))
								continue;

							reg = new RegExp(reg.source.replace(`{${word}}`, lkp.source));
						}

						if (names[unit])																// if this named-group already used...
							reg = new RegExp(`(\\k<${unit}>)`);						// use \k backreference to previous named-group {unit}
						names[unit] = true;															// mark this named-group as 'used'

						layout = layout.replace(`{${unit}}`, reg.source)// rebuild the {layout}
					}

					return layout;
				})

			return new RegExp('^(' + pattern.join('') + ')$', 'i');
		}

	/**
	 * static method to allow compare of Tempo's.  
	 * (tempo2 defaults to current Instant).
	 * ```` 
	 * const diff = Tempo.compare(tempo1, tempo2);
	 * 		-1 if tempo1 comes before tempo2  
	 * 		 0 if tempo1 and tempo2 represent the same time  
	 * 		 1 if tempo1 comes after tempo2 
	 * ```` 
	 * 
	 * can also be used to sort an array of Tempo values.  
	 * returns a new array
	 * ````
	 * const arr = [tempo1, tempo2, tempo3].sort(Tempo.compare)  
	 * ````
	 */
	static compare = (tempo1?: Tempo.DateTime | Tempo.Options, tempo2?: Tempo.DateTime | Tempo.Options) => {
		const one = new Tempo(tempo1), two = new Tempo(tempo2);

		return Number((one.nano > two.nano) || -(one.nano < two.nano));
	}

	/** static method to create a new Tempo */
	static from = ((tempo, options) => new Tempo(tempo, options)) as Params<Tempo>;

	/** static method to access current epochNanoseconds */
	static now = () => Temporal.Now.instant().epochNanoseconds;

	/** static Tempo.Duration getter, where matched in Tempo.TIMES */
	static get durations() {
		return getAccessors<Temporal.DurationLike>(Temporal.Duration)
			.filter(key => Tempo.TIMES.keys().includes(key));
	}

	/** static Temporal.DateTimeUnit, where exists in Tempo.TIME */
	static get elements() {
		return Tempo.TIME.keys() as Temporal.DateTimeUnit[];
	}

	/** static Tempo.Terms getter */
	static get terms() {
		return allEntries(Tempo.#global.terms)
			.reduce((acc, [sym, term]) => {
				const key = sym.description ?? sym.toString();
				return Object.assign(acc, { [key]: new Map(term.entries()) });
			}, {} as Record<string, Tempo.Term>)
	}

	/** static Tempo properties getter */
	static get properties() {
		return getAccessors<Tempo>(Tempo)
	}

	/** Tempo global config settings */
	static get config() {
		return {
			...Tempo.#global.config, ...{ units: Tempo.#global.units }
		}
	}

	/** Tempo initial default settings */
	static get default() {
		return { ...Default }
	}

	/** array of regex patterns used when parsing Tempo.DateTime argument */
	static get patterns() {
		return Tempo.#global.patterns;
	}

	/** Tempo / Temporal map */
	static get map() {
		return {
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
		} as const
	}

	/** iterate over Tempo properties */
	static [Symbol.iterator]() {
		const props = Tempo.properties[Symbol.iterator]();			// static Iterator over array of 'getters'

		return {
			next: () => props.next(),
		}
	}

	/** indicate when Tempo.init() is complete */
	static get ready() {
		return Tempo.#ready["static"].promise
			.then(() => Tempo.#ready["init"].promise)
	}

	/** end of static blocks */
	static {
		Tempo.#ready["static"].resolve(true);
	}

	// #endregion Static public methods

	// #region Instance symbols~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** allow for auto-convert of Tempo to BigInt */
	[Symbol.toPrimitive](hint?: 'string' | 'number' | 'default') {
		Tempo.#info(this.config, getType(this), '.hint: ', hint);
		return this.nano;
	}

	/** iterate over instance formats */
	[Symbol.iterator]() {
		const props = allEntries(this.#fmt)[Symbol.iterator]();	// instance Iterator over tuple of FormatType[]

		return {
			next: () => props.next(),															// tuple of [fmtCode, value]
		}
	}

	/** dispose Tempo */
	[Symbol.dispose]() {																			// TODO: for future implementation
		Tempo.#info(this.config, 'dispose: ', this.#tempo);
	}

	get [Symbol.toStringTag]() {															// default string description
		return 'Tempo';																					// hard-coded to avoid minification mangling
	}

	// #endregion Instance symbols

	// #region Instance properties~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** constructor tempo */																	#tempo?: Tempo.DateTime;
	/** constructor options */																#options = {} as Tempo.Options;
	/** instantiation Temporal Instant */											#instant: Temporal.Instant;
	/** underlying Temporal ZonedDateTime */									#zdt!: Temporal.ZonedDateTime;
	/** prebuilt formats, for convenience */									#fmt = {} as Tempo.FormatType;
	/** instance values to complement static values */				#local = {
		/** instance configuration */															config: {} as Tempo.Config,
		/** instance term values */																term: {} as Record<string, string | number>,
		/** instance term objects */															terms: {} as Tempo.Terms,
		/** instance units */																			units: {} as Internal.Regexp,
		/** instance Symbols */																		symbols: {} as Internal.Symbol,
		/** instance patterns */																	patterns: new Map() as Internal.RegexpMap,
	}

	// #endregion Instance properties

	// #region Constructor~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/**
	 * instantiate a new Tempo()
	 * @param tempo 		Value to interpret (default to Temporal.Now.instant())
	 * @param options 	Options to tailor the instance
	 */
	constructor(options?: Tempo.DateTime | Tempo.Options);
	constructor(tempo?: Tempo.DateTime, options?: Tempo.Options);
	constructor(tempo?: Tempo.DateTime | Tempo.Options, options: Tempo.Options = {}) {

		this.#instant = Temporal.Now.instant();									// stash current Instant
		[this.#tempo, this.#options] = isObject(tempo)					// swap arguments, if Options is 1st
			? [({ ...tempo as Tempo.Options }).value, tempo as Tempo.Options]
			: [tempo, { ...options }]															// stash original values

		Object.assign(this.#local.config, Tempo.#global.config, { level: Internal.LEVEL.Local })
		Tempo.#setConfig(this.#local, this.#options);						// start with {#global} config, overloaded with {options}

		this.#local.units = cloneify(Tempo.#global.units);			// start with static {units} object
		this.#local.terms = cloneify(Tempo.#global.terms);			// start with static {terms} object
		// this.#local.symbols = cloneify(Tempo.#global.symbols);	// start with static {symbol} registry
		this.#local.patterns = cloneify(Tempo.#global.patterns);// start with static {patterns} Map

		/** first task is to parse the 'Tempo.Options' looking for overrides to Tempo.#global.config */
		/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

		// if a timeZone provided but no hemisphere, try to infer hemisphere based on daylight-savings  
		if (this.#local.config.timeZone !== Tempo.#global.config.timeZone && isUndefined(this.#options.sphere))
			Tempo.#dst(this.#local);

		// change of hemisphere, setup new Seasons / Fiscal start-month
		if (this.#local.config.sphere !== Tempo.#global.config.sphere) {
			Tempo.#quarter(this.#local);													// reset the {term[@@qtr]}
			Tempo.#season(this.#local);														// reset the {term[@@szn]}
		}

		// change of Locale, swap 'dmy' pattern with 'mdy' parse-order?
		if (this.#local.config.locale !== Tempo.#global.config.locale) {
			const locale = Tempo.#swap(this.#local);

			if (isEmpty(this.#local.config.locale))
				this.#local.config.locale = locale || Tempo.#global.config.locale;
			this.#local.config.locale = Tempo.#locale(this.#local.config.locale);
		}

		// user-specified time-periods to use when parsing this instance
		if (isDefined(this.#options.period))
			Tempo.#makePeriod(this.#local);												// set instance 'per' and 'tm' {units}

		// user-specified date-events to use when parsing this instance
		if (isDefined(this.#options.event))
			Tempo.#makeEvent(this.#local);												// set instance 'evt' and 'dt' {units}

		// user-specified patterns to use when parsing this instance
		if (isDefined(this.#options.layout))
			Tempo.#makePattern(this.#local);											// set instance {patterns}

		/** we now have all the info we need to instantiate a new Tempo                          */
		/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
		try {
			this.#zdt = this.#parse(this.#tempo);									// attempt to interpret the DateTime arg

			if (['iso8601', 'gregory'].includes(this.config.calendar)) {
				Tempo.FORMAT.entries()															// add all the pre-defined FORMATs to the instance (eg. Tempo().fmt.yearMonthDay)
					.forEach(([key, val]) =>
						Object.assign(this.#fmt, { [key]: this.format(val) }))	// add-on short-cut format
			}
		} catch (err) {
			Tempo.#catch(this.config, `Cannot create Tempo: ${(err as Error).message}`);
			return {} as unknown as Tempo;												// TODO: need to return empty object?
		}
	}

	// #endregion Constructor

	// #region Instance public accessors~~~~~~~~~~~~~~~~~~~~~~
	/** 4-digit year */																				get yy() { return this.#zdt.year }
	/** month: Jan=1, Dec=12 */																get mm() { return this.#zdt.month }
	/** day of month */																				get dd() { return this.#zdt.day }
	/** hours since midnight: 24-hour format */								get hh() { return this.#zdt.hour }
	/** minutes since last hour */														get mi() { return this.#zdt.minute }
	/** seconds since last minute */													get ss() { return this.#zdt.second }
	/** milliseconds since last second */											get ms() { return this.#zdt.millisecond }
	/** microseconds since last millisecond */								get us() { return this.#zdt.microsecond }
	/** nanoseconds since last microsecond */									get ns() { return this.#zdt.nanosecond }
	/** fractional seconds since last second */								get ff() { return +(`0.${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`) }
	/** number of weeks */																		get ww() { return this.#zdt.weekOfYear }
	/** timezone */																						get tz() { return this.#zdt.timeZoneId }
	/** default as milliseconds since Unix epoch */						get ts() { return this.#zdt[Tempo.#timeStamp[this.#local.config.timeStamp]] as number | bigint }
	/** weekday: Mon=1, Sun=7 */															get dow() { return this.#zdt.dayOfWeek }
	/** short month name */																		get mmm() { return Tempo.MONTH[this.#zdt.month] }
	/** long month name */																		get mon() { return Tempo.MONTHS[this.#zdt.month] }
	/** short weekday name */																	get ddd() { return Tempo.WEEKDAY[this.#zdt.dayOfWeek] }
	/** long weekday name */																	get day() { return Tempo.WEEKDAYS[this.#zdt.dayOfWeek] }
	/** nanoseconds (BigInt) since Unix epoch */							get nano() { return this.#zdt.epochNanoseconds }
	/** Instance configuration */															get config() { return { ...this.#local.config } }
	/** calculated instance terms */													get term() { return { ...this.#local.term } }
	/** in-built format-codes and formatted-results */				get fmt() { return { ...this.#fmt } }
	/** units since epoch */																	get epoch() {
		return {
			/** seconds since epoch */														ss: this.#zdt.epochSeconds,
			/** milliseconds since epoch */												ms: this.#zdt.epochMilliseconds,
			/** microseconds since epoch */												us: this.#zdt.epochMicroseconds,
			/** nanoseconds since epoch */												ns: this.#zdt.epochNanoseconds,
		}
	}
	// #endregion Instance public accessors

	// #region Instance public methods~~~~~~~~~~~~~~~~~~~~~~~~
	/** calc DateTime duration */															until<U extends Tempo.DateTime | Tempo.Until>(until?: U) { return this.#until(until) }
	/** format elapsed time */																since<S extends Tempo.DateTime | Tempo.Until>(since?: S) { return this.#since(since) }
	/** apply formatting */																		format<K extends Tempo.Formats>(fmt: K) { return this.#format(fmt) }

	/** add to date/time property */													add(mutate: Tempo.Add) { return this.#add(mutate) }
	/** set to start/mid/end/period of property */						set(offset: Tempo.Set | Tempo.Add) { return this.#set(offset) }

	/** is valid Tempo */																			isValid() { return !isEmpty(this) }
	/** as Temporal.ZonedDateTime */													toDateTime() { return this.#zdt }
	/** as Temporal.Instant */																toInstant() { return this.#instant }
	/** as Date object */																			toDate() { return new Date(this.#zdt.round({ smallestUnit: 'millisecond' }).epochMilliseconds) }
	/** as String */																					toString() { return this.#zdt.toString() }
	/** as Object */																					toJSON() { return { ...this.#local.config, value: this.toString() } }

	// #endregion Instance public methods

	// #region Instance private methods~~~~~~~~~~~~~~~~~~~~~~~
	/** parse DateTime input */
	#parse(tempo?: Tempo.DateTime, dateTime?: Temporal.ZonedDateTime) {
		const today = dateTime ?? this.#instant									// cast instantiation to current timeZone, calendar
			.toZonedDateTime({ timeZone: this.#local.config.timeZone, calendar: this.#local.config.calendar });
		const arg = this.#conform(tempo, today);								// if String or Number, conform the input against known patterns

		Tempo.#info(this.#local.config, 'parse', `{type: ${arg.type}, value: ${arg.value}}`);					// show what we're parsing

		switch (arg.type) {
			case 'Null':																					// TODO: special Tempo for null?
			case 'Void':
			case 'Empty':
			case 'Undefined':
				return today;

			case 'String':
			case 'Temporal.ZonedDateTime':
				try {
					return Temporal.ZonedDateTime.from(arg.value);		// attempt to parse value
				} catch {																						// fallback to browser's Date.parse() method
					this.#local.config.parse.match = 'Date.parse';
					Tempo.#warn(this.#local.config, 'Cannot detect DateTime; fallback to Date.parse');
					return Temporal.ZonedDateTime.from(`${new Date(arg.value.toString()).toISOString()}[${this.config.timeZone}]`);
				}

			case 'Temporal.PlainDate':
			case 'Temporal.PlainDateTime':
				return arg.value
					.toZonedDateTime(this.#local.config.timeZone);

			case 'Temporal.PlainTime':
				return arg.value
					.toZonedDateTime({ timeZone: this.#local.config.timeZone, plainDate: today.toPlainDate() });

			case 'Temporal.PlainYearMonth':												// assume current day, else end-of-month
				return arg.value
					.toPlainDate({ day: Math.min(today.day, arg.value.daysInMonth) })
					.toZonedDateTime(this.#local.config.timeZone);

			case 'Temporal.PlainMonthDay':												// assume current year
				return arg.value
					.toPlainDate({ year: today.year })
					.toZonedDateTime(this.#local.config.timeZone);

			case 'Temporal.Instant':
				return arg.value
					.toZonedDateTime({ timeZone: this.#local.config.timeZone, calendar: this.#local.config.calendar });

			case 'Tempo':
				return arg.value
					.toDateTime();																		// clone current Tempo

			case 'Date':
				return new Temporal.ZonedDateTime(BigInt(arg.value.getTime() * 1_000_000), this.#local.config.timeZone, this.#local.config.calendar);

			case 'Number':																				// Number which didn't conform to a Tempo.pattern
				const [seconds = 0n, suffix = 0n] = arg.value.toString().split('.').map(BigInt);
				const nano = BigInt(suffix.toString().substring(0, 9).padEnd(9, '0'));

				return new Temporal.ZonedDateTime(seconds * 1_000_000_000n + nano, this.#local.config.timeZone, this.#local.config.calendar);

			case 'BigInt':																				// BigInt is not conformed against a Tempo.pattern
				return new Temporal.ZonedDateTime(arg.value, this.#local.config.timeZone, this.#local.config.calendar);

			default:
				Tempo.#catch(this.#local.config, `Unexpected Tempo parameter type: ${arg.type}, ${String(arg.value)}`);
				return today;
		}
	}

	/** evaluate 'string | number' input against known patterns */
	#conform(tempo: Tempo.DateTime | undefined, dateTime: Temporal.ZonedDateTime) {
		const arg = asType(tempo);
		this.#local.config.parse = { ...arg };

		if (!isType<string | number>(arg.value, 'String', 'Number'))
			return arg;																						// only conform String or Number against known patterns (not BigInt, etc)

		const value = trimAll(arg.value, /\(|\)/g);							// cast as String, remove \( \) and control-characters

		if (isString(arg.value)) {															// if original value is String
			if (isEmpty(value)) {																	// don't conform empty string
				this.#local.config.parse.match = 'Empty';						// matched an empty-String
				return Object.assign(arg, { type: 'Empty' });
			}
			if (value.match(Match.bigint)) {											// if string representation of BigInt literal
				this.#local.config.parse.match = 'BigInt';					// matched a bigint-String
				return Object.assign(arg, { type: 'BigInt', value: asInteger(value) });
			}
		} else {
			if (value.length <= 7) {         											// cannot reliably interpret small numbers:  might be {ss} or {yymmdd} or {dmmyyyy}
				Tempo.#catch(this.#local.config, 'Cannot safely interpret number with less than 8-digits: use string instead');
				return arg;
			}
		}

		if (isUndefined(this.#zdt))															// if first pass
			dateTime = dateTime.withPlainTime('00:00:00');				// strip out all time-components

		for (const [sym, pat] of this.#local.patterns.entries()) {
			const groups = this.#parseMatch(value, pat);					// determine pattern-match groups

			if (isEmpty(groups))
				continue;																						// no match, so skip this iteration

			this.#parseGroups(groups, dateTime);									// mutate the {groups} object

			dateTime = this.#parseWeekday(groups, dateTime);			// if {weekday}-pattern, calculate a calendar value
			dateTime = this.#parseDate(groups, dateTime);					// if {calendar}|{event} pattern, translate to date value
			dateTime = this.#parseTime(groups, dateTime);					// if {clock}|{period} pattern, translate to a time value

			/**
			 * finished analyzing a matched pattern.  
			 * rebuild {arg.value} into a ZonedDateTime
			 */
			Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime });
			Object.assign(this.#local.config.parse, { match: sym.description, groups });// stash the {key} of the pattern that was matched								

			Tempo.#info(this.config, 'pattern', sym.description);	// show the pattern that was matched
			Tempo.#info(this.config, 'groups', groups);						// show the resolved date-time elements

			break;																								// stop checking patterns
		}

		return arg;
	}

	/** apply a regex-match against a value, and clean the result */
	#parseMatch(value: string | number, pat: RegExp) {
		const groups = value.toString().match(pat)?.groups || {};

		Object.entries(groups)																	// remove undefined, NaN, null and empty values
			.forEach(([key, val]) => isEmpty(val) && omit(groups, key));

		return groups;
	}

	/**
	 * resolve any {event} | {period} to their date | time values  
	 * intercept any {month} string  
	 * set default {cnt} if {mod} present  
	 * Note:  this will mutate the {groups} object
	*/
	#parseGroups(groups: Internal.RegExpGroups, dateTime: Temporal.ZonedDateTime) {
		// fix {cnt}
		if (isDefined(groups["mod"]))
			groups["cnt"] ||= '1';																// default {cnt} if {mod} is present

		// fix {event}
		const event = Object.keys(groups).find(key => key.match(Match.event));
		if (event) {
			const idx = +event[3];																// number index of the {event}
			const [_, evt] = this.#local.config.event[idx];				// fetch the indexed tuple's value

			Object.assign(groups, this.#parseEvent(evt));					// determine the date-values for the {event}

			const { mod, cnt, yy, mm, dd } = groups as { mod: Tempo.Modifier, [key: string]: string };
			if (isEmpty(yy) && isEmpty(mm) && isEmpty(dd))
				return Tempo.#catch(this.#local.config, `Cannot determine a {date} or {event} from "${evt}"`);

			if (mod) {																						// adjust the {year} if a Modifier is present
				const adjust = +cnt;																// how many years to adjust
				const offset = Number(pad(mm) + '.' + pad(dd));			// the event month.day
				const period = Number(pad(dateTime.month) + '.' + pad(dateTime.day + 1));
				groups["yy"] = (+(yy ?? dateTime.year) + this.#parseModifier({ mod, adjust, offset, period })).toString();
			}
		}

		// fix {period}
		const period = Object.keys(groups).find(key => key.match(Match.period));
		if (period) {
			const idx = +period[3];																// number index of the {period}
			const [_, per] = this.#local.config.period[idx];			// fetch the indexed tuple's value

			Object.assign(groups, this.#parsePeriod(per));				// determine the time-values for the {period}
			if (isEmpty(groups["hh"]))														// must have at-least {hh} time-component
				return Tempo.#catch(this.#local.config, `Cannot determine a {time} from "${per}"`);
		}

		// fix {mm}
		if (isDefined(groups["mm"]) && !isNumeric(groups["mm"])) {
			const mm = Tempo.#prefix(groups["mm"] as Tempo.Calendar);

			groups["mm"] = enumKeys(Tempo.MONTH)
				.findIndex(el => el === mm)													// resolve month-name into a month-number
				.toString()																					// (some browsers do not allow month-names when parsing a Date)
				.padStart(2, '0')
		}

		return;
	}

	/**
	 * We expect similar offset-logic to apply to 'modifiers' when parsing a string DateTime.  
	 * returns {adjust} to make, based on {modifier}, {offset}, and {period}    
	 *  -			previous period  
	 *  +			next period  
	 * -3			three periods ago  
	 * <			prior to base-date (asIs)  
	 * <=			prior to base-date (plus one)  
	 */
	#parseModifier({ mod, adjust, offset, period }: { mod?: Tempo.Modifier, adjust: number, offset: number, period: number }) {
		switch (mod) {
			case void 0:																					// no adjustment
			case '=':
				return 0
			case '+':																							// next period
				return adjust;
			case '-':																							// previous period
				return -adjust;
			case '<':																							// period before or including base-date
				return (period <= offset)
					? -adjust
					: 0
			case '<=':																						// period before base-date
			case '-=':
				return (period < offset)
					? -adjust
					: 0
			case '>':																							// period after or including base-date
				return (period >= offset)
					? adjust
					: 0
			case '>=':																						// period after base-date
			case '+=':
				return (period > offset)
					? adjust
					: 0
			default:																							// unexpected modifier
				return 0;
		}
	}

	/**
	 * if named-group 'dow' detected (with optional 'mod', 'cnt', or time-units), then calc relative weekday offset  
	 *   Wed		-> Wed this week															might be earlier or later or equal to current day  
	 *  -Wed		-> Wed last week															same as new Tempo('Wed').add({ weeks: -1 })  
	 *  +Wed		-> Wed next week															same as new Tempo('Wed').add({ weeks:  1 })  
	 * -3Wed		-> Wed three weeks ago  											same as new Tempo('Wed').add({ weeks: -3 })  
	 *  <Wed		-> Wed prior to today 												might be current or previous week  
	 * <=Wed		-> Wed prior to tomorrow											might be current or previous week  
	 *  Wed noon-> Wed this week at 12:00pm										even though time-periods may be present, ignore them in this method  
	 * @returns  ZonedDateTime with computed date-offset  
	 */
	#parseWeekday(groups: Internal.RegExpGroups, dateTime: Temporal.ZonedDateTime) {
		const { dow, mod, cnt, ...rest } = groups as { dow: Tempo.Weekday, mod: Tempo.Modifier, [key: string]: string };
		if (isUndefined(dow))																		// this is not a {dow} pattern match
			return dateTime;

		/**
		 * the {dow} pattern should only have {mod} and {cnt} (an exception is time-units)  
		 * for example: {dow: 'Wed', mod: '>', hh: '10', mer: 'pm'}  
		 * we early-exit if we find anything other than {dow}, {mod}, {cnt} and time-units  
		 */
		const clock = ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'];
		const onlyClock = Object.keys(rest)
			.every(key => clock.includes(key));										// only {time} keys are detected in {rest}
		if (!onlyClock)
			return dateTime;																			// this is not a true {dow} pattern, so early-exit

		const weekday = Tempo.#prefix(dow);											// conform weekday-name
		const adjust = dateTime.daysInWeek * +cnt;							// how many weeks to adjust
		const offset = enumKeys(Tempo.WEEKDAY)									// how far weekday is from today
			.findIndex(el => el === weekday);

		const days = offset - dateTime.dayOfWeek								// number of days to offset from dateTime
			+ this.#parseModifier({ mod, adjust, offset, period: dateTime.dayOfWeek });

		return dateTime
			.add({ days });																				// set new {day}
	}

	/**
	 * match input against date patterns.   
	 * @returns adjusted ZonedDateTime with resolved time-components  
	 */
	#parseDate(groups: Internal.RegExpGroups, dateTime: Temporal.ZonedDateTime) {
		const { mod, cnt, yy, mm, dd } = groups as { mod: Tempo.Modifier, [key: string]: string; };

		if (isEmpty(yy) && isEmpty(mm) && isEmpty(dd))
			return dateTime;																			// return default

		const date = Object.assign(this.#num({									// set defaults to use if match does not fill all date-components
			yy: yy ?? dateTime.year,															// supplied year, else current year
			mm: mm ?? dateTime.month,															// supplied month, else current month
			dd: dd ?? dateTime.day,																// supplied day, else current day
		})) as { yy: number, mm: number, dd: number };

		/**
		 * change two-digit year into four-digits using 'pivot-year' (defaulted to '75' years) to determine century  
		 * pivot		= (currYear - Tempo.pivot) % 100						// for example: Rem((2024 - 75) / 100) => 49
		 * century	= Int(currYear / 100)												// for example: Int(2024 / 100) => 20
		 * 22				=> 2022																			// 22 is less than pivot, so use {century}
		 * 57				=> 1957																			// 57 is greater than pivot, so use {century - 1}
		 */
		if (date.yy.toString().match(Match.twoDigit)) {					// if {yy} match just-two digits
			const pivot = dateTime
				.subtract({ years: this.#local.config.pivot })			// pivot cutoff to determine century
				.year % 100																					// remainder 
			const century = Math.trunc(dateTime.year / 100);			// current century
			date.yy += (century - Number(date.yy > pivot)) * 100;
		}

		// adjust the {year} if a Modifier is present
		// const modifier = event ? mod : void 0;									// {mod} only valid if {event}
		const adjust = +cnt;																		// how many years to adjust
		const offset = Number(pad(date.mm) + '.' + pad(date.dd));// the event month.day
		const period = Number(pad(dateTime.month) + '.' + pad(dateTime.day + 1));
		date.yy += this.#parseModifier({ mod, adjust, offset, period });

		// all date-components are now set; check for overflow in case past end-of-month
		const overflow = Temporal.PlainDate.from({ year: date.yy, month: date.mm, day: date.dd }, { overflow: 'constrain' });

		return dateTime
			.withPlainDate(overflow);															// adjust to constrained date
	}

	/**
	 * match input against 'tm' pattern.  
	 * {groups} is expected to contain time-components (like {hh:'15', mi: '00', mer:'pm'}).  
	 * returns an adjusted ZonedDateTime  
	 */
	#parseTime(groups: Internal.RegExpGroups = {}, dateTime: Temporal.ZonedDateTime) {
		if (isUndefined(groups["hh"]))													// must contain either 'time' (with at least {hh}) or {period}
			return dateTime;

		let { hh = 0, mi = 0, ss = 0, ms = 0, us = 0, ns = 0, ff = 0 } = this.#num(groups);

		if (hh >= 24) {
			const days = Math.trunc(hh / 24);											// number of days to offset

			hh = hh % 24;																					// midnight is '00:00' on the next-day
			dateTime = dateTime.add({ days });										// move the date forward
		}

		if (ff) {																								// {ff} is fractional seconds and overrides {ms|us|ns}
			ms = +ff.toString().substring(0, 3).padEnd(3, '0');
			us = +ff.toString().substring(3, 5).padEnd(3, '0');
			ns = +ff.toString().substring(6, 8).padEnd(3, '0');
		}

		if (groups["mer"]?.toLowerCase() === 'pm' && hh < 12 && (hh + mi + ss + ms + us + ns) > 0)
			hh += 12;																							// anything after midnight and before midday
		if (groups["mer"]?.toLowerCase() === 'am' && hh >= 12)
			hh -= 12;																							// anything after midday

		return dateTime																					// return the computed time-values
			.withPlainTime({ hour: hh, minute: mi, second: ss, millisecond: ms, microsecond: us, nanosecond: ns });
	}

	/** look for a match with standard {calendar} or {event} patterns */
	#parseEvent(evt: string) {
		const isMonthDay = Tempo.#isMonthDay(this.#local);			// first find out if we have a US-format locale
		const groups: Internal.RegExpGroups = {};
		const pats = isMonthDay
			? ['mdy', 'dmy', 'ymd']																// try {mdy} before {dmy} if US-format
			: ['dmy', 'mdy', 'ymd']																// else try {dmy} before {mdy}

		pats.find(pat => {
			const reg = this.#local.patterns.get(Tempo.getSymbol(this.#local, pat));// get the RegExp for the date-pattern

			if (isUndefined(reg)) {
				Tempo.#catch(this.#local.config, `Cannot pattern for "${pat}"`);
			} else {
				Object.assign(groups, this.#parseMatch(evt, reg));
			}

			return !isEmpty(groups);															// return on the first matched pattern
		})

		return groups;																					// overlay the match date-components
	}

	/** look for a match with standard {clock} or {period} patterns */
	#parsePeriod(per: string) {
		const groups: Internal.RegExpGroups = {};
		const tm = this.#local.patterns.get(Tempo.getSymbol(this.#local, 'tm'));	// get the RegExp for the time-pattern

		if (isUndefined(tm)) {
			Tempo.#catch(this.#local.config, `Cannot find pattern "tm"`);
			return;
		}

		Object.assign(groups, this.#parseMatch(per, tm));

		return groups;
	}

	/** set {term} values for current DateTime */
	#setTerm(dateTime: Temporal.ZonedDateTime = this.#zdt) {
		allEntries(this.#local.terms)
			.forEach(([, term]) => {
				for (const [key, range] of term.entries()) {
					const order = [] as { nano: bigint, range: typeof range }[];

					/**
					 * the first thing to do is build an {order}[] which projects a DateTime range to cover the {dateTime} value.  
					 * for example: the 'quarter' {term} could yield (with {nano} equal to the actual Instant)
					 * [ {nano: 9999, range: {month: 7}}, {nano: 9999, range: {month: 10}}, {nano: 9999, range: {month: 1}}, {nano: 9999, range: {month: 4}} ]
					 */
					allEntries(range as Pick<Tempo.Range, Temporal.DateTimeUnit>)
						.filter(([unit]) => Tempo.elements.includes(unit))	// TODO: combine all {unit} into one object for .with()
						.forEach(([unit, nbr]) => {
							let nano = dateTime														// start with base dateTime
								.with({ [unit]: nbr })											// adjust to next term
								.epochNanoseconds;													// TODO: alter next-highest element (year, hour, etc) if term crosses boundary

							sortInsert(order, { nano, range }, 'nano');		// insert a {range} by ascending nanoseconds order
						})

					const firstRange = order.at(0)?.range;
					const lastRange = order.at(-1)?.range;
					if (isUndefined(firstRange) || isUndefined(lastRange))
						continue;

					// now we have the defined {term} cutoff dates defined,  add the low/high values
					order.splice(0, 0, { nano: Tempo.DATE.minTempo, range: lastRange });
					order.splice(-1, 0, { nano: Tempo.DATE.maxTempo, range: firstRange });

					// now we have the full {term} cutoff dates defined, try to find where the {dateTime} fits within that {range}
				}
			})
	}

	/** return a new object, with only numeric values */
	#num = (groups: Partial<Internal.RegExpGroups>) => {
		return Object.entries(groups)
			.reduce((acc, [key, val]) => {
				if (isNumeric(val))
					acc[key] = ifNumeric(val) as number;
				return acc;
			}, {} as Record<string, number>)
	}

	/** create new Tempo with {offset} property */
	#add = (arg: Tempo.Add) => {
		const mutate = 'add';
		const zdt = Object.entries(arg)													// loop through each mutation
			.reduce((zdt, [key, offset]) => {											// apply each mutation to preceding one
				const single = singular(key);
				const plural = single + 's';

				switch (`${mutate}.${single}`) {
					case 'add.year':
					case 'add.month':
					case 'add.week':
					case 'add.day':
					case 'add.hour':
					case 'add.minute':
					case 'add.second':
					case 'add.millisecond':
					case 'add.microsecond':
					case 'add.nanosecond':
						return zdt
							.add({ [plural]: offset });

					default:
						Tempo.#catch(this.#local.config, `Unexpected method(${mutate}), unit(${key}) and offset(${offset})`);
						return zdt;
				}

			}, this.#zdt)

		return new Tempo(zdt as unknown as typeof Temporal, this.#options);
	}

	/** create a new Tempo with {adjust} property */
	#set = (args: (Tempo.Add | Tempo.Set)) => {
		const zdt = Object.entries(args)												// loop through each mutation
			.reduce((zdt, [key, unit]) => {												// apply each mutation to preceding one
				const { mutate, offset, single } = ((key) => {
					switch (key) {
						case 'start':
						case 'mid':
						case 'end':
							return { mutate: key, offset: 0, single: singular(unit) }

						default:
							return { mutate: 'set', single: singular(key), offset: unit }
					}
				})(key);																						// IIFE to analyze arguments

				switch (`${mutate}.${single}`) {
					case 'set.period':
					case 'set.time':
					case 'set.date':
					case 'set.event':
					case 'set.dow':
						return this.#parse(offset, zdt);

					case 'set.year':
					case 'set.month':
					// case 'set.week':																// not defined
					case 'set.day':
					case 'set.hour':
					case 'set.minute':
					case 'set.second':
					case 'set.millisecond':
					case 'set.microsecond':
					case 'set.nanosecond':
						return zdt
							.with({ [single]: offset });

					case 'set.yy':
					case 'set.mm':
					// case 'set.ww':																	// not defined
					case 'set.dd':
					case 'set.hh':
					case 'set.mi':
					case 'set.ss':
					case 'set.ms':
					case 'set.us':
					case 'set.ns':
						const value = Tempo.map[single as keyof typeof Tempo.map];
						return zdt
							.with({ [value]: offset });

					case 'start.year':
						return zdt
							.with({ month: Tempo.MONTH.Jan, day: 1 })
							.startOfDay();

					case 'start.term':																// TODO
						return zdt;

					case 'start.month':
						return zdt
							.with({ day: 1 })
							.startOfDay();

					case 'start.week':
						return zdt
							.with({ day: this.dd - this.dow + Tempo.WEEKDAY.Mon })
							.startOfDay();

					case 'start.day':
						return zdt
							.startOfDay();

					case 'start.hour':
					case 'start.minute':
					case 'start.second':
						return zdt
							.round({ smallestUnit: offset, roundingMode: 'trunc' });

					// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					case 'mid.year':
						return zdt
							.with({ month: Tempo.MONTH.Jul, day: 1 })
							.startOfDay();

					case 'mid.term':																	// TODO: relevant?
						return zdt;

					case 'mid.month':
						return zdt
							.with({ day: Math.trunc(zdt.daysInMonth / 2) })
							.startOfDay();

					case 'mid.week':
						return zdt
							.with({ day: this.dd - this.dow + Tempo.WEEKDAY.Thu })
							.startOfDay();

					case 'mid.day':
						return zdt
							.round({ smallestUnit: 'day', roundingMode: 'trunc' })
							.add({ hours: 12 });

					case 'mid.hour':
						return zdt
							.round({ smallestUnit: 'hour', roundingMode: 'trunc' })
							.add({ minutes: 30 });

					case 'mid.minute':
						return zdt
							.round({ smallestUnit: 'minute', roundingMode: 'trunc' })
							.add({ seconds: 30 });

					case 'mid.second':
						return zdt
							.round({ smallestUnit: 'second', roundingMode: 'trunc' })
							.add({ milliseconds: 500 });

					// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					case 'end.year':
						return zdt
							.add({ years: 1 })
							.with({ month: Tempo.MONTH.Jan, day: 1 })
							.startOfDay()
							.subtract({ nanoseconds: 1 });

					case 'end.term':																	// TODO
						return zdt
							.subtract({ nanoseconds: 1 });

					case 'end.month':
						return zdt
							.add({ months: 1 })
							.with({ day: 1 })
							.startOfDay()
							.subtract({ nanoseconds: 1 });

					case 'end.week':
						return zdt
							.with({ day: this.dd - this.dow + Tempo.WEEKDAY.Sun + 1 })
							.startOfDay()
							.subtract({ nanoseconds: 1 });

					case 'end.day':
					case 'end.hour':
					case 'end.minute':
					case 'end.second':
						return zdt
							.round({ smallestUnit: offset, roundingMode: 'ceil' })
							.subtract({ nanoseconds: 1 });

					default:
						Tempo.#catch(this.#local.config, `Unexpected method(${mutate}), unit(${unit}) and offset(${single})`);
						return zdt;
				}
			}, this.#zdt)																					// start reduce with the Tempo zonedDateTime

		return new Tempo(zdt as unknown as typeof Temporal, this.#options);
	}

	#format = <K extends Tempo.Formats>(fmt: K): Tempo.Format[K] => {
		const bailOut = void 0 as unknown as Tempo.Format[K];		// allow for return of 'undefined'

		if (isNull(this.#tempo))
			return bailOut;																				// don't format <null> dates

		const groups = this.#parseMatch(fmt, Match.yearTerm);		// because a {term} can span a {year} value

		switch (true) {
			case fmt === Tempo.FORMAT.yearWeek:
				const offset = this.ww === 1 && this.mm === Tempo.MONTH.Dec;			// if late-Dec, add 1 to yy
				return asNumber(`${this.yy + +offset}${pad(this.ww)}`);

			case fmt === Tempo.FORMAT.yearMonth:
				return asNumber(`${this.yy}${pad(this.mm)}`);

			case fmt === Tempo.FORMAT.yearMonthDay:
				return asNumber(`${this.yy}${pad(this.mm)}${pad(this.dd)}`);

			case fmt === Tempo.FORMAT.logStamp:
				return asNumber(`${this.hh}${this.mi}${this.ss}.${this.ff}`);

			case isDefined(groups["yy"]) && isDefined(groups["term"]):
				const term = this.term[groups["term"]] ?? '{undefined term}';
				return term;																				// TODO: work out highest dateTime field

			default:
				const mer = asString(fmt).includes('HH')						// if 'twelve-hour' (uppercase 'HH') is present in fmtString,
					? this.hh >= 12 ? 'pm' : 'am'											// 	then noon or later is considered 'pm'
					: ''																							//	else no meridian am/pm suffix needed

				return asString(fmt)
					.replace(/:m{2}/gi, ':mi')												// special: intercept ':mm' which should properly be ':mi'
					.replace(/m{2}:/gi, 'mi:')
					.replace(/(hh)?(m[i|m])(ss)?/i, (_, hh, mi, ss) => {	// if 'hhmiss' without separators
						let res = '';
						res += isUndefined(hh) ? '' : pad(this.hh);
						res += isUndefined(hh) && isUndefined(ss) ? mi : pad(this.mi);
						res += isUndefined(ss) ? '' : pad(this.ss);
						return res;
					})
					.replace(/y{4}/g, pad(this.yy))
					.replace(/y{2}/g, pad(this.yy).substring(2, 4))
					.replace(/m{3}/gi, this.mmm)
					.replace(/m{2}/g, pad(this.mm))
					.replace(/d{3}/gi, this.ddd)
					.replace(/d{2}/g, pad(this.dd))
					.replace(/h{2}/g, pad(this.hh))
					.replace(/H{2}$/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh) + mer)
					.replace(/H{2}/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh))
					.replace(/:mi$/gi, ':' + pad(this.mi) + mer)			// append 'am' if 'mi' at end of fmtString, and it follows 'HH'
					.replace(/:mi/gi, ':' + pad(this.mi))
					.replace(/^mi/i, pad(this.mi))
					.replace(/:s{2}$/gi, ':' + pad(this.ss) + mer)		// append 'am' if 'ss' at end of fmtString, and it follows 'HH'
					.replace(/:s{2}/gi, ':' + pad(this.ss))
					.replace(/^ss/i, pad(this.ss))
					.replace(/ts/g, this.ts.toString())
					.replace(/ms/g, pad(this.ms, 3))
					.replace(/us/g, pad(this.us, 3))
					.replace(/ns/g, pad(this.ns, 3))
					.replace(/f{2}/g, `${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`)
					.replace(/w{2}/g, pad(this.ww))
					.replace(/dow/g, this.dow.toString())
					.replace(/day/g, this.day)
					.replace(/#(\w+)/g, ($1) => this.#local.term[$1].toString())
		}
	}

	/** calculate the difference between two Tempos  (past is positive, future is negative) */
	#until<U extends Tempo.DateTime | Tempo.Until>(arg?: U): U extends Tempo.Until ? U["unit"] extends Internal.PluralUnit ? number : Tempo.Duration : Tempo.Duration
	#until<U extends Tempo.DateTime | Tempo.Until>(arg?: U): number | Tempo.Duration {
		const { tempo, opts = {}, unit } = isObject(arg)
			? arg as Tempo.Until																	// if a Record detected, then assume Tempo.Until
			: { tempo: arg } as Tempo.Until;											// else build a Record and assume Tempo.Parameter["tempo"]
		const offset = new Tempo(tempo, opts);
		const duration = this.#zdt.until(offset.#zdt, { largestUnit: unit ?? 'years' });

		if (isUndefined(unit)) {																// return Duration as object
			const dur = { iso: duration.toString() } as Tempo.Duration;

			for (const getter of Tempo.durations)
				dur[getter] = duration[getter] ?? 0;								// init all duration-values to '0'

			return dur;
		} else {																								// sum-up the duration components
			return duration.total({ relativeTo: this.#zdt, unit });
		}
	}

	/** format the elapsed time between two Tempos (to nanosecond) */
	#since(arg?: Tempo.DateTime | Tempo.Until) {
		const { tempo, opts = {}, unit } = isObject(arg)
			? arg as Tempo.Until																	// if a Record passed, then assume Tempo.Until
			: { tempo: arg } as Tempo.Until;											// else build a Record and assume Tempo.Parameter["tempo"]
		const { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = this.#until({ tempo, opts });
		const since = `${pad(seconds)}.${pad(milliseconds, 3)}${pad(microseconds, 3)}${pad(nanoseconds, 3)}`;// default since

		switch (unit) {
			case 'days':
				return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${since}`
			case 'hours':
				return `${pad(hours)}:${pad(minutes)}:${since}`;
			case 'minutes':
				return `${pad(minutes)}:${since}`;
			case 'seconds':
				return since;

			case void 0:
			default:
				if (days !== 0)
					return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${since}`;
				if (hours !== 0)
					return `${pad(hours)}:${pad(minutes)}:${since}`;

				return `${pad(minutes)}:${since}`;
		}
	}
	// #endregion Instance private methods
}

// #region Tempo types / interfaces / enums ~~~~~~~~~~~~~~~~
export namespace Tempo {
	/** the value that Tempo will attempt to interpret as a valid ISO date / time */
	export type DateTime = string | number | bigint | Date | Tempo | typeof Temporal | undefined | null

	interface Mam {
		debug?: boolean;
	}
	/** the Options Object found in a json-file, or passed to a call to Tempo.Init({}) or 'new Tempo({}) */
	export type Options = Partial<{														// allowable settings to override configuration
		debug: boolean;																					// debug-points into the console.log
		catch: boolean;																					// Tempo will catch errors (else caller is responsible)
		timeZone: string;																				// the timeZone on which to base the Tempo
		calendar: string;																				// the Temporal.Calendar
		locale: string;																					// the locale (e.g. en-AU)
		pivot: number;																					// the pivot-year that determines current-or-previous century when year is only two-digits
		sphere: Tempo.Sphere;																		// the hemisphere (useful for determining 'season')
		timeStamp: Tempo.TimeStamp;															// granularity of new Tempo().ts
		monthDay: string | string[];														// Array of locale names that prefer 'mm-dd-yy' date order
		layout: Internal.InputFormat<Internal.StringPattern>;		// provide additional layouts to define patterns to help parse input
		event: Internal.StringTuple[];													// provide additional date-maps (e.g. xmas => '25 Dec')
		period: Internal.StringTuple[];													// provide additional time-maps (e.g. arvo => '3pm')
		terms: Internal.InputFormat<Tempo.Term>;								// provide additional term ranges (e.g. star => {Taurus, {day:21, month:5}, ...})
		value: Tempo.DateTime;																	// the {value} to interpret can be supplied in the Options argument
	}>

	/** drop the setup-only Options */
	type OptionsKeep = Omit<Options, "value" | "monthDay" | "layout">
	/**
	 * the Config that Tempo will use to interpret a Tempo.DateTime  
	 * derived from user-supplied options, else json-stored options, else reasonable-default options
	 */
	export interface Config extends Required<OptionsKeep> {
		version: string;																				// semantic version
		level: Enum<typeof Internal.LEVEL>,											// separate configurations 
		parse: Internal.Parse,																	// detail about how the Tempo constructor parsed the supplied value
		monthDay: { locale: string; timeZones: string[]; }[];		// Array of locales/timeZones that prefer 'mm-dd-yy' date order
		layout: Map<symbol, Internal.StringPattern[]>;					// coerce {layout} to Map<Symbol, (string | RegExp)[]>
	}

	/** Timestamp precision */
	export type TimeStamp = 'ss' | 'ms' | 'us' | 'ns'

	/** constructor parameter object */
	export interface Arguments {
		tempo?: Tempo.DateTime;
		opts?: Tempo.Options;
	}

	/** Configuration to use for #until() and #since() argument */
	export interface Until extends Tempo.Arguments {
		unit?: Internal.PluralUnit;
	}
	export type Mutate = 'start' | 'mid' | 'end'
	export type Set = Partial<Record<Tempo.Mutate, Temporal.DateTimeUnit | Internal.PluralUnit> &
		Record<'time' | 'period' | 'date' | 'event' | 'dow', string>>
	export type Add = Partial<Record<Temporal.DateTimeUnit | Internal.PluralUnit, number>>

	export type Range = Record<Temporal.DateTimeUnit | "order", number>
	type RangeExtend = Partial<Tempo.Range & Record<string | number, unknown>>				// allow for additional Range fields
	export type RangeMap = Record<string | number, RangeExtend>
	export type Term = Map<string | number, RangeExtend>
	export type Terms = Record<symbol, Tempo.Term>
	export type TermTuple = [term: string | number, range: RangeExtend]

	/** pre-configured format strings */
	export interface Format {
		[Tempo.FORMAT.dayDate]: string;
		[Tempo.FORMAT.dayTime]: string;
		[Tempo.FORMAT.dayFull]: string;
		[Tempo.FORMAT.dayStamp]: string;
		[Tempo.FORMAT.logStamp]: number;
		[Tempo.FORMAT.sortTime]: string;
		[Tempo.FORMAT.monthDay]: string;
		[Tempo.FORMAT.monthTime]: string;
		[Tempo.FORMAT.hourMinute]: string;
		[Tempo.FORMAT.yearWeek]: number;
		[Tempo.FORMAT.yearMonth]: number;
		[Tempo.FORMAT.yearMonthDay]: number;
		[Tempo.FORMAT.date]: string;
		[Tempo.FORMAT.time]: string;
		[str: string]: string | number;													// allow for user-supplied format-codes
	}
	export type Formats = keyof Tempo.Format

	export type Modifier = '=' | '-' | '+' | '<' | '<=' | '-=' | '>' | '>=' | '+='

	export interface FormatType {
		/** ddd, dd mmm yyyy */																	display: string;
		/** ddd, yyyy-mmm-dd */																	dayDate: string;
		/** ddd, yyyy-mmm-dd hh:mi */														dayTime: string;
		/** ddd, yyyy-mmm-dd hh:mi:ss */												dayFull: string;
		/** ddd, yyyy-mmm-dd hh:mi:ss.ff */											dayStamp: string;
		/** hhmiss.ff */																				logStamp: number;
		/** yyyy-mm-dd hh:mi:ss */															sortTime: string;
		/** ddd-mm */																						monthDay: string;
		/** yyyy-mmm-dd hh:mi */																monthTime: string;
		/** hh:mi */																						hourMinute: string;
		/** yyyyww */																						yearWeek: number;
		/** yyyymm */																						yearMonth: number;
		/** yyyymmdd */																					yearMonthDay: number;
		/** yyyy-mm-dd */																				date: string;
		/** hh:mi:ss */																					time: string;
	}

	export type Duration = Temporal.DurationLike & Record<"iso", string>

	export enum WEEKDAY { All, Mon, Tue, Wed, Thu, Fri, Sat, Sun }
	export enum WEEKDAYS { Everyday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday }
	export enum MONTH { All, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec }
	export enum MONTHS { Every, January, February, March, April, May, June, July, August, September, October, November, December }
	export enum DURATION { year, month, week, day, hour, minute, second, millisecond, microsecond, nanosecond }
	export enum DURATIONS { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds }
	export type Weekday = Exclude<keyof typeof Tempo.WEEKDAY, 'All'>
	export type Calendar = Exclude<keyof typeof Tempo.MONTH, 'All'>

	/** Compass points */
	export const COMPASS = enumify({
		North: 'north',
		East: 'east',
		South: 'south',
		West: 'west'
	})
	/** Hemisphere */
	export type Sphere = typeof Tempo.COMPASS.North | typeof Tempo.COMPASS.South | null

	/** pre-configured format names */
	type FORMAT = keyof typeof FORMAT
	export const FORMAT = enumify({
		display: 'ddd, dd mmm yyyy',
		dayDate: 'ddd, yyyy-mmm-dd',
		dayTime: 'ddd, yyyy-mmm-dd hh:mi',
		dayFull: 'ddd, yyyy-mmm-dd hh:mi:ss',										// useful for Sheets cell-format
		dayStamp: 'ddd, yyyy-mmm-dd hh:mi:ss.ff',								// day, date and time to nanosecond
		logStamp: 'hhmiss.ff',																	// useful for stamping logs 
		sortTime: 'yyyy-mm-dd hh:mi:ss',												// useful for sorting display-strings
		monthDay: 'dd-mmm',																			// useful for readable month and day
		monthTime: 'yyyy-mmm-dd hh:mi',													// useful for dates where dow is not needed
		hourMinute: 'hh:mi',																		// 24-hour format
		yearWeek: 'yyyyww',
		yearMonth: 'yyyymm',
		yearMonthDay: 'yyyymmdd',
		date: 'yyyy-mmm-dd',																		// just Date portion
		time: 'hh:mi:ss',																				// just Time portion
	})

	/** approx number of seconds per unit-of-time */
	export const TIME = enumify({
		year: 31_536_000,
		month: 2_628_000,
		week: 604_800,
		day: 86_400,
		hour: 3_600,
		minute: 60,
		second: 1,
		millisecond: .001,
		microsecond: .000_001,
		nanosecond: .000_000_001,
	})

	/** approxnumber of milliseconds per unit-of-time */
	export const TIMES = enumify({
		years: TIME.year * 1_000,
		months: TIME.month * 1_000,
		weeks: TIME.week * 1_000,
		days: TIME.day * 1_000,
		hours: TIME.hour * 1_000,
		minutes: TIME.minute * 1_000,
		seconds: TIME.second * 1_000,
		milliseconds: TIME.millisecond * 1_000,
		microseconds: TIME.microsecond * 1_000,
		nanoseconds: Number((TIME.nanosecond * 1_000).toPrecision(6)),
	})

	/** some useful Dates */
	export const DATE = enumify({
		epoch: 0,																								// TODO: is this needed / useful ?
		maxDate: new Date('9999-12-31T23:59:59'),
		minDate: new Date('1000-01-01T00:00:00'),
		maxTempo: Temporal.Instant.from('9999-12-31T23:59:59.999999999+00:00').epochNanoseconds,
		minTempo: Temporal.Instant.from('1000-01-01T00:00+00:00').epochNanoseconds,
	})
}
// #endregion Tempo types / interfaces / enums

// #region Namespace that doesn't need to be shared externally
namespace Internal {
	export const LEVEL = enumify({ Global: 'global', Local: 'local', });

	export type StringPattern = (string | RegExp)
	export type StringTuple = [string, string];

	export type InputFormat<T> = Record<string, T | T[]> | Record<string, T | T[]>[] | Map<string | symbol, T | T[]>

	export type Symbol = Record<string, symbol>
	export type Regexp = Record<string, RegExp>

	export type PluralUnit = Temporal.PluralUnit<Temporal.DateTimeUnit>

	export interface Shape {																	// 'global' and 'local' variables
		/** current defaults for all Tempo instances */					config: Tempo.Config,
		/** Object of settings related to Terms */							terms: Tempo.Terms,
		/** Symbol registry */																	symbols: Internal.Symbol,
		/** Tempo units to aid in parsing */										units: Internal.Regexp,
		/** Map of regex-patterns to match input-string */			patterns: Internal.RegexpMap,
	}

	export interface Parse {
		match?: string;																					// which pattern matched the input
		type: Types;																						// the type of the original input
		value: any;																							// the value of the original input
	}

	export type StringObject = Record<string, string>
	export type RegexpMap = Map<symbol, RegExp>
	export type RegExpGroups = NonNullable<RegExpMatchArray["groups"]>

	export type TimeStamps = Record<Tempo.TimeStamp, keyof Temporal.ZonedDateTime>
}
// #endregion Namespace

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/**
 * kick-start Tempo configuration with default config  
 * use top-level await to hold until Tempo is ready  
 */
await Tempo.init();

type Params<T> = {																					// Type for consistency in expected arguments
	(tempo?: Tempo.DateTime, options?: Tempo.Options): T;			// parse Tempo.DateTime, default to Temporal.Instant.now()
	(options: Tempo.Options): T;															// provide just Tempo.Options (use {value:'XXX'} for specific Tempo.DateTime)
}
type Fmt = {																								// used for the fmtTempo() shortcut
	<F extends Tempo.Formats>(fmt: F, tempo?: Tempo.DateTime, options?: Tempo.Options): Tempo.Format[F];
	<F extends Tempo.Formats>(fmt: F, options: Tempo.Options): Tempo.Format[F];
}

// shortcut functions to common Tempo properties / methods
/** check valid Tempo */			export const isTempo = (tempo?: unknown) => isType<Tempo>(tempo, 'Tempo');
/** current timestamp (ts) */	export const getStamp = ((tempo, options) => new Tempo(tempo, options).ts) as Params<number | bigint>;
/** create new Tempo */				export const getTempo = ((tempo, options) => new Tempo(tempo, options)) as Params<Tempo>;
/** format a Tempo */					export const fmtTempo = ((fmt, tempo, options) => new Tempo(tempo, options).format(fmt)) as Fmt;
