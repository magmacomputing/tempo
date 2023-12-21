import { Pledge } from '@module/shared/pledge.class.js';
import { asArray } from '@module/shared/array.library.js';
import { enumKeys } from '@module/shared/enum.library.js';
import { cleanify, clone } from '@module/shared/serialize.library.js';
import { getAccessors, purge } from '@module/shared/object.library.js';
import { asNumber, asInteger, isNumeric, split } from '@module/shared/number.library.js';
import { getContext, CONTEXT, getStore, setStore, sleep } from '@module/shared/utility.library.js';
import { asString, pad, singular, toProperCase, trimAll, } from '@module/shared/string.library.js';
import { asType, getType, isType, isEmpty, isNull, isNullish, isDefined, isUndefined, isString, isObject, isRegExp, isMap } from '@module/shared/type.library.js';

import type { Entries } from '@module/shared/type.library';

import '@module/shared/prototype.library.js';								// patch prototype

/** TODO: THIS IMPORT NEEDS TO BE REMOVED ONCE TEMPORAL IS SUPPORTED IN JAVASCRIPT RUNTIME */
import { Temporal } from '@js-temporal/polyfill';

/**
 * TODO: Localization options on output?  on input?  
 * this affects month-names, day-names, season-names !  
 */

// Const variables ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const Version = '0.0.1';																		// semantic version
const StorageKey = '_Tempo_';																// for stash in persistent storage

/**
 * user will need to know these in order to configure their own patterns  
 * a {unit} is a simple regex	json													(e.g. { yy: /(18|19|20|21)?\d{2}/ })  
 * unit keys are combined to build a {format}								(e.g. { ymd: ['yy', 'mm', 'dd' ] )  
 * formats are then built into a regex {pattern}						(e.g. { ymd: /^ ... $/ })  
 * the {pattern} will be used to parse a string | number in the constructor {DateTime} argument  
 */
const Units = {																							// define some components to help interpret input-strings
	yy: new RegExp(/(?<yy>(18|19|20|21)?\d{2})/),
	mm: new RegExp(/(?<mm>0?[1-9]|1[012]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/),
	dd: new RegExp(/(?<dd>0?[1-9]|[12][0-9]|3[01])/),
	dow: new RegExp(/(?<dow>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)(?:[\,\s]*)/),
	qtr: new RegExp(/(?<qtr>(?<=q)[1|2|3|4])/),
	hh: new RegExp(/(?<hh>[01]?\d|2[0-4])/),									// hh:  00 - 24
	mi: new RegExp(/(\:(?<mi>[0-5]\d))/),											// mi:  00 - 59
	ss: new RegExp(/(\:(?<ss>[0-5]\d))/),											// ss:	00 - 59
	ff: new RegExp(/(\.(?<ff>\d{1,9}))/),											// up-to 9-digits for fractional seconds
	mer: new RegExp(/(\s*(?<mer>am|pm))/),										// meridien am/pm suffix
	sep: new RegExp(/(?<sep>[\/\-\s\,]*)/),										// list of separators between date-components
	mod: new RegExp(/(?<mod>[\+\-\<\>][\=]?)?(?<nbr>\d*)\s*/),// modifiers (+,-,<,<=,>,>=)
} as Tempo.Units
// 2 computed Units ('tm' and 'dt') are added during 'Tempo.init()' and 'new Tempo()' (if defining a new Event or Period)

/**
 * Reasonable defaults for initial Tempo options
 */
const Default = {
	version: Version,
	pivot: 75,
	catch: false,
	debug: false,
	timeStamp: 'ms',
	calendar: 'iso8601',
	sphere: 'north',
	fiscal: 'Jan',
	monthDay: ['en-US', 'en-AS'],															// array of Locales that prefer 'mm-dd-yy' date order, https://en.wikipedia.org/wiki/Date_format_by_country
	format: new Map([																					// built-in formats to be checked, and in this order
		// ['ddmmyy', ['dow?', 'dd?', 'sep', 'mm', 'sep', 'yy?']],
		// ['mmddyy', ['dow?', 'mm', 'sep', 'dd?', 'sep', 'yy?']],
		['dow', ['mod?', 'dow', 'tm?']],												// special pattern, (only one that doesn't discard 'dow' unit) used for day-of-week calcs
		['ddmmyy', ['dow?', 'dd', 'sep', 'mm?', 'sep', 'yy?', /\s+/, 'tm?']],
		['mmddyy', ['dow?', 'mm?', 'sep', 'dd', 'sep', 'yy?', 'sep', 'tm?']],
		['yymmdd', ['dow?', 'yy', 'sep', 'mm', 'sep', 'dd?', 'sep', 'tm?']],
		// ['yymmdd', ['dow?', 'yy', 'sep', 'mm', 'sep', 'dd?']],
		['tm', ['tm']],																					// clock or period
		['dt', ['dt']],																					// calendar or event
		['evt', ['evt']],
		['qtr', ['yy', 'sep', 'qtr']],
	]),
	period: new Map([																					// built-in time-periods to be mapped
		['mid[ -]?night', '00:00'],
		['morning', '8:00'],
		['mid[ -]?morning', '10:00'],
		['mid[ -]?day', '12:00'],
		['noon', '12:00'],
		['after[ -]?noon', '15:00'],
		['evening', '18:00'],
		['night', '20:00'],
	]),
	event: new Map([																					// built-in date-events to be mapped
		['new.?years? ?eve', '31 Dec'],
		['nye', '31 Dec'],
		['new.?years?( ?day)?', '01 Jan'],
		['ny', '01 Jan'],
		['christmas ?eve', '24 Dec'],
		['christmas', '25 Dec'],
		['xmas ?eve', '24 Dec'],
		['xmas', '25 Dec'],
	]),
} as Tempo.Options

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
	// Static variables ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	static #ready = {
		static: new Pledge<boolean>('Static'),									// wait for static-blocks to settle
		init: new Pledge<boolean>('Init'),											// wait for Tempo.init() to settle
	}

	static #global = {
		/** current defaults for all Tempo instances */					config: {},
		/** Tempo units to aid in parsing */										units: { ...Units },
		/** Map of regex-patterns to match input-string */			patterns: new Map(),
		/** Tuple of settings related to a Month */							months: Array.from({ length: 13 }, () => ({})),
	} as Internal.Shape

	static #timeStamp = {																			// lookup object for Tempo().ts resolution
		ss: 'epochSeconds',
		ms: 'epochMilliseconds',
		us: 'epochMicroseconds',
		ns: 'epochNanoseconds',
	} as Internal.TimeStamps

	// Static private methods ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * {dt} is a special regex that combines date-related {units} (dd, mm -or- evt) into a pattern against which a string can be tested.  
	 * because it will include a list of events ('e.g. 'new_years' | 'xmas'), we need to rebuild it if the user adds a new event
	 */
	static #makeEvent(shape: Internal.Shape) {
		const locale = shape.config.monthDay										// find out if prefer {mmddyy} order
			.find(itm => itm.timeZones?.includes(shape.config.timeZone))?.locale// found an Intl.Locale which prefers {mmddyy} and contains our {timeZone}
		const events = [...shape.config.event.keys()]
			.map((key, idx) => `(?<evt${idx}>${key})`)
			.join('|')																						// make an 'Or' pattern for the event-keys
		shape.units['evt'] = new RegExp(`${events}`, 'i');			// set the units 'event' pattern

		const date = !isEmpty(locale)														// we have a {locale} which prefers {mmddyy}
			? Tempo.regexp('mm', 'sep', 'dd', 'sep', 'yy?', '/|/', 'evt')
			: Tempo.regexp('dd', 'sep', 'mm', 'sep', 'yy?', '/|/', 'evt')

		shape.units['dt'] = new RegExp(date.source.slice(1, -1), 'i');	// set the units {dt} pattern (without anchors)
	}

	/**
	 * {tm} is a special regex that combines time-related units (hh, mi, ss, ff, am -or- per) into a pattern against which a string can be tested.  
	 * because it will include a list of periods (e.g. 'midnight' | 'afternoon' ), we need to rebuild it if the user adds a new period
	 */
	static #makePeriod(shape: Internal.Shape) {
		const periods = [...shape.config.period.keys()]
			.map((key, idx) => `(?<per${idx}>${key})`)
			.join('|')																						// make an 'Or' pattern for the period-keys
		shape.units['per'] = new RegExp(`(?<per>${periods})`, 'i');			// set the units 'period' pattern

		const time = Tempo.regexp('hh', 'mi?', 'ss?', 'ff?', 'mer?', '/|/', 'per').source.slice(1, -1);
		shape.units['tm'] = new RegExp(`${time}`, 'i');					// set the units {tm} pattern (without anchors)
		shape.units['tzd'] = new RegExp(`(?<tzd>[+-]${time}|Z)`, 'i');
	}

	/**
	 * swap parsing-order of patterns (to suit different locales)  
	 * this allows the parser to interpret '04012023' as Apr-01-2023 instead of 04-Jan-2023  
	 */
	static #swap(shape: Internal.Shape) {
		const locale = shape.config.monthDay
			.find(itm => itm.timeZones?.includes(shape.config.timeZone))?.locale// found an Intl.Locale which prefers {mmddyy} and contains our {timeZone}
		const swap = [																					// regexs to swap (to change conform priority)
			['ddmmyy', 'mmddyy'],																	// swap {ddmmyy} for {mmddyy}
			['ddmmyytm', 'mmddyytm'],															// swap {ddmmyytm} for {mmddyytm}
		] as const;

		const formats = [...shape.config.format.entries()];			// get entries of each format mapping 
		let chg = false;																				// no need to rebuild, if no change

		swap
			.forEach(([pat1, pat2]) => {													// loop over each swap-tuple
				const idx1 = formats.findIndex(([key]) => key === pat1);	// 1st swap element exists in {formats}
				const idx2 = formats.findIndex(([key]) => key === pat2);	// 2nd swap element exists in {formats}

				if (idx1 === -1 || idx2 === -1)
					return;																						// no pair to swap

				const swap1 = (idx1 < idx2) && !isEmpty(locale);		// we have a {locale} and the 1st tuple was found earlier than the 2nd
				const swap2 = (idx1 > idx2) && isEmpty(locale);			// we dont have a {locale} and the 1st tuple was found later than the 2nd

				if (swap1 || swap2) {
					[formats[idx1], formats[idx2]] = [formats[idx2], formats[idx1]];	// since {formats} is an array, ok to swap inline
					chg = true;
				}
			})

		if (chg)
			shape.config.format = new Map(formats);								// rebuild Map in new parse order

		return locale;
	}

	/** setup meteorological seasons based on hemisphere */
	static #season(shape: Internal.Shape) {
		(shape.config.sphere !== Tempo.COMPASS.South
			? [void 0, 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter']
			: [void 0, 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer']
		)																												// 1=first, 2=mid, 3=last month of season
			.forEach((season, idx) => { if (idx !== 0) shape.months[idx].season = `${season}.${idx % 3 + 1}` as Tempo.Month["season"] });
	}

	// /** Northern -or- Southern hemisphere start of QTR1.  TODO: better checking */
	// static #startFiscal(sphere: Tempo.Sphere = Tempo.COMPASS.North) {
	// 	const start = sphere === Tempo.COMPASS.North ? Tempo.MONTH.Oct : Tempo.MONTH.Jul;
	// 	return Tempo.MONTH[start] as Tempo.Calendar;
	// }

	/** setup fiscal quarters, from a given start month */
	static #fiscal(shape: Internal.Shape) {
		shape.config.fiscal = (shape.config.fiscal
			&& Tempo.#prefix(shape.config.fiscal)									// conform the fiscal month name
			|| (shape.config.sphere === Tempo.COMPASS.North ? Tempo.MONTH.Oct : Tempo.MONTH.Jul));

		const start = enumKeys(Tempo.MONTH)
			.findIndex(mon => mon === Tempo.#prefix(shape.config.fiscal));
		if (start === -1)
			return;																								// cannot determine start-Month

		for (let i = start, mon = 1; i <= (start + 12); i++, mon++) {
			const idx = i % 13;																		// index into the Month
			if (idx !== 0) {
				const qtr = Math.floor((mon - 1) / 3) + 1;					// quarter increments every third iteration
				const offset = (mon - 1) % 3 + 1;										// 1=first, 2=mid, 3=last month of quarter
				shape.months[idx].quarter = qtr + (offset / 10) as Tempo.Month["quarter"];
			}
			else mon--
		}
	}

	/** properCase first letters of week-day/calendar-month */
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

		Reflect.deleteProperty(shape.config, 'sphere');					// timeZone does not observe DST
		return void 0;
	}

	/**
	 * conform input of Format / Event / Period options into a Map  
	 * This is needed because we allow the user to flexibly provide detail as an {} or an {}[] or a Map([])
	 * for example:    
	 * 	Tempo.init({ format: {'ddmm': ['dd', 'sep', 'mm']} })
	 * 	Tempo.init({ format: {'yy': /20\d{2}/, 'mm': /[0-9|1|2]\d/ } })
	 *	Tempo.init({ format: 'dow' })													(can be a single string)
	 *	Tempo.init({ format: ['dow?', / /, 'dd'] })						(dont have to provide a 'key' for the format)
	 *	Tempo.init({ format: new Map([['dow'],['yy']]) })			(unlikely, but can be a single unit-string)
	 *	Tempo.init({ format: new Map([['name1', ['dow','yy']], ['name2', ['mm', 'sep?', 'dd']]]) })

	 * 	Tempo.init({event: {'canada ?day': '01-Jun', 'aus(tralia)? ?day': '26-Jan'} })  
	 * 	Tempo.init({period: [{'morning tea': '09:30' }, {'elevenses': '11:00' }]})  
	 * 	new Tempo('birthday', {event: [{birth(day)?: '20-May'}, {anniversay: '01-Jul'}] })
	 */
	static #setConfig(config: Tempo.Config, ...options: (Tempo.Options | Tempo.Config)[]) {
		config['format'] ??= new Map();
		config['event'] ??= new Map();
		config['period'] ??= new Map();

		options.forEach(option => {
			(Object.entries(option) as Entries<Tempo.Options>)
				.forEach(([optKey, optVal]) => {
					const arg = asType(optVal);
					let map: Map<string, unknown>;
					let idx = -1;

					switch (optKey) {
						case 'format':
							map = config['format'];												// reference to the format-map

							switch (arg.type) {
								case 'Object':															// add key-value pairs to Map()
									Object.entries(arg.value)
										.forEach(([key, val]) => map.set(key, asArray(val)));
									break;

								case 'String':															// add string with unique key to Map()
									map.set(`usr${++idx}`, asArray(arg.value));
									break;

								case 'RegExp':															// add pattern with unique key to Map()
									map.set(`usr${++idx}`, asArray(arg.value.source));
									break;

								case 'Array':
									if (isObject(arg.value[0])) {							// add array of objects to Map()
										(arg.value as unknown as NonNullable<Record<string, Internal.StringPattern | Internal.StringPattern[]>>[])
											.forEach(obj => Object.entries(obj)
												.forEach(([key, val]) => map.set(key, asArray(val)))
											)
									} else {																	// add array of <string | RegExp> to Map()
										map.set(`usr${++idx}`, (arg.value as Internal.StringPattern[])
											.map(itm => isString(itm) ? itm : itm.source));
									}
									break;

								case 'Map':
									for (const [key, val] of arg.value as Map<string, Internal.StringPattern | Internal.StringPattern[]>)
										map.set(key, asArray(val));
									break;

								default:
									Tempo.#error(config, `Unexpected type for "format": ${arg.type}`);
									break;
							}

							break;

						case 'event':
						case 'period':
							map = config[optKey];													// reference to the config Map

							switch (arg.type) {
								case 'Object':
									Object.entries(arg.value)
										.forEach(([key, val]) => map.set(key, val));
									break;

								case 'Array':
									if (isObject(arg.value[0])) {							// add array of objects to Map()
										(arg.value as unknown as NonNullable<Internal.StringObject>[])
											.forEach(obj => Object.entries(obj)
												.forEach(([key, val]) => map.set(key, val))
											)
									} else {																	// add array of <string | RegExp> to Map()
										arg.value
											.forEach(itm => map.set(`usr${++idx}`, itm));
									}
									break;

								case 'String':															// we are only expecting a string-value
									map.set(`usr${++idx}`, arg.value);
									break;

								case 'Map':
									for (const [key, val] of arg.value as Map<string, string>)
										map.set(key, val);
									break;


								default:
									Tempo.#error(config, `Unexpected type for "${optKey}": ${arg.type}`);
							}
							break;

						case 'monthDay':
							config.monthDay = asArray(arg.value as string | string[])
								.map(locale => new Intl.Locale(locale))
								.map(locale => ({ locale: locale.baseName, timeZones: locale.timeZones }))
							break;

						case 'fiscal':
							config.fiscal = Tempo.#prefix(optVal);
							break;

						default:
							Object.assign(config, { [optKey]: optVal });	// just move the option to the config
							break;
					}
				})
		})

		return config;
	}

	/** build RegExp patterns */
	static #makePattern(shape: Internal.Shape) {
		shape.patterns.clear();																	// reset {patterns} Map

		for (const [key, fmt] of shape.config.format)
			shape.patterns.set(key, Tempo.regexp(Tempo.#global.units, ...fmt))
	}

	/**
	 * debug-and-catch  
	 * use debug:boolean to determine if to console.warn  
	 * use catch:boolean to determine whether to throw or return  
	 */
	static #error(config: Tempo.Config, msg: string) {
		if (config.debug)
			console.warn(msg);

		if (config.catch)
			return;

		throw new Error(msg);
	}

	// Static public methods ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * set a default configuration for a subsequent a 'new Tempo()' instance to inherit.  
	 * Tempo.#config is set from a) reasonable default values, then b) local storage, then c) 'init' argument values  
	 */
	static init = async (options: Tempo.Options = {}) => {
		return Promise.race([
			Tempo.#ready['static'].promise,												// wait until static-blocks are fully parsed
			sleep('Tempo setup timed out', Tempo.TIME.second * 2),// or two-seconds timeout
		])
			.then(_ => {
				if (Tempo.#ready['init'].status.state !== Pledge.STATE.Pending)
					Tempo.#ready['init'] = new Pledge<boolean>('Init')// reset Init Pledge

				if (isEmpty(options)) {															// if no options supplied, reset all
					const dateTime = Intl.DateTimeFormat().resolvedOptions();
					const [country] = dateTime.timeZone.toLowerCase().split('/');

					purge(Tempo.#global.config);											// remove previous config
					Object.assign(Tempo.#global.config, {							// some global locale-specific defaults
						level: Internal.LEVEL.Static,
						calendar: dateTime.calendar,
						timeZone: dateTime.timeZone,
						locale: dateTime.locale,
					})

					switch (country) {																// TODO: better country detection
						case 'australia':
							Object.assign(Tempo.#global.config, {
								sphere: Tempo.COMPASS.South,
								fiscal: Tempo.MONTH.Jul,
								locale: 'en-AU',
							});
							break;
						default:
					}

					Tempo.#setConfig(Tempo.#global.config, Default, Tempo.read());	// setup static Tempo defaults, overload with local-storage
				}

				Tempo.#setConfig(Tempo.#global.config, options);		// overload with init() argument {options}

				// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

				enumKeys(Tempo.MONTH)
					.forEach((mon, idx) => Tempo.#global.months[idx].name = mon);		// stash month-name into Tempo.#global.months

				Tempo.#dst(Tempo.#global);													// setup hemisphere
				Tempo.#season(Tempo.#global);												// setup seasons
				Tempo.#fiscal(Tempo.#global);												// setup fiscal quarters

				const locale = Tempo.#swap(Tempo.#global);					// determine if we need to swap the order of some {formats}
				if (locale && !options.locale)
					Tempo.#global.config.locale = locale;							// found an override locale based on timeZone
				Tempo.#global.config.locale = Tempo.#locale(Tempo.#global.config.locale);

				Tempo.#makeEvent(Tempo.#global);										// setup special Date unit (before patterns!)
				Tempo.#makePeriod(Tempo.#global);										// setup special Time unit (before patterns!)
				Tempo.#makePattern(Tempo.#global);									// setup Regex DateTime patterns

				if ((getContext().type === CONTEXT.Browser && options.debug !== false) || options.debug === true)
					console.log('Tempo: ', /**omit(*/Tempo.#global.config/**, 'format', 'period', 'event')*/);

				return true;
			})
			.catch(err => Tempo.#error(Tempo.#global.config, err.message))
			.finally(() => Tempo.#ready['init'].resolve(true))		// Tempo.init() has completed
	}

	/** read Options from persistent storage */
	static read() {
		return getStore(StorageKey, {}) as Partial<Tempo.Options>;
	}

	/** write Options into persistent storage */
	static write(config?: Tempo.Options) {
		setStore(StorageKey, config);
	}

	/** combine array of <string | RegExp> to a anchored, case-insensitive RegExp */
	static regexp: {
		(...regs: Internal.StringPattern[]): RegExp;
		(units: Tempo.Units, ...regs: Internal.StringPattern[]): RegExp;
	}
		= (units: Tempo.Units | Internal.StringPattern, ...regs: Internal.StringPattern[]) => {
			if (!isObject(units)) {
				regs.splice(0, 0, units);														// stash 1st argument into 'regs' array
				units = Tempo.#global.units;												// set units to static value
			}

			const names = {} as Record<string, boolean>;					// detect if a named-group is used more than once

			const regexes = regs.map(pat => {
				if (isRegExp(pat))																	// already a RegExp
					return pat;

				if (/^\/.*\/$/.test(pat))														// a string that looks like a RegExp  ("/.../")
					return new RegExp(pat.slice(1, -1));

				const isOpt = pat.endsWith('?') ? '?' : '';					// is pattern optional
				const match = isOpt ? pat.slice(0, -1) : pat;				// remove '?' from pattern

				const reg = names[match]
					? new RegExp(`(\\k<${match}>)`)										// back-reference to named-group
					: (units as Tempo.Units)[match] ?? Tempo.#global.units[match];	// lookup regexp

				names[match] = true;																// named-group is now used
				if (isUndefined(reg))																// unknown unit, cannot proceed
					throw new Error(`Cannot find user-pattern "${match}" in Tempo.units`);

				return isOpt
					? new RegExp(reg.source + '?', reg.flags)					// mark regexp 'optional'
					: reg
			})

			return new RegExp('^(' + regexes.map(regex => regex.source).join('') + ')$', 'i');
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
	 * can also be used to sort an array of Tempo's.  
	 * returns a new array
	 * ````
	 * const arr = [tempo1, tempo2, tempo3].sort(Tempo.compare)  
	 * ````
	 */
	static compare = (tempo1?: Tempo.DateTime | Tempo.Options, tempo2?: Tempo.DateTime | Tempo.Options) => {
		const opts1: Tempo.Options = {}, opts2: Tempo.Options = {};

		if (isObject(tempo1)) {
			Object.assign(opts1, tempo1);													// shift the 1st argument to the 2nd
			tempo1 = opts1.value;																	// and reset the 1st argument (else undefined)
			delete opts1.value;																		// no longer needed
		}
		if (isObject(tempo2)) {
			Object.assign(opts2, tempo2);													// shift the 1st argument to the 2nd
			tempo2 = opts2.value;																	// and reset the 1st argument (else undefined)
			delete opts2.value;																		// no longer needed
		}

		const one = new Tempo(tempo1, opts1), two = new Tempo(tempo2, opts2);
		return Number((one.nano > two.nano) || -(one.nano < two.nano)) + 0;
	}

	/** static method to create a new Tempo */
	static from = ((tempo, options) => new Tempo(tempo, options)) as Params<Tempo>;

	/** static method to access current epochNanoseconds */
	static now = () => Temporal.Now.instant().epochNanoseconds;

	/** static Tempo.Duration getter, where matched in Tempo.TIMES */
	static get durations() {
		return getAccessors<Temporal.DurationLike>(Temporal.Duration)
			.filter(key => enumKeys(Tempo.TIMES).includes(key));
	}

	/** static Tempo property getter */
	static get properties() {
		return getAccessors<Tempo>(Tempo)
	}

	/** Tempo global config settings */
	static get config() {
		return { ...Tempo.#global.config }
	}

	/** Tempo initial default settings */
	static get default() {
		return { ...Default }
	}

	/** array of regex patterns used when parsing Tempo.DateTime argument */
	static get patterns() {
		return Tempo.#global.patterns;
	}

	/** indicate when Tempo.init() is complete */
	static get ready() {
		return Tempo.#ready['static'].promise
			.then(() => Tempo.#ready['init'].promise)
	}

	/** end of static blocks */
	static {
		Tempo.#ready['static'].resolve(true);
	}

	// Instance Symbols    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** allow for auto-convert of Tempo to BigInt */
	[Symbol.toPrimitive](hint?: 'string' | 'number' | 'default') {
		if (this.#local.config.debug)
			console.log(`${getType(this)}.hint: ${hint}`);
		return this.nano;
	}

	/** iterate over Tempo properties */
	[Symbol.iterator]() {
		const props = Tempo.properties;													// array of 'getters'
		let idx = -1;

		return {
			next: () => ({ done: ++idx >= props.length, value: { property: props[idx], value: this[props[idx]] } }),
		}
	}

	/** dispose Tempo */
	[Symbol.dispose]() {																			// for future implementation
		if (this.config.debug)
			console.log('dispose: ', this.#tempo);
	}

	get [Symbol.toStringTag]() {															// default string description
		return 'Tempo';																					// hard-coded to avoid minification mangling
	}

	// Instance variables  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** constructor tempo */																	#tempo?: Tempo.DateTime;
	/** constructor options */																#options = {} as Tempo.Options;
	/** instantiation Temporal Instant */											#instant: Temporal.Instant;
	/** underlying Temporal ZonedDateTime */									#zdt!: Temporal.ZonedDateTime;
	/** prebuilt format layouts, for convenience */						fmt = {} as Tempo.Layout;
	/** instance values to complement static values */				#local = {
		/** instance configuration */															config: {} as Tempo.Config,
		/** instance units */																			units: {} as Tempo.Units,
		/** instance month objects */															months: {} as Tempo.Months,
		/** instance patterns */																	patterns: new Map() as Internal.RegexpMap,
	}

	// Constructor  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/**
	 * instantiate a new Tempo()
	 * @param tempo 		Value to interpret (default to Temporal.Now.instant())
	 * @param options 	Options to tailor the instance
	 */
	constructor(tempo?: Tempo.DateTime, options?: Tempo.Options);
	constructor(options: Tempo.Options);
	constructor(tempo?: Tempo.DateTime | Tempo.Options, options: Tempo.Options = {}) {

		this.#instant = Temporal.Now.instant();									// stash current Instant
		[this.#tempo, this.#options] = isObject(tempo)					// swap arguments, if Options is 1st
			? [({ ...tempo as Tempo.Options }).value, tempo as Tempo.Options]
			: [tempo, { ...options }]															// stash original values

		Object.assign(this.#local.config, Tempo.#global.config, { level: Internal.LEVEL.Instance })
		Tempo.#setConfig(this.#local.config, this.#options);		// start with {#global} config, overloaded with {options}

		this.#local.months = clone(Tempo.#global.months);				// start with static {months} object
		this.#local.units = clone(Tempo.#global.units);					// start with static {units} object

		/** first task is to parse the 'Tempo.Options' looking for overrides to Tempo.#global.config */
		/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

		// if a timeZone provided but no hemisphere, try to infer hemisphere based on daylight-savings  
		if (this.#local.config.timeZone !== Tempo.#global.config.timeZone && isUndefined(this.#options.sphere))
			Tempo.#dst(this.#local);

		// change of hemisphere, setup new Seasons / Fiscal start-month
		if (this.#local.config.sphere !== Tempo.#global.config.sphere) {
			Tempo.#season(this.#local);
			Tempo.#fiscal(this.#local);
		}

		// change of Fiscal month, setup new Quarters
		if (this.#local.config.fiscal !== Tempo.#global.config.fiscal) {
			const idx = Tempo.MONTH[this.#local.config.fiscal];		// change of fiscal-year start month

			if (this.#local.months[idx].quarter !== 1)						// supplied fiscal is not Q1 in #config.month
				Tempo.#fiscal(this.#local);
		}

		// change of Locale, swap 'dmy' pattern parse-order?
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
		if (isDefined(this.#options.format))
			Tempo.#makePattern(this.#local);											// set instance {patterns}

		if (this.#local.config.debug)
			console.log('tempo.config: ', this.config);						// show the resolved config options

		/** we now have all the info we need to instantiate a new Tempo                          */
		/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
		try {
			this.#zdt = this.#parse(this.#tempo);									// attempt to interpret the DateTime arg

			if (['iso8601', 'gregory'].includes(this.config.calendar)) {
				enumKeys(Tempo.LAYOUT)															// add all the pre-defined LAYOUTs to the instance (eg  Tempo().fmt.yearMonthDay)
					.forEach(key =>
						Object.assign(this.fmt, { [key]: this.format(Tempo.LAYOUT[key]) }));	// add-on short-cut layout codes
			}
		} catch (err) {
			Tempo.#error(this.config, `Cannot create Tempo: ${(err as Error).message}`);
			return {} as unknown as Tempo;												// TODO: need to return empty object?
		}
	}

	// Public getters	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** 4-digit year */																				get yy() { return this.#zdt.year }
	/** month: Jan=1, Dec=12 */																get mm() { return this.#zdt.month }
	/** day of month */																				get dd() { return this.#zdt.day }
	/** hours since midnight: 24-hour format */								get hh() { return this.#zdt.hour }
	/** minutes since last hour */														get mi() { return this.#zdt.minute }
	/** seconds since last minute */													get ss() { return this.#zdt.second }
	/** milliseconds since last second */											get ms() { return this.#zdt.millisecond }
	/** microseconds since last millisecond */								get us() { return this.#zdt.microsecond }
	/** nanoseconds since last microsecond */									get ns() { return this.#zdt.nanosecond }
	/** fractional seconds since last second */								get ff() { return Number(`0.${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`) }
	/** number of weeks */																		get ww() { return this.#zdt.weekOfYear }
	/** timezone */																						get tz() { return this.#zdt.timeZoneId }
	/** default as milliseconds since Unix epoch */						get ts() { return this.#zdt[Tempo.#timeStamp[this.#local.config.timeStamp]] as number | bigint }
	/** weekday: Mon=1, Sun=7 */															get dow() { return this.#zdt.dayOfWeek }
	/** short month name */																		get mmm() { return Tempo.MONTH[this.#zdt.month] }
	/** long month name */																		get mon() { return Tempo.MONTHS[this.#zdt.month] }
	/** short weekday name */																	get ddd() { return Tempo.WEEKDAY[this.#zdt.dayOfWeek] }
	/** long weekday name */																	get day() { return Tempo.WEEKDAYS[this.#zdt.dayOfWeek] }
	/** quarter: Q1-Q4 */																			get qtr() { return Math.trunc(this.#local.months[this.mm].quarter) }
	/** meteorological season: Spring/Summer/Autumn/Winter */	get season() { return this.#local.months[this.mm].season.split('.')[0] as keyof typeof Tempo.SEASON }
	/** nanoseconds (BigInt) since Unix epoch */							get nano() { return this.#zdt.epochNanoseconds }
	/** Instance configuration */															get config() { return { ...this.#local.config } }
	/** units since epoch */																	get epoch() {
		return {
			/** seconds since epoch */														ss: this.#zdt.epochSeconds,
			/** milliseconds since epoch */												ms: this.#zdt.epochMilliseconds,
			/** microseconds since epoch */												us: this.#zdt.epochMicroseconds,
			/** nanoseconds since epoch */												ns: this.#zdt.epochNanoseconds,
		} as Record<Tempo.TimeStamp, number | bigint>
	}

	// Public Methods	 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/** calc DateTime duration */															until<U extends Tempo.DateTime | Tempo.Until>(until?: U) { return this.#until(until) }
	/** format elapsed time */																since<S extends Tempo.DateTime | Tempo.Until>(since?: S) { return this.#since(since) }
	/** apply formatting */																		format<K extends Tempo.FormatKeys>(fmt: K) { return this.#format(fmt) }

	/** add date/time unit */																	add(mutate: Tempo.Add) { return this.#set(mutate) }
	/** set to start/mid/end/period of unit */								set(offset: Tempo.Set) { return this.#set(offset) }

	/** is valid Tempo */																			isValid() { return !isEmpty(this) }
	/** as Temporal.ZonedDateTime */													toDateTime() { return this.#zdt }
	/** as Temporal.Instant */																toInstant() { return this.#zdt.toInstant() }
	/** as Date object */																			toDate() { return new Date(this.#zdt.round({ smallestUnit: 'millisecond' }).epochMilliseconds) }
	/** as String */																					toString() { return this.#zdt.toString() }
	/** as Object */																					toJSON() { return { ...this.#local.config, value: this.toString() } }

	// Private methods	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** parse DateTime input */
	#parse(tempo?: Tempo.DateTime) {
		const today = this.#instant															// cast instantiation to current timeZone, calendar
			.toZonedDateTime({ timeZone: this.#local.config.timeZone, calendar: this.#local.config.calendar });
		const arg = this.#conform(tempo, today);								// if String or Number, conform the input against known patterns
		if (this.#local.config.debug)
			console.log('tempo.parse: ', arg);

		switch (arg.type) {
			case 'Null':																					// TODO: special Tempo for null?
			case 'Void':
			case 'Undefined':
				return today;

			case 'String':
			case 'Temporal.ZonedDateTime':
				try {
					return Temporal.ZonedDateTime.from(arg.value);		// attempt to parse value
				} catch {																						// fallback to browser's Date.parse() method
					Tempo.#error(this.#local.config, 'Cannot detect DateTime, fallback to Date.parse');
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
			case 'BigInt':																				// BigInt is not conformed against a Tempo.pattern
				const [prefix = '', suffix = ''] = arg.value.toString().split('.');
				const nano = BigInt(suffix.substring(0, 9).padEnd(9, '0'));
				const value = BigInt(prefix);
				let epoch: bigint;

				switch (true) {
					case !isEmpty(suffix):														// seconds, with a fractional sub-second
					case prefix.length <= 10:													// looks like 'seconds'
						epoch = value * BigInt(1_000_000_000) + nano;
						break;
					case prefix.length <= 13:													// looks like 'milliseconds'
						epoch = value * BigInt(1_000_000);
						break;
					case prefix.length <= 16:													// looks like 'microseconds'
						epoch = value * BigInt(1_000);
						break;
					default:																					// looks like 'nanoseconds'
						epoch = value;
						break;
				}
				return new Temporal.ZonedDateTime(epoch, this.#local.config.timeZone, this.#local.config.calendar);

			default:
				throw new Error(`Unexpected Tempo parameter type: ${arg.type}, ${arg.value}`);
		}
	}

	/** evaluate 'string | number' input against known patterns */
	#conform(tempo: Tempo.DateTime | undefined, today: Temporal.ZonedDateTime) {
		const arg = asType(tempo);

		if (!isType<string | number>(arg.value, 'String', 'Number'))
			return arg;																						// only conform String or Number against known patterns (not BigInt, etc)

		const value = trimAll(arg.value, /\(|\)/g);							// cast as String, remove \( \) and control-characters

		if (isString(arg.value)) {															// if original value is String
			if (isEmpty(value))																		// don't conform empty string
				return Object.assign(arg, { type: 'Void', value: void 0 });
			if (/^[0-9]+n$/.test(value))													// if string representation of BigInt literal
				return Object.assign(arg, { type: 'BigInt', value: asInteger(value) });
		} else {
			if (value.length <= 7) {         											// cannot reliably interpret small numbers:  might be 'ss' or 'yymmdd' or 'dmmyyyy'
				Tempo.#error(this.#local.config, 'Cannot safely interpret number with less than 8-digits: use string instead');
				return arg;
			}
		}

		const patterns = new Map([...this.#local.patterns, ...Tempo.#global.patterns]);
		for (const [key, reg] of patterns) {										// test against regular-expression patterns until a match is found			
			const pat = value.match(reg);													// return any matches

			if (isNull(pat) || isUndefined(pat.groups))						// if regexp named-groups not found
				continue;																						// 	skip this iteration
			Object.entries(pat.groups)														// remove undefined, null and empty named-groups
				.forEach(([key, val]) => isEmpty(val) && Reflect.deleteProperty(pat.groups!, key));
			const keys = Object.keys(pat.groups);									// useful for checking which groups were matched

			// if the weekday-pattern is detected, translate it into its calendar values
			if (isDefined(pat.groups['dow']))											// parse day-of-week
				Object.assign(pat.groups, this.#parseWeekday(pat.groups, today));

			// if the date-event pattern is detected, translate it into its calendar values  
			// we really are just expecting 'Day-Month' with optional 'Year' in the {events} tuple at this release
			const evt = keys.find(itm => itm.match(/^evt\d+$/));
			if (evt)
				Object.assign(pat.groups, this.#parseEvent(pat.groups, today));

			// resolve a month-name into a month-number.  (some browsers do not allow month-names)
			// eg.	May				-> 05
			if (isDefined(pat.groups['mm']) && !isNumeric(pat.groups['mm'])) {
				const mm = Tempo.#prefix(pat.groups['mm'] as Tempo.Calendar);

				pat.groups['mm'] = enumKeys(Tempo.MONTH)
					.findIndex(el => el === mm)
					.toString();
			}

			// if 'Q1' or 'Q2' specified, might need to adjust year
			const qtr = Number(pat.groups['qtr'] < '3');					// if Q1 or Q2, then need to adjust {yy} later on

			// resolve a quarter-number into a month-number
			if (isDefined(pat.groups['qtr'])) {
				const key = Number(`${pat.groups['qtr']}.1`);				// '.1' means start of quarter
				const idx = this.#local.months
					.findIndex(mon => mon.quarter === key);
				pat.groups['mm'] = pad(idx);												// set month to beginning of quarter
			}

			// if a time-period pattern was detected, translate it into its clock values
			if (isDefined(pat.groups['per'])) {										// re-test time-period against 'tm' pattern
				const per = this.#local.config.period.get(pat.groups['per']) ?? Tempo.#global.config.period.get('per');
				const lkp = this.#local.patterns.get('tm') ?? Tempo.#global.patterns.get('tm')
				if (lkp && per) {
					const { hh, mi, ss, ff, am } = per.match(lkp)?.groups || {};
					Object.assign(pat.groups, { hh, mi, ss, ff, am });
				}
			}

			// if a clock-value pattern was detected (at least {hh}), translate it into a UTC-time string
			if (isDefined(pat.groups['hh'])) {										// assemble into a hh:mm:ss value
				const am = pat.groups['mer'] as Tempo.Meridian;			// {am} or {pm}
				let hh = pat.groups['hh'];

				pat.groups['dd'] ??= today.day.toString();					// if no {dd}, use today
				if (hh === '24')																		// special for midnight, add one to day
					pat.groups['dd'] = pad(Number(pat.groups['dd']) + 1);

				hh = this.#midday(hh, am);													// adjust for midday offset (eg. 10pm => 22:00:00, 12:00am => 00:00:00)
				pat.groups['utc'] = `T${pad(hh)}:${pad(pat.groups['mi'])}:${pad(pat.groups['ss'])}`;

				if (pat.groups['ff'])
					pat.groups['utc'] += '.' + pat.groups['ff'];			// append fractional seconds
			}

			/**
			 * change two-digit year into four-digits using 'pivot-year' to determine century
			 * 22			-> 2022
			 * 34			-> 1934
			 */
			if (/^\d{2}$/.test(pat.groups['yy'])) {								// if yy match just-two digits
				const [, pivot] = split(today
					.subtract({ 'years': this.#local.config.pivot })				// arbitrary-years ago is pivot for century
					.year / 100, '.')																	// split on decimal-point
				const [century] = split(today.year / 100, '.');			// current century
				const yy = Number(pat.groups['yy']);								// as number
				pat.groups['yy'] = `${century - Number(yy > pivot)}${pat.groups['yy']}`;
			}

			/**
			 * finished analyzing a matched pattern.  
			 * now rebuild 'arg' into a string that Temporal can recognize
			 */
			Object.assign(arg, {
				type: 'String',
				value: `
						${pad(((Number(pat.groups['yy']) || today.year) - qtr), 4)}-\
						${pad(Number(pat.groups['mm']) || today.month)}-\
						${pad(Number(pat.groups['dd']) || '1')}\
						${pat.groups['utc'] ?? ''}`
					.trimAll(/\t/g) + 																// remove <tab> and redundant <space>
					`[${this.#local.config.timeZone}]` +							// append timeZone
					`[u-ca=${this.#local.config.calendar}]`						// append calendar
			})

			if (this.#local.config?.debug)												// show the pattern that was matched, and the conformed value
				console.log('Tempo.match: "%s", ', key, JSON.stringify(pat.groups));
			break;																								// stop checking patterns
		}

		return arg;
	}

	/**
	 * use the 'am | pm' arg to check the 'hh' clock value  
	 * returns 'hh' in 12-hour format
	 */
	#midday(hh: string | number, mer?: Tempo.Meridian) {
		let hour = Number(hh);

		if (mer?.toLowerCase() === 'pm' && hour < 12)
			hour += 12;
		if (mer?.toLowerCase() === 'am' && hour >= 12)
			hour -= 12;
		if (hour === 24)
			hour = 0;																							// special for 'midnight'

		return pad(hour);																				// pad with leading zeroes
	}

	/**
	 * We expect similar logic to apply to 'modifiers' when parsing a string DateTime.  
	 *  -			-> previous period  
	 *  +			-> next period  
	 * -3			-> three periods ago  
	 * <			-> prior to base-date (asIs)  
	 * <=			-> prior to base-date plus one  
	 */
	#parseModifier({ mod: modifier, adjust, offset, toBe }: { mod?: Tempo.Modifier, adjust: number, offset: number, toBe: number }) {
		switch (modifier) {
			case void 0:
			case '=':
				return 0
			case '+':
				return adjust;
			case '-':
				return -adjust;
			case '<':
				return (toBe <= offset)
					? -adjust
					: 0
			case '<=':
			case '-=':
				return (toBe < offset)
					? -adjust
					: 0
			case '>':
				return (toBe >= offset)
					? adjust
					: 0
			case '>=':
			case '+=':
				return (toBe > offset)
					? adjust
					: 0
			default:
				return 0;
		}
	}

	/**
	 * 
	 * if named-group 'dow' detected (with optional 'mod', 'nbr', and time-units), then calc relative weekday offset
	 *   Wed		-> Wed this week															might be earlier or later or equal to current day
	 *  -Wed		-> Wed last week															same as new Tempo('Wed').add({ weeks: -1 })
	 *  +Wed		-> Wed next week															same as new Tempo('Wed').add({ weeks:  1 })
	 * -3Wed		-> Wed three weeks ago  											same as new Tempo('Wed').add({ weeks: -3 })
	 *  <Wed		-> Wed prior to today 												might be current or previous week
	 * <=Wed		-> Wed prior to tomorrow											might be current or previous week
	 *  Wed noon-> Wed this week at 12:00pm										also allow for time-period specifiers (in #parsePeriod)
	 */
	#parseWeekday(group: Internal.StringObject, zdt: Temporal.ZonedDateTime) {
		const { dow, mod, nbr, ...rest } = group as { dow: Tempo.Weekday, mod: Tempo.Modifier, nbr: string };

		// the 'dow' pattern might contain 'time' units	 (hh, mi, per), but they are parsed separately
		if (Object.keys(rest).every(el => ['hh', 'mi', 'ss', 'ff', 'mer', 'per'].includes(el))) {
			const weekday = Tempo.#prefix(dow);
			const offset = enumKeys(Tempo.WEEKDAY).findIndex(el => el === weekday);
			const adjust = zdt.daysInWeek * Number(isEmpty(nbr) ? '1' : nbr);

			const days = offset - zdt.dayOfWeek										// number of days to offset from today
				+ this.#parseModifier({ mod, adjust, offset, toBe: zdt.dayOfWeek })

			const { year, month, day } = zdt.add({ days });
			group['yy'] = pad(year, 4);														// set the now current year
			group['mm'] = pad(month, 2);													// and month
			group['dd'] = pad(day, 2);														// and day
		}

		return group;																						// return the calculated {yy, mm, dd} 
	}

	/**
	 * match input against 'tm' pattern.  
	 * input is a period-id (like 'midnight' or 'noon') or a time-string (like '10:30am')  
	 * returns a 'hh:mm:ss.ff' string.  
	 */
	#parsePeriod(time: string) {
		const per = this.#local.config.period.get(time);
		const pat = this.#local.patterns.get('tm');//.find(pat => pat.key === 'tm');

		if (!pat)																								// cannot find 'tm' Pattern
			return '00:00:00';
		if (per)																								// if arg is a Period,
			time = per;																						// 	then substitute the associated 'time' string

		const match = time.match(pat);													// match the time-string against the 'tm' Pattern
		if (!match?.groups)																			//	else early exit
			return '00:00:00';

		// the 'match' result against the 'tm' RegExp should return named-group strings for 'hh', 'mi', 'ss' and 'mer'
		let { hh = '0', mi = '0', ss = '0', ms = '0', us = '0', ns = '0', mer } = match.groups;

		hh = this.#midday(hh, <Tempo.Meridian>mer);							// adjust for am/pm offset (eg. 10pm => 22:00:00, 12:00am => 00:00:00)

		return `${pad(hh, 2)}:${pad(mi, 2)}:${pad(ss, 2)}.${pad(ms, 3)}${pad(us, 3)}${pad(ns, 3)}`;
	}

	/**
	 * match input against 'evt' pattern.  
	 * @input event is the object that contains the RegExp named group key-pairs  
	 * for example, 'evt7' refers to the Tempo.Events[7] tuple, like ['xmas', '25-Dec']  
	 * @returns a {yy, mm, dd} object  
	 */
	#parseEvent(group: Internal.StringObject, zdt: Temporal.ZonedDateTime) {
		const { mod, nbr, ...rest } = cleanify(group) as { mod: Tempo.Modifier, nbr: string };
		const adjust = Number(isEmpty(nbr) ? '1' : nbr);
		const evt = Object.keys(rest)
			.find(itm => itm.match(/^evt\d+$/));
		const date = { yy: zdt.year, mm: zdt.month, dd: zdt.day };

		if (isUndefined(evt)) {
			Tempo.#error(this.config, 'Invalid event key');				// catch
			return date;																					// return default
		}

		const eventDate = this.#local.config.event.get(evt) ?? Tempo.#global.config.event.get(evt);
		if (isUndefined(eventDate)) {
			Tempo.#error(this.config, `No definition for Event key: ${evt}`);
			return date;
		}

		const dmy = this.#local.patterns.get('ddmmyy');
		const ymd = this.#local.patterns.get('yymmdd');
		const grp = {} as Internal.StringObject;								// RegExp.groups on a match

		if (dmy) {
			const match = eventDate.match(dmy)?.groups;						// try a match on 'dmy' first
			if (match)
				Object.assign(grp, match);
		}
		if (isEmpty(grp) && ymd) {
			const match = eventDate.match(ymd)?.groups;						// try a match on 'ymd' if 'dmy' failed
			if (match)
				Object.assign(grp, match);
		}

		if (isDefined(grp['mm']) && !isNumeric(grp['mm'])) {		// some browsers do not like non-numeric months (like 'May')
			const mm = Tempo.#prefix(grp['mm'] as Tempo.Calendar);

			grp['mm'] = pad(enumKeys(Tempo.MONTH).findIndex(el => el === mm), 2);
		}

		let [yy, mm, dd] = (({ yy, mm, dd }) => [isNullish(yy) ? zdt.year : +yy, isNullish(mm) ? zdt.month : +mm, isNullish(dd) ? zdt.day : +dd])(grp);
		const offset = Number(pad(mm, 2) + '.' + pad(dd, 2));		// the event month.day
		const base = Number(pad(zdt.month, 2) + '.' + pad(zdt.day + 1, 2));

		// adjust the 'yy' if a Modifier is present
		yy += this.#parseModifier({ mod, adjust, offset, toBe: base })

		Object.assign(date, cleanify(grp), { yy: pad(yy, 4) });	// remove Undefined

		return date;
	}

	/**
	 * retrieve an element from a {#local} else {#global} config
	 */
	#getConfig(...keys: string[]) {
		function lkp(local: any, global: any, ...keys: string[]) {
			const [key, ...rest] = keys;

			if (isNullish(local) && isNullish(global))
				return void 0;																			// ran out of values
			if (isNullish(key))
				return local ?? global;															// ran out of keys

			if (isMap(local))
				return local.get(key);															// check {local} first
			if (isMap(global))
				return global.get(key);															// check {global} next

			return lkp(local?.[key], global?.[key], ...rest);
		}

		return lkp(this.#local, Tempo.#global, ...keys);
	}

	/** create a new offset Tempo */
	#set = (args: (Tempo.Add | Tempo.Set)) => {
		const zdt = Object.entries(args)												// loop through each mutation
			.reduce((zdt, [key, unit]) => {												// apply each mutation to preceding one
				const { mutate, offset, single } = ((key) => {
					switch (key) {
						case 'start':
						case 'mid':
						case 'end':
							return { mutate: key, offset: 0, single: singular(unit) }

						case 'period':
						case 'event':
							return { mutate: 'set', offset: unit, single: key }

						default:
							return { mutate: 'add', offset: Number(unit), single: singular(key) }
					}
				})(key);																						// IIFE to analyze arguments
				const plural = single + 's';												// Temporal durations require plural

				switch (`${mutate}.${single}`) {
					// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					case 'set.period':
						const period = offset as string;
						// const tm = this.#local.config.period.get(period) ?? Tempo.#global.config.period.get(period);
						const tm = this.#getConfig('config', 'period');

						if (isUndefined(tm)) {
							if (this.#local.config.debug)
								Tempo.#error(this.#local.config, `Cannot determine period: ${period}`);
							return zdt;
						}
						return zdt
							.withPlainTime(this.#parsePeriod(tm));				// mutate the period 'clock'

					case 'set.event':
						const pat = this.#local.patterns.get('evt') ?? Tempo.#global.patterns.get('evt');

						if (isUndefined(pat)) {													// cannot find the 'evt' pattern
							Tempo.#error(this.config, 'Cannot find event patterns');
							return zdt;
						}

						const evt = offset.match(pat)?.groups ?? {};		// for example, {evt7: "xmas"}
						const { yy: year, mm: month, dd: day } = this.#parseEvent(evt, zdt);

						return zdt
							.withPlainDate({ year, month, day });					// mutate the event 'date'

					// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					case 'start.year':
						return zdt
							.with({ month: Tempo.MONTH.Jan, day: 1 })
							.startOfDay();

					case 'start.season':
						const season1 = this.#local.months.findIndex(mon => mon.season === (this.season + .1));
						return zdt
							.with({ day: 1, month: season1 })
							.startOfDay();

					case 'start.quarter':
					case 'start.qtr':
						const qtr1 = this.#local.months.findIndex(mon => mon.quarter === (this.qtr + .1));
						return zdt
							.with({ day: 1, month: qtr1 })
							.startOfDay();

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

					case 'mid.season':
						const season2 = this.#local.months.findIndex(mon => mon.season === (this.season + .2));
						return zdt
							.with({ day: Math.trunc(zdt.daysInMonth / 2), month: season2 })
							.startOfDay();

					case 'mid.quarter':
					case 'mid.qtr':
						const qtr2 = this.#local.months.findIndex(mon => mon.quarter === (this.qtr + .2));
						return zdt
							.with({ day: Math.trunc(zdt.daysInMonth / 2), month: qtr2 })
							.startOfDay();

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

					case 'end.season':
						const season3 = this.#local.months.findIndex(mon => mon.season === (this.season + .3));
						return zdt
							.with({ month: season3 })
							.add({ months: 1 })
							.with({ day: 1 })
							.startOfDay()
							.subtract({ nanoseconds: 1 });

					case 'end.quarter':
					case 'end.qtr':
						const qtr3 = this.#local.months.findIndex(mon => mon.quarter === (this.qtr + .3));
						return zdt
							.with({ month: qtr3 })
							.add({ months: 1 })
							.with({ day: 1 })
							.startOfDay()
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

					// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					case 'add.year':
					case 'add.month':
					case 'add.week':
					case 'add.day':
					case 'add.hour':
					case 'add.minute':
					case 'add.second':
						return zdt
							.add({ [plural]: offset });

					case 'add.season':
					case 'add.quarter':
					case 'add.qtr':
						return zdt
							.add({ months: offset * 3 });

					default:
						throw new Error(`Unexpected method(${mutate}), unit(${unit}) and offset(${single})`);
				}
			}, this.#zdt)																					// start reduce with the Tempo zonedDateTime

		return new Tempo(zdt as unknown as typeof Temporal, this.#options);
	}

	#format = <K extends Tempo.FormatKeys>(fmt: K): Tempo.Format[K] => {
		const bailOut = void 0 as unknown as Tempo.Format[K];		// allow for return of 'undefined'

		if (isNull(this.#tempo))
			return bailOut;																				// don't format <null> dates

		switch (fmt) {
			case Tempo.LAYOUT.yearWeek:
				const offset = this.ww === 1 && this.mm === Tempo.MONTH.Dec;			// if late-Dec, add 1 to yy
				return asNumber(`${this.yy + Number(offset)}${pad(this.ww)}`);

			case Tempo.LAYOUT.yearMonth:
				return asNumber(`${this.yy}${pad(this.mm)}`);

			case Tempo.LAYOUT.yearMonthDay:
				return asNumber(`${this.yy}${pad(this.mm)}${pad(this.dd)}`);

			case Tempo.LAYOUT.yearQuarter:
				if (isUndefined(this.#local.months[this.mm]?.quarter)) {
					Tempo.#error(this.#local.config, 'Cannot determine "yearQuarter"');
					return bailOut;
				}

				const [full, part] = split(this.#local.months[this.mm].quarter);
				const mon = (full - 1) * 3 + part - 1;
				const yy = this.#zdt.with({ day: 1 }).add({ months: -mon }).add({ months: 11 }).year;

				return `${yy}Q${this.qtr}`;

			default:
				const am = asString(fmt).includes('HH')							// if 'twelve-hour' (uppercase 'HH') is present in fmtString,
					? this.hh >= 12 ? 'pm' : 'am'											// noon and later is considered 'pm'
					: ''																							// else no am/pm suffix needed

				return asString(fmt)
					.replace(/y{4}/g, pad(this.yy))
					.replace(/y{2}/g, pad(this.yy).substring(2, 4))
					.replace(/m{3}/gi, this.mmm)
					.replace(/m{2}/g, pad(this.mm))
					.replace(/d{3}/gi, this.ddd)
					.replace(/d{2}/g, pad(this.dd))
					.replace(/h{2}/g, pad(this.hh))
					.replace(/H{2}$/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh) + am)
					.replace(/H{2}/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh))
					.replace(/mi$/gi, pad(this.mi) + am)							// append 'am' if 'MI' at end of fmtString, and it follows 'HH'
					.replace(/mi/gi, pad(this.mi))
					// .replace(/mi/g, pad(this.mi))
					.replace(/s{2}$/gi, pad(this.ss) + am)						// append 'am' if 'SS' at end of fmtString, and it follows 'HH'
					.replace(/s{2}/gi, pad(this.ss))
					// .replace(/s{2}/g, pad(this.ss))
					.replace(/ts/g, this.ts.toString())
					.replace(/ms/g, pad(this.ms, 3))
					.replace(/us/g, pad(this.us, 3))
					.replace(/ns/g, pad(this.ns, 3))
					.replace(/f{2}/g, `${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`)
					.replace(/w{2}/g, pad(this.ww))
					.replace(/dow/g, this.dow.toString())
					.replace(/day/g, this.day)
					.replace(/qtr/g, this.qtr.toString())
		}
	}

	/** calculate the difference between two Tempos  (past is positive, future is negative) */
	#until<U extends Tempo.DateTime | Tempo.Until>(arg?: U): U extends Tempo.Until ? U["unit"] extends Tempo.DiffUnit ? number : Tempo.Duration : Tempo.Duration
	#until<U extends Tempo.DateTime | Tempo.Until>(arg?: U): number | Tempo.Duration {
		const { tempo, opts, unit } = isObject(arg)
			? arg as Tempo.Until																	// if a Record detected, then assume Tempo.Until
			: { tempo: arg } as Tempo.Until;											// else build a Record and assume Tempo.Parameter["tempo"]
		const offset = new Tempo(tempo, opts).#zdt;
		const dur = {} as Tempo.Duration;

		const duration = this.#zdt.until(offset, { largestUnit: unit === 'quarters' || unit === 'seasons' ? 'months' : (unit || 'years') });
		for (const getter of Tempo.durations)
			dur[getter] = duration[getter] ?? 0;									// init all duration-values to '0'

		Object.assign(dur, {
			iso: duration.toString(),
			quarters: Math.floor(duration.months / 3),
			seasons: Math.floor(duration.months / 3),
		})

		switch (unit) {
			case void 0:																					// return Duration as object
				return dur;

			case 'quarters':																			// four quarters per year
			case 'seasons':																				// four seasons per year
				return (duration.months / 3) + (duration.years * 4);// three months = 1 quarter | season

			default:																							// sum-up the duration components
				return duration.total({ relativeTo: this.#zdt, unit });
		}
	}

	/** format the elapsed time between two Tempos (to milliseconds) */
	#since(arg?: Tempo.DateTime | Tempo.Until) {
		const { tempo, opts, unit } = isObject(arg)
			? arg as Tempo.Until																	// if a Record passed, then assume Tempo.Until
			: { tempo: arg } as Tempo.Until;											// else build a Record and assume Tempo.Parameter["tempo"]
		const { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = this.#until({ tempo, opts });
		const since = `${pad(seconds)}.${pad(milliseconds, 3)}`;// default since

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
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Tempo types / interfaces / enums
export namespace Tempo {
	/** the value that Tempo will attempt to interpret as a valid ISO date / time */
	export type DateTime = string | number | bigint | Date | Tempo | typeof Temporal | null

	/** the Options Object found in a json-file, or passed to a call to Tempo.Init({}) or 'new Tempo({}) */
	export interface Options {																// allowable settings to override configuration
		debug?: boolean;																				// debug-points into the console.log
		catch?: boolean;																				// Tempo will catch errors (else caller is responsible)
		timeZone?: string;																			// the timeZone on which to base the Tempo
		calendar?: string;																			// the Temporal.Calendar
		locale?: string;																				// the locale (e.g. en-AU)
		pivot?: number;																					// the pivot-year that determines current-or-previous century when year is only two-digits
		sphere?: Tempo.Sphere;																	// the hemisphere (useful for determining 'season')
		fiscal?: Tempo.Calendar;																// the start-month of the fiscal calendar (e.g. 'Jul')
		timeStamp?: Tempo.TimeStamp;														// granularity of new Tempo().ts
		monthDay?: string | string[];														// Array of locale names that prefer 'mm-dd-yy' date order
		format?: Internal.InputFormat<Internal.StringPattern>;	// provide additional format-patterns to help parse input
		event?: Internal.InputFormat<string>;										// provide additional date-maps (e.g. xmas => '25 Dec')
		period?: Internal.InputFormat<string>;									// provide additional time-maps (e.g. arvo => '3pm')
		value?: Tempo.DateTime;																	// the {value} to interpret can be supplied in the Options argument
	}

	/**
	 * the Config that Tempo will use to interpret a Tempo.DateTime  
	 * derived from user-supplied options, else json-stored options, else reasonable-default options
	 */
	export interface Config extends Required<Omit<Options, "value" | "monthDay" | "format" | "event" | "period">> {
		level: Internal.LEVEL,																	// separate configurations 
		version: string;																				// semantic version
		monthDay: { locale: string; timeZones: string[]; }[];		// Array of locales/timeZones that prefer 'mm-dd-yy' date order
		format: Map<string, Internal.StringPattern[]>;
		event: Map<string, string>;
		period: Map<string, string>;
	}

	/** Timestamp precision */
	export type TimeStamp = 'ss' | 'ms' | 'us' | 'ns'

	export type TimeUnit = Temporal.DateTimeUnit | 'quarter' | 'season'
	export type DiffUnit = Temporal.PluralUnit<Temporal.DateTimeUnit> | 'quarters' | 'seasons'
	export type Meridian = 'am' | 'pm'

	export type Units = Record<string, RegExp>

	/** constructor parameter object */
	export interface Arguments {
		tempo?: Tempo.DateTime;
		opts?: Tempo.Options;
	}

	/** Configuration to use for #until() and #since() argument */
	export interface Until extends Tempo.Arguments {
		unit?: Tempo.DiffUnit;
	}
	export type Mutate = 'start' | 'mid' | 'end'
	export type Set = Partial<Record<Tempo.Mutate, Tempo.TimeUnit | Tempo.DiffUnit> & Record<'period', Internal.StringObject> & Record<'event', Internal.StringObject>>
	export type Add = Partial<Record<Tempo.TimeUnit | Tempo.DiffUnit, number>>

	/** detail about a Month */
	export type Month = {
		name: keyof typeof Tempo.MONTH;
		season: `${keyof typeof Tempo.SEASON}.${1 | 2 | 3}`;
		quarter: 1 | 2 | 3 | 4;
	}
	/** tuple of 13 months */
	export type Months = [Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month]

	/** pre-configured layout strings */
	export interface Format {
		[Tempo.LAYOUT.display]: string;
		[Tempo.LAYOUT.dayDate]: string;
		[Tempo.LAYOUT.dayTime]: string;
		[Tempo.LAYOUT.dayFull]: string;
		[Tempo.LAYOUT.dayStamp]: string;
		[Tempo.LAYOUT.logStamp]: string;
		[Tempo.LAYOUT.sortTime]: string;
		[Tempo.LAYOUT.monthDay]: string;
		[Tempo.LAYOUT.monthTime]: string;
		[Tempo.LAYOUT.hourMinute]: string;
		[Tempo.LAYOUT.yearWeek]: number;
		[Tempo.LAYOUT.yearMonth]: number;
		[Tempo.LAYOUT.yearMonthDay]: number;
		[Tempo.LAYOUT.yearQuarter]: string;
		[Tempo.LAYOUT.date]: string;
		[Tempo.LAYOUT.time]: string;
		[str: string]: string | number;													// allow for dynamic format-codes
	}
	export type FormatKeys = keyof Tempo.Format

	export type Modifier = '=' | '-' | '+' | '<' | '<=' | '-=' | '>' | '>=' | '+='

	export interface Layout {
		/** ddd, dd mmm yyyy */																	display: string;
		/** ddd, yyyy-mmm-dd */																	dayDate: string;
		/** ddd, yyyy-mmm-dd hh:mi */														dayTime: string;
		/** ddd, yyyy-mmm-dd hh:mi:ss */												dayFull: string;
		/** ddd, yyyy-mmm-dd hh:mi:ss.ff */											dayStamp: string;
		/** hhmiss.ff */																				logStamp: string;
		/** yyyy-mm-dd hh:mi:ss */															sortTime: string;
		/** ddd-mm */																						monthDay: string;
		/** yyyy-mmm-dd hh:mi */																monthTime: string;
		/** hh:mi */																						hourMinute: string;
		/** yyyyww */																						yearWeek: number;
		/** yyyymm */																						yearMonth: number;
		/** yyyymmdd */																					yearMonthDay: number;
		/** yyyyQqtr */																					yearQuarter: string;
		/** yyyy-mm-dd */																				date: string;
		/** hh:mi:ss */																					time: string;
	}

	export type Duration = Temporal.DurationLike & Record<"quarters" | "seasons", number> & Record<"iso", string>

	export enum WEEKDAY { All, Mon, Tue, Wed, Thu, Fri, Sat, Sun };
	export enum WEEKDAYS { Everyday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };
	export enum MONTH { All, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec };
	export enum MONTHS { Every, January, February, March, April, May, June, July, August, September, October, November, December };
	export enum DURATION { year, quarter, month, week, day, hour, minute, second };
	export enum DURATIONS { years, quarters, months, weeks, days, hours, minutes, seconds };
	export type Weekday = Exclude<keyof typeof Tempo.WEEKDAY, 'All'>;
	export type Calendar = Exclude<keyof typeof Tempo.MONTH, 'All'>;

	/** Compass points */
	export enum COMPASS {
		North = 'north',
		East = 'east',
		South = 'south',
		West = 'west'
	}
	/** Hemisphere */
	export type Sphere = Tempo.COMPASS.North | Tempo.COMPASS.South | null;

	/** pre-configured layout names */
	export enum LAYOUT {
		display = 'ddd, dd mmm yyyy',
		dayDate = 'ddd, yyyy-mmm-dd',
		dayTime = 'ddd, yyyy-mmm-dd hh:mi',
		dayFull = 'ddd, yyyy-mmm-dd hh:mi:ss',									// useful for Sheets cell-format
		dayStamp = 'ddd, yyyy-mmm-dd hh:mi:ss.ff',							// day, date and time to nanosecond
		logStamp = 'hhmiss.ff',																	// useful for stamping logs 
		sortTime = 'yyyy-mm-dd hh:mi:ss',												// useful for sorting display-strings
		monthDay = 'dd-mmm',																		// useful for readable month and day
		monthTime = 'yyyy-mmm-dd hh:mi',												// useful for dates where dow is not needed
		hourMinute = 'hh:mi',																		// 24-hour format
		yearWeek = 'yyyyww',
		yearMonth = 'yyyymm',
		yearMonthDay = 'yyyymmdd',
		yearQuarter = 'yyyyQqtr',
		date = 'yyyy-mmm-dd',																		// just Date portion
		time = 'hh:mi:ss',																			// just Time portion
	}

	/** approx number of seconds per unit-of-time */
	export enum TIME {
		year = 31_536_000,
		quarter = 2_628_000 * 3,
		month = 2_628_000,
		week = 604_800,
		day = 86_400,
		hour = 3_600,
		minute = 60,
		second = 1,
		millisecond = .001,
		microsecond = .000_001,
		nanosecond = .000_000_001,
	}

	/** number of milliseconds per unit-of-time */
	export enum TIMES {
		years = TIME.year * 1_000,
		quarters = TIME.quarter * 3 * 1000,
		months = TIME.month * 1_000,
		weeks = TIME.week * 1_000,
		days = TIME.day * 1_000,
		hours = TIME.hour * 1_000,
		minutes = TIME.minute * 1_000,
		seconds = TIME.second * 1_000,
		milliseconds = TIME.millisecond * 1_000,
		microseconds = TIME.microsecond * 1_000,
		nanoseconds = Number((TIME.nanosecond * 1_000).toPrecision(6)),
	}

	/** some useful Dates */
	export const DATE = {
		epoch: 0,																								// TODO: is this needed / useful ?
		maxDate: new Date('9999-12-31T23:59:59'),
		minDate: new Date('1000-01-01T00:00:00'),
		maxStamp: Temporal.Instant.from('9999-12-31T23:59:59.999999+00:00').epochSeconds,
		minStamp: Temporal.Instant.from('1000-01-01T00:00+00:00').epochSeconds,
	} as const

	/** Seasons */
	export enum SEASON {
		Spring,
		Summer,
		Autumn,
		Winter,
	}
}

namespace Internal {
	export enum LEVEL { Static = 'static', Instance = 'instance' }

	export type StringPattern = (string | RegExp)

	export type InputFormat<T> = Record<string, T | T[]> | Record<string, T | T[]>[] | Map<string, T | T[]>

	export interface Shape {																	// 'global' and 'local' variables
		/** current defaults for all Tempo instances */					config: Tempo.Config,
		/** Tempo units to aid in parsing */										units: Tempo.Units,
		/** Map of regex-patterns to match input-string */			patterns: Internal.RegexpMap,
		/** Array of settings related to a Month */							months: Tempo.Months,
	}

	export type StringObject = Record<string, string>
	export type RegexpMap = Map<string, RegExp>

	export type TimeStamps = Record<Tempo.TimeStamp, keyof Temporal.ZonedDateTime>
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/**
 * kick-start Tempo configuration with default config  
 * use top-level await to indicate when Tempo is ready  
 */
await Tempo.init();

// shortcut functions to common Tempo properties / methods
type Params<T> = {																					// Type for consistency in expected arguments
	(tempo?: Tempo.DateTime, options?: Tempo.Options): T;			// parse Tempo.DateTime, default to Temporal.Instant.now()
	(options: Tempo.Options): T;															// provide just Tempo.Options (use {value:'XXX'} for specific Tempo.DateTime)
}
type Fmt = {																								// used for the fmtTempo() shortcut
	<F extends Tempo.FormatKeys>(fmt: F, tempo?: Tempo.DateTime, options?: Tempo.Options): Tempo.Format[F];
	<F extends Tempo.FormatKeys>(fmt: F, options: Tempo.Options): Tempo.Format[F];
}

/** check valid Tempo */			export const isTempo = (tempo?: unknown) => isType<Tempo>(tempo, 'Tempo');
/** current timestamp (ts) */	export const getStamp = ((tempo, options) => new Tempo(tempo, options).ts) as Params<number | bigint>;
/** create new Tempo */				export const getTempo = ((tempo, options) => new Tempo(tempo, options)) as Params<Tempo>;
/** format a Tempo */					export const fmtTempo = ((fmt, tempo, options) => new Tempo(tempo, options).format(fmt)) as Fmt;
