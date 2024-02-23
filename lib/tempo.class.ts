// #region library modules~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { Pledge } from '@module/shared/pledge.class.js';
import { asArray } from '@module/shared/array.library.js';
import { enumKeys } from '@module/shared/enum.library.js';
import { sprintf } from '@module/shared/string.library.js';
import { clone } from '@module/shared/serialize.library.js';
import { getAccessors, pick, purge } from '@module/shared/object.library.js';
import { asNumber, asInteger, isNumeric, split, ifNumeric } from '@module/shared/number.library.js';
import { getContext, CONTEXT, getStore, setStore, sleep } from '@module/shared/utility.library.js';
import { asString, pad, singular, toProperCase, trimAll, } from '@module/shared/string.library.js';
import { asType, getType, isType, isEmpty, isNull, isNullish, isDefined, isUndefined, isString, isObject, isRegExp } from '@module/shared/type.library.js';

import type { Logger } from '@module/shared/logger.library.js';
import type { Entries, Types } from '@module/shared/type.library.js';

import '@module/shared/prototype.library.js';								// patch prototype

/** TODO: THIS IMPORT NEEDS TO BE REMOVED ONCE TEMPORAL IS SUPPORTED IN JAVASCRIPT RUNTIME */
import { Temporal } from '@js-temporal/polyfill';
// #endregion

/**
 * TODO: Localization options on output?  on input?  
 * this affects month-names, day-names, season-names !  
 */

// #region Const variables ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const VERSION = '0.0.1';																		// semantic version
const STORAGEKEY = '_Tempo_';																// for stash in persistent storage

/**
 * user will need to know these in order to configure their own patterns  
 * a {unit} is a simple regex	json													e.g. { yy: /(18|19|20|21)?\d{2}/ }  
 * {unit} keys are combined to build a {layout}							e.g. { ymd: ['yy', 'mm', 'dd' ]    
 * internally, {layout}s are built into a regex {pattern}		e.g. Map([[ 'ymd', /^ ... $/ ]])    
 * the {pattern} will be used to parse a string | number in the constructor {DateTime} argument    
 */
const Units = {																							// define some components to help interpret input-strings
	yy: new RegExp(/(?<yy>([0-2]\d)?\d{2})/),									// arbitrary upper-limit of yy=2999
	mm: new RegExp(/(?<mm>[0\s]?[1-9]|1[012]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/),
	dd: new RegExp(/(?<dd>[0\s]?[1-9]|[12][0-9]|3[01])/),
	dow: new RegExp(/((?<dow>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)(?:[\/\-\s\,])*)/),
	qtr: new RegExp(/q(?<qtr>[1|2|3|4])/),										// qtr: Q1 - Q4
	hh: new RegExp(/(?<hh>2[0-4]|[01]?\d)/),									// hh:  00 - 24
	mi: new RegExp(/(\:(?<mi>[0-5]\d))/),											// mi:  00 - 59
	ss: new RegExp(/(\:(?<ss>[0-5]\d))/),											// ss:	00 - 59
	ff: new RegExp(/(\.(?<ff>\d{1,9}))/),											// up-to 9-digits for fractional seconds
	mer: new RegExp(/(\s*(?<mer>am|pm))/),										// meridian am/pm suffix
	sep: new RegExp(/(?<sep>[\/\\\-\.\s,])/),									// date-component separator character
	sfx: new RegExp(/((?:[\s,T])({tm}))/),										// time-component as a suffix to another {layout}
	mod: new RegExp(/((?<mod>[\+\-\<\>][\=]?)?(?<nbr>\d*)\s*)/),// modifiers (+,-,<,<=,>,>=)
} as Tempo.Units
// computed Units ('tm', 'dt', 'evt', 'per') are added during 'Tempo.init()' and 'new Tempo()'

/** Reasonable defaults for initial Tempo options */
const Default = {
	version: VERSION,
	pivot: 75,																								// 
	catch: false,
	debug: false,
	timeStamp: 'ms',
	calendar: 'iso8601',
	sphere: 'north',
	fiscal: 'Jan',
	monthDay: ['en-US', 'en-AS'],															// array of Locales that prefer 'mm-dd-yy' date order: https://en.wikipedia.org/wiki/Date_format_by_country
	layout: new Map([																					// built-in layouts to be checked, and in this order
		[Symbol.for('dow'), '{mod}?{dow}{sfx}?'],								// special layout (no {dt}!) used for day-of-week calcs (only one that requires {dow} unit)
		[Symbol.for('dt'), '{dt}'],															// calendar or event
		[Symbol.for('tm'), '{tm}'],															// clock or period
		[Symbol.for('dtm'), '({dt}){sfx}'],											// event and time-period
		[Symbol.for('dmy'), '{dow}?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?'],
		[Symbol.for('mdy'), '{dow}?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?'],
		[Symbol.for('ymd'), '{dow}?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?'],
		[Symbol.for('qtr'), '{yy}{sep}?{qtr}{sfx}?'],						// yyyyQq (for example, '2024Q2')
	]),
	period: [																									// built-in periods to be mapped to a time
		['mid[ -]?night', '24:00'],
		['morning', '8:00'],
		['mid[ -]?morning', '10:00'],
		['mid[ -]?day', '12:00'],
		['noon', '12:00'],
		['after[ -]?noon', '15:00'],
		['evening', '18:00'],
		['night', '20:00'],
	],
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
} as Tempo.Options
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
			? Tempo.regexp('{mm}{sep}{dd}({sep}{yy})?|{mod}?({evt})')
			: Tempo.regexp('{dd}{sep}{mm}({sep}{yy})?|{mod}?({evt})')
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
		shape.units["tm"] = new RegExp(time);										// set the {tm} unit
		// shape.units["tzd"] = new RegExp(`(?<tzd>[+-]${time}|Z)`);	// TODO
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
				const idx1 = layouts.findIndex(([key]) => Symbol.keyFor(key) === dmy);	// 1st swap element exists in {layouts}
				const idx2 = layouts.findIndex(([key]) => Symbol.keyFor(key) === mdy);	// 2nd swap element exists in {layouts}

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

	/** setup meteorological seasons based on hemisphere */
	static #season(shape: Internal.Shape) {
		(shape.config.sphere !== Tempo.COMPASS.South
			? [void 0, 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter']
			: [void 0, 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer']
		)																												// 1=first, 2=mid, 3=last month of season
			.forEach((season, idx) => { if (idx !== 0) shape.months[idx].season = `${season}.${idx % 3 + 1}` as Tempo.Month["season"] });
	}

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

		Reflect.deleteProperty(shape.config, 'sphere');					// timeZone does not observe DST
		return void 0;
	}

	/**
	 * conform input of Layout / Event / Period options 
	 * This is needed because we allow the user to flexibly provide detail as an {[key]:val} or an {[key]:val}[] or an [key,val][]
	 * for example:    
	 * 	Tempo.init({ layout: {'ddmm': ['{dd}{sep}{mm}']} })
	 * 	Tempo.init({ layout: {'yy': /20\d{2}/, 'mm': /[0-9|1|2]\d/ } })
	 *	Tempo.init({ layout: '{dow}' })												(can be a single string)
	 *	Tempo.init({ layout: ['{dow}?', / /, '{dd}'] })				(dont have to provide a 'key' for the {layout})
	 *	Tempo.init({ layout: new Map([['{dow}{yy}']]) })			(unlikely, but can be a single unit-string)
	 *	Tempo.init({ layout: new Map([['name1', ['{dow}','{yy}']], ['name2', ['{mm}', '{sep}', '{dd}']]]) })  

	 * 	Tempo.init({event: {'canada ?day': '01-Jun', 'aus(tralia)? ?day': '26-Jan'} })  
	 * 	Tempo.init({period: [{'morning tea': '09:30' }, {'elevenses': '11:00' }]})  
	 * 	new Tempo('birthday', {event: [["birth(day)?", "20-May"], ["anniversay", "01-Jul"] ]})
	 */
	static #setConfig(config: Tempo.Config, ...options: (Tempo.Options | Tempo.Config)[]) {
		config["layout"] ??= new Map();
		config["event"] ??= [];
		config["period"] ??= [];

		options.forEach(option => {
			(Object.entries(option) as Entries<Tempo.Options>)
				.forEach(([optKey, optVal]) => {
					const arg = asType(optVal);
					let idx = -1;

					switch (optKey) {
						case 'layout':
							const map = config["layout"];									// reference to the layout-map

							switch (arg.type) {
								case 'Object':															// add key-value pairs to Map()
									Object.entries(arg.value)
										.forEach(([key, val]) => map.set(Symbol.for(key), asArray(val)));
									break;

								case 'String':															// add string with unique key to Map()
									map.set(Symbol.for(`usr${++idx}`), asArray(arg.value));
									break;

								case 'RegExp':															// add pattern with unique key to Map()
									map.set(Symbol.for(`usr${++idx}`), asArray(arg.value.source));
									break;

								case 'Array':
									if (isObject(arg.value[0])) {							// add array of objects to Map()
										(arg.value as unknown as NonNullable<Record<string, Internal.StringPattern | Internal.StringPattern[]>>[])
											.forEach(obj => Object.entries(obj)
												.forEach(([key, val]) => map.set(Symbol.for(key), asArray(val)))
											)
									} else {																	// add array of <string | RegExp> to Map()
										map.set(Symbol.for(`usr${++idx}`), (arg.value as Internal.StringPattern[])
											.map(itm => isString(itm) ? itm : itm.source));
									}
									break;

								case 'Map':
									for (const [key, val] of arg.value as typeof map)
										map.set(key, asArray(val));
									break;

								default:
									Tempo.#catch(config, `Unexpected type for "layout": ${arg.type}`);
									break;
							}

							break;

						case 'event':
						case 'period':
							const arr = config[optKey];										// reference to the config Array

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
									arr.unshift([`usr${++idx}`, arg.value]);
									break;

								case 'Map':																	// not really expecting Map() at this release
									arr.unshift(...(arg.value as unknown as Internal.StringTuple[]));
									break;

								default:
									Tempo.#catch(config, `Unexpected type for "${optKey}": ${arg.type}`);
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

		for (const [sym, units] of shape.config.layout)
			shape.patterns.set(sym, Tempo.regexp(shape.units, ...units))
	}

	/**
	 * use debug:boolean to determine if console()  
	 */
	static #info = Tempo.#debug.bind(this, 'info');
	static #warn = Tempo.#debug.bind(this, 'warn');
	static #error = Tempo.#debug.bind(this, 'error');
	static #debug(method: Logger = 'info', config: Tempo.Config, ...msg: any[]) {
		if (config.debug)
			console[method](sprintf('tempo:', ...msg));
	}

	/**
	 * use catch:boolean to determine whether to throw or return  
	 */
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
			sleep('Tempo setup timed out', Tempo.TIME.second * 2),// or two-seconds timeout
		])
			.then(_ => {
				if (Tempo.#ready["init"].status.state !== Pledge.STATE.Pending)
					Tempo.#ready["init"] = new Pledge<boolean>('Init')// reset Init Pledge

				if (isEmpty(options)) {															// if no options supplied, reset all
					const dateTime = Intl.DateTimeFormat().resolvedOptions();
					const [country] = dateTime.timeZone.toLowerCase().split('/');

					purge(Tempo.#global.config);											// remove previous config
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
		return getStore(STORAGEKEY, {}) as Partial<Tempo.Options>;
	}

	/** write Options into persistent storage */
	static write(config?: Partial<Tempo.Options>) {
		setStore(STORAGEKEY, config);
	}

	/**
	 * combine array of <string | RegExp> to an anchored, case-insensitive RegExp.  
	 * layouts generally have {unit} placeholders, for example  '{yy}{sep}{mm}?'  
	 */
	static regexp: {
		(...layouts: Internal.StringPattern[]): RegExp;
		(units: Tempo.Units, ...layouts: Internal.StringPattern[]): RegExp;
	}
		= (units: Tempo.Units | Internal.StringPattern, ...layouts: Internal.StringPattern[]) => {
			if (!isObject(units)) {
				layouts.splice(0, 0, units);												// stash 1st argument into {regs} array
				units = Tempo.#global.units;												// set units to static value
			}

			const names: Record<string, boolean> = {};						// to detect if multiple instances of the same named-group
			const pattern = layouts
				.map(layout => {																		// for each {layout} in the arguments
					if (isRegExp(layout))
						layout = layout.source;
					if (layout.match(/^\/.*\/$/))											// string that looks like a RegExp
						layout = layout.substring(1, -1);

					const it = layout.matchAll(/{([^}]+)}/g);					// iterator to match all "{.*}" patterns in a {layout}
					for (const pat of it) {
						const { ["1"]: unit } = pat;										// {unit} is the code between the {}

						let reg = (units as Tempo.Units)[unit];					// check if a defined {unit}
						if (isNullish(reg))
							continue;																			// if not, pass back as-is

						const inner = reg.source.matchAll(/{([^}]+)}/g);// {unit} might contain "{.*}" as well
						for (const sub of inner) {
							const { ["1"]: word } = sub;
							const lkp = (units as Tempo.Units)[word];

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

	/** iterate over Tempo properties */
	[Symbol.iterator]() {
		const props = Tempo.properties;													// array of 'getters'
		let idx = -1;

		return {
			next: () => ({
				done: ++idx >= props.length,
				value: {
					property: props[idx],
					value: this[props[idx]],
				}
			}),
		}
	}

	/** dispose Tempo */
	[Symbol.dispose]() {																			// TODO: =for future implementation
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
	/** prebuilt formats, for convenience */									fmt = {} as Tempo.FormatType;
	/** instance values to complement static values */				#local = {
		/** instance configuration */															config: {} as Tempo.Config,
		/** instance units */																			units: {} as Tempo.Units,
		/** instance month objects */															months: {} as Tempo.Months,
		/** instance patterns */																	patterns: new Map() as Internal.RegexpMap,
	}

	// #endregion Instance properties

	// #region Constructor~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
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

		Object.assign(this.#local.config, Tempo.#global.config, { level: Internal.LEVEL.Local })
		Tempo.#setConfig(this.#local.config, this.#options);		// start with {#global} config, overloaded with {options}

		this.#local.months = clone(Tempo.#global.months);				// start with static {months} object
		this.#local.units = clone(Tempo.#global.units);					// start with static {units} object
		for (const [sym, reg] of Tempo.#global.patterns)				// start with statis {patterns} Map
			this.#local.patterns.set(sym, reg);										// note: we cannot clone Symbols

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
				enumKeys(Tempo.FORMAT)															// add all the pre-defined FORMATs to the instance (eg  Tempo().fmt.yearMonthDay)
					.forEach(key =>
						Object.assign(this.fmt, { [key]: this.format(Tempo.FORMAT[key]) }));	// add-on short-cut format
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
		} as Record<'ss' | 'ms', number> & Record<'us' | 'ns', bigint>
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
	/** as Temporal.Instant */																toInstant() { return this.#zdt.toInstant() }
	/** as Date object */																			toDate() { return new Date(this.#zdt.round({ smallestUnit: 'millisecond' }).epochMilliseconds) }
	/** as String */																					toString() { return this.#zdt.toString() }
	/** as Object */																					toJSON() { return { ...this.#local.config, value: this.toString() } }

	// #endregion Instance public methods

	// #region Instance private methods~~~~~~~~~~~~~~~~~~~~~~~
	/** parse DateTime input */
	#parse(tempo?: Tempo.DateTime) {
		const today = this.#instant															// cast instantiation to current timeZone, calendar
			.toZonedDateTime({ timeZone: this.#local.config.timeZone, calendar: this.#local.config.calendar });
		const arg = this.#conform(tempo, today);								// if String or Number, conform the input against known patterns

		Tempo.#info(this.#local.config, 'parse', arg);					// show what we're parsing

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
					Tempo.#warn(this.#local.config, 'Cannot detect DateTime, fallback to Date.parse');
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
						this.#local.config.parse.match = 'ss';
						epoch = value * BigInt(1_000_000_000) + nano;
						break;
					case prefix.length <= 13:													// looks like 'milliseconds'
						this.#local.config.parse.match = 'ms';
						epoch = value * BigInt(1_000_000);
						break;
					case prefix.length <= 16:													// looks like 'microseconds'
						this.#local.config.parse.match = 'us';
						epoch = value * BigInt(1_000);
						break;
					default:																					// looks like 'nanoseconds'
						this.#local.config.parse.match = 'ns';
						epoch = value;
						break;
				}
				return new Temporal.ZonedDateTime(epoch, this.#local.config.timeZone, this.#local.config.calendar);

			default:
				throw new Error(`Unexpected Tempo parameter type: ${arg.type}, ${arg.value}`);
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
				return Object.assign(arg, { type: 'Void', value: void 0 });
			}
			if (value.match(/^[0-9]+n$/)) {												// if string representation of BigInt literal
				this.#local.config.parse.match = 'BigInt';					// matched a bigint-String
				return Object.assign(arg, { type: 'BigInt', value: asInteger(value) });
			}
		} else {
			if (value.length <= 7) {         											// cannot reliably interpret small numbers:  might be {ss} or {yymmdd} or {dmmyyyy}
				Tempo.#catch(this.#local.config, 'Cannot safely interpret number with less than 8-digits: use string instead');
				return arg;
			}
		}

		dateTime = dateTime.withPlainTime('00:00:00');					// remove all time-components (and use parsePeriod() below)

		for (const sym of this.#local.patterns.keys()) {				// test against regular-expression patterns until a match is found
			const groups = this.#match(value, Symbol.keyFor(sym)!)// return any matches

			if (isEmpty(groups))
				continue;																						// no match, so skip this iteration

			// if the weekday-pattern is detected, calculate its calendar value
			// note: the weekday pattern will not contain any date-components (ie. yy, mm, dd, qtr)
			dateTime = this.#parseWeekday(groups, dateTime);

			// if the date-event pattern is detected, translate it into its calendar values  
			// we really are just expecting 'Day-Month' with optional 'Year' in the {events} tuple at this release
			dateTime = this.#parseEvent(groups, dateTime);

			// turn a Quarter into a start-of-Month
			dateTime = this.#parseQuarter(groups, dateTime);

			// all date-components are now set
			const date = Temporal.PlainDate.from({
				year: Number(groups["yy"] ?? dateTime.year),
				month: Number(groups["mm"] ?? dateTime.month),
				day: Number(groups["dd"] ?? dateTime.day)
			},
				{ overflow: 'constrain' })													// check for overflow

			// if a time-period pattern is detected, translate it into its clock value
			dateTime = this.#parsePeriod(groups, dateTime.withPlainDate(date));

			/**
			 * finished analyzing a matched pattern.  
			 * rebuild {arg.value} into a ZonedDateTime
			*/
			Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime });
			Object.assign(this.#local.config.parse, { match: Symbol.keyFor(sym), groups });// stash the {key} of the pattern that was matched								

			Tempo.#info(this.config, 'pattern', Symbol.keyFor(sym));// show the pattern that was matched
			Tempo.#info(this.config, 'groups', groups);						// show the resolved date-time elements

			break;																								// stop checking patterns
		}

		return arg;
	}

	/** match {value} against a {pattern} and return a 'clean' named {groups} object */
	#match(value: string | number, ...keys: string[]) {
		const groups: NonNullable<RegExpMatchArray["groups"]> = {};
		const patterns: RegExp[] = [];													// RegExp's to test against {value} until a match

		keys.forEach(key => {
			const pat = this.#local.patterns.get(Symbol.for(key));

			if (isNullish(pat))
				Tempo.#catch(this.#local.config, `Cannot determine pattern: "${key}`);
			else patterns.push(pat);
		})

		patterns.find(pattern => {
			Object.assign(groups, value.toString().match(pattern)?.groups);
			Object.entries(groups)																// remove undefined, NaN, null and empty values
				.forEach(([key, val]) => isEmpty(val) && Reflect.deleteProperty(groups, key));

			return (!isEmpty(groups));														// find the first pattern that defines a match-group
		})

		/**
		 * resolve a month-name into a month-number.  
		 * (some browsers do not allow month-names when parsing a Date)  
		 * eg.  May  -> 05
		*/
		if (isDefined(groups["mm"]) && !isNumeric(groups["mm"])) {
			const mm = Tempo.#prefix(groups["mm"] as Tempo.Calendar);

			groups["mm"] = enumKeys(Tempo.MONTH)
				.findIndex(el => el === mm)
				.toString()
				.padStart(2, '0')
		}

		/**
		 * default {nbr} if {mod} is present  
		 */
		if (isDefined(groups["mod"]))
			groups["nbr"] ||= '1';

		return groups;
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
	 * if named-group 'dow' detected (with optional 'mod', 'nbr', or time-units), then calc relative weekday offset  
	 *   Wed		-> Wed this week															might be earlier or later or equal to current day  
	 *  -Wed		-> Wed last week															same as new Tempo('Wed').add({ weeks: -1 })  
	 *  +Wed		-> Wed next week															same as new Tempo('Wed').add({ weeks:  1 })  
	 * -3Wed		-> Wed three weeks ago  											same as new Tempo('Wed').add({ weeks: -3 })  
	 *  <Wed		-> Wed prior to today 												might be current or previous week  
	 * <=Wed		-> Wed prior to tomorrow											might be current or previous week  
	 *  Wed noon-> Wed this week at 12:00pm										also allow for time-period specifiers (in #parsePeriod)  
	 * returns a ZonedDateTime with computed date-components  
	 */
	#parseWeekday(groups: Internal.RegExpGroups, dateTime: Temporal.ZonedDateTime, required = false) {
		const { dow, mod, nbr, ...rest } = groups as { dow: Tempo.Weekday, mod: Tempo.Modifier, [key: string]: string };

		if (isUndefined(groups["dow"])) {												// this is not a {dow} pattern match
			if (required)
				Tempo.#catch(this.#local.config, `Match-group does not contain a day-of-week`);
			return dateTime;
		}

		/**
		 * the {dow} pattern will generally only have {mod} and {nbr}.  
		 * (an exception is time-components but they will be parsed later in "parsePeriod").  
		 * for example: {dow: 'Wed', mod: '>', hh: '10', mer: 'pm'} or {'dow: 'Wed', period: 'per5'}  
		 * we early-exit if we find anything other than {dow}, {mod}, {nbr} and time-units  
		 * note that we only look for the first-three characters  e.g. the 'per5' period will match the requirement for 'per'  
		 */
		const timeKeys = ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer', 'per'];
		const onlyTime = Object.keys(rest)
			.every(key => timeKeys.includes(key.substring(0, 3)));// up-to first three-characters of key included in {timeKeys}
		if (!onlyTime) {
			if (required)
				Tempo.#catch(this.#local.config, `Unexpected match-groups detected: ${groups}`);
			return dateTime;																			// this is not a true {dow} pattern, so early-exit
		}

		const weekday = Tempo.#prefix(dow);											// conform weekday-name
		const offset = enumKeys(Tempo.WEEKDAY).findIndex(el => el === weekday);
		const adjust = dateTime.daysInWeek * Number(nbr);				// how many days to adjust

		const days = offset - dateTime.dayOfWeek								// number of days to offset from dateTime
			+ this.#parseModifier({ mod, adjust, offset, period: dateTime.dayOfWeek });

		return dateTime
			.add({ days });																				// return the computed date-values
	}

	/**
	 * match input against 'evt' pattern.  
	 * {event} is the object that contains the RegExp named key-pairs group  
	 * for example, 'evt7' refers to the Tempo.Events[7] tuple, e.g. ['xmas', '25-Dec']  
	 * returns an adjusted ZonedDateTime with resolved time-components  
	 */
	#parseEvent(groups: Internal.RegExpGroups, dateTime: Temporal.ZonedDateTime, required = false) {
		const { mod, nbr, yy: year, mm: month, dd: day, ...rest } = groups as { mod: Tempo.Modifier, [key: string]: string; };
		const event = Object.keys(rest)
			.find(itm => itm.match(/^evt\d+$/));									// for example, the key of {evt4: 'xmas'}

		if (isEmpty(event) && isEmpty(year) && isEmpty(month) && isEmpty(day)) {
			if (required)
				Tempo.#catch(this.#local.config, `Match-group does not contain a date or event`);
			return dateTime;																			// return default
		}

		const date = Object.assign(this.#num({									// set defaults to use if match does not fill all date-components
			year: year ?? dateTime.year,													// supplied year, else current year
			month: month ?? dateTime.month,												// supplied month, else current month
			day: day ?? dateTime.day,															// supplied day, else current day
		})) as { year: number, month: number, day: number };

		/**
		 * If an event-code is detected in {groups},  
		 * then lookup the event-value from config.event,  
		 * and apply a set of patterns to see if any match.  
		 * then move the resolved {yy}, {mm}, {dd} into {date}
		 */
		if (event) {
			const idx = Number(event[3]);													// number index of the {event}
			const [_, evt] = this.#local.config.event[idx];				// fetch the indexed tuple's value

			if (isUndefined(evt)) {
				Tempo.#catch(this.config, `No definition for Event key: "${evt}"`);
				return dateTime;
			}

			Object.assign(date, this.#parseDate(evt, dateTime));	// mutate the {date} object with the results of the match
		}

		/**
		 * change two-digit year into four-digits using 'pivot-year' (defaulted to '75' years) to determine century  
		 * pivot		= (currYear - Tempo.pivot) % 100						// for example, Rem((2024 - 75) / 100) => 49
		 * century	= Int(currYear / 100)												// for example, Int(2024 / 100) => 20
		 * 22				=> 2022																			// 22 is less than pivot, so use {century}
		 * 57				=> 1957																			// 57 is greater than pivot, so use {century - 1}
		 */
		if (date.year.toString().match(/^\d{2}$/)) {						// if {yy} match just-two digits
			const pivot = dateTime
				.subtract({ years: this.#local.config.pivot })			// arbitrary-years ago is pivot for century
				.year % 100																					// remainder 
			const century = Math.trunc(dateTime.year / 100);			// current century
			date.year += (century - Number(date.year > pivot)) * 100;
		}

		// adjust the {year} if a Modifier is present
		const modifier = event ? mod : void 0;									// {mod} only valid if {event}
		const adjust = Number(nbr);															// how many years to adjust
		const offset = Number(pad(date.month) + '.' + pad(date.day));		// the event month.day
		const period = Number(pad(dateTime.month) + '.' + pad(dateTime.day + 1));
		date.year += this.#parseModifier({ mod: modifier, adjust, offset, period });

		// all date-components are now set; check for overflow in case past end-of-month
		const overflow = Temporal.PlainDate.from(date, { overflow: 'constrain' });

		return dateTime
			.withPlainDate(overflow);															// return constrained date
	}

	/**
	 * match input against 'tm' pattern.  
	 * {groups} contains a {period} (like {per5:'afternoon'}) or {time}-components (like {hh:'15', mi: '00', mer:'pm'})  
	 * return an adjusted ZonedDateTime, and mutate {groups} with resolved time-components  
	 */
	#parsePeriod(groups: Internal.RegExpGroups = {}, dateTime: Temporal.ZonedDateTime, required = false) {
		const period = Object.keys(groups)
			.find(itm => itm.match(/^per\d+$/));									// for example, the key of {per5: 'afternoon'}

		if (isEmpty(groups["hh"]) && !period) {									// must contain either 'time' (with at least {hh}) or {period}
			if (required)
				Tempo.#catch(this.#local.config, `Match-group does not contain a time or period`);
			return dateTime;
		}

		/**
		 * If a period-code is detected in {groups}  
		 * then lookup the period-value from config.event,  
		 * and apply the 'tm' pattern to see if any match,
		 * then move the resolved {hh},{mi},{ss},{ms},{us},{ns} into {groups}
		 */
		if (period) {
			const idx = Number(period[3]);												// get the {period} index (for example 'per5')
			const [, per] = this.#local.config.period[idx];				// fetch the indexed tuple's value (for example the value of {'per5', 'afternoon'})

			// the 'match' result against the 'tm' pattern should return named-group strings for 'hh', 'mi', 'ss' and 'mer'
			Object.assign(groups, this.#match(per, 'tm'));				// test {per} against {tm} pattern, and update {groups}
			if (isEmpty(groups["hh"])) {													// couldn't determine a {time}
				Tempo.#catch(this.#local.config, `Cannot determine a {time} from period: ${period}`);
				return dateTime;
			}
		}

		let { hh = 0, mi = 0, ss = 0, ms = 0, us = 0, ns = 0, ff = 0 } = this.#num(groups);

		if (hh >= 24) {
			const days = Math.trunc(hh / 24);											// number of days to offset

			hh = hh % 24;																					// midnight is '00:00' on the next-day
			dateTime = dateTime.add({ days });										// move the date forward
		}

		if (ff) {																								// {ff} is fractional seconds
			ms = +ff.toString().substring(0, 3).padEnd(3, '0');
			us = +ff.toString().substring(3, 5).padEnd(3, '0');
			ns = +ff.toString().substring(6, 8).padEnd(3, '0');
		}

		if (groups["mer"]?.toLowerCase() === 'pm' && hh < 12 && (hh + mi + ss + ms + us + ns) > 0)
			hh += 12;																							// anything after midnight and before midday
		if (groups["mer"]?.toLowerCase() === 'am' && hh >= 12)
			hh -= 12;																							// anything after midday

		return dateTime																						// return the computed time-values
			.withPlainTime({ hour: hh, minute: mi, second: ss, millisecond: ms, microsecond: us, nanosecond: ns });
	}

	/** look for a match with standard {date} patterns */
	#parseDate(evt: string | number, dateTime: Temporal.ZonedDateTime) {
		const isMonthDay = Tempo.#isMonthDay(this.#local);			// first find out if we have a US-format locale
		const groups = isMonthDay
			? this.#match(evt, 'mdy', 'dmy', 'ymd')								// try {mdy} first if US-format
			: this.#match(evt, 'dmy', 'mdy', 'ymd')								// else try {dmy} first

		const { yy: year = dateTime.year, mm: month = dateTime.month, dd: day = dateTime.day } = this.#num(groups);

		return { year, month, day }
	}

	/** resolve a quarter-number into a month-number */
	#parseQuarter(groups: Internal.RegExpGroups = {}, dateTime: Temporal.ZonedDateTime) {
		const qtr = Number(groups["qtr"] ?? '0');

		if (qtr) {
			const key = Number(`${qtr}.1`);												// '.1' means start of {quarter}
			const idx = this.#local.months												// lookup the quarter's start-of-month
				.findIndex(mon => mon.quarter === key);

			dateTime = dateTime.with({ year: dateTime.year - Number(qtr <= 2 && idx >= 6), month: idx, day: 1 });
		}

		return dateTime;
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

					case 'add.season':
					case 'add.quarter':
					case 'add.qtr':
						return zdt
							.add({ months: offset * 3 });

					default:
						throw new Error(`Unexpected method(${mutate}), unit(${key}) and offset(${offset})`);
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

				let groups = {};																		// RegExpMatchArray["groups"]

				switch (`${mutate}.${single}`) {
					case 'set.period':
					case 'set.time':
						groups = this.#match(offset, 'tm');
						return this.#parsePeriod(groups, zdt, true);		// mutate to the period 'time'

					case 'set.date':
						groups = pick(this.#parseDate(offset, zdt), 'year', 'month', 'day');
						return zdt
							.withPlainDate(groups);												// mutate to the parsed 'date'

					case 'set.event':
						groups = this.#match(offset, 'dt');							// for example, {evt7: "xmas"}
						return this.#parseEvent(groups, zdt, true);			// mutate to the event 'date'

					case 'set.dow':
						groups = this.#match(offset, 'dow');						// for example, {dow: "Wed", mod: ">"}
						return this.#parseWeekday(groups, zdt, true);		// mutate to the offset 'weekday'

					case 'set.year':
					case 'set.month':
					// case 'set.week':																// not supported
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
					// case 'set.ww':
					case 'set.dd':
					case 'set.hh':
					case 'set.mi':
					case 'set.ss':
					case 'set.ms':
					case 'set.us':
					case 'set.ns':
						const value = Reflect.get(Tempo.map, single);
						return zdt
							.with({ [value]: offset });

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

					default:
						throw new Error(`Unexpected method(${mutate}), unit(${unit}) and offset(${single})`);
				}
			}, this.#zdt)																					// start reduce with the Tempo zonedDateTime

		return new Tempo(zdt as unknown as typeof Temporal, this.#options);
	}

	#format = <K extends Tempo.Formats>(fmt: K): Tempo.Format[K] => {
		const bailOut = void 0 as unknown as Tempo.Format[K];		// allow for return of 'undefined'

		if (isNull(this.#tempo))
			return bailOut;																				// don't format <null> dates

		switch (fmt) {
			case Tempo.FORMAT.yearWeek:
				const offset = this.ww === 1 && this.mm === Tempo.MONTH.Dec;			// if late-Dec, add 1 to yy
				return asNumber(`${this.yy + Number(offset)}${pad(this.ww)}`);

			case Tempo.FORMAT.yearMonth:
				return asNumber(`${this.yy}${pad(this.mm)}`);

			case Tempo.FORMAT.yearMonthDay:
				return asNumber(`${this.yy}${pad(this.mm)}${pad(this.dd)}`);

			case Tempo.FORMAT.yearQuarter:
				if (isUndefined(this.#local.months[this.mm]?.quarter)) {
					Tempo.#catch(this.#local.config, 'Cannot determine "yearQuarter"');
					return bailOut;
				}

				const [full, part] = split(this.#local.months[this.mm].quarter);
				const mon = (full - 1) * 3 + part - 1;
				const yy = this.#zdt.with({ day: 1 }).add({ months: -mon }).add({ months: 11 }).year;

				return `${yy}Q${this.qtr}`;

			default:
				const mer = asString(fmt).includes('HH')						// if 'twelve-hour' (uppercase 'HH') is present in fmtString,
					? this.hh >= 12 ? 'pm' : 'am'											// noon and later is considered 'pm'
					: ''																							// else no meridian am/pm suffix needed

				return asString(fmt)
					.replace(/:m{2}$/gi, ':' + pad(this.mi) + mer)		// special to intercept ':mm' which should properly be ':mi'
					.replace(/:m{2}/gi, ':' + pad(this.mi))
					.replace(/m{2}:/gi, pad(this.mi) + ':')
					.replace(/y{4}/g, pad(this.yy))
					.replace(/y{2}/g, pad(this.yy).substring(2, 4))
					.replace(/m{3}/gi, this.mmm)
					.replace(/m{2}/g, pad(this.mm))
					.replace(/d{3}/gi, this.ddd)
					.replace(/d{2}/g, pad(this.dd))
					.replace(/h{2}/g, pad(this.hh))
					.replace(/H{2}$/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh) + mer)
					.replace(/H{2}/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh))
					.replace(/mi$/gi, pad(this.mi) + mer)							// append 'am' if 'mi' at end of fmtString, and it follows 'HH'
					.replace(/mi/gi, pad(this.mi))
					.replace(/s{2}$/gi, pad(this.ss) + mer)						// append 'am' if 'ss' at end of fmtString, and it follows 'HH'
					.replace(/s{2}/gi, pad(this.ss))
					.replace(/ts/g, this.ts.toString())
					.replace(/ms/g, pad(this.ms, 3))
					.replace(/us/g, pad(this.us, 3))
					.replace(/ns/g, pad(this.ns, 3))
					.replace(/f{2}/g, `${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`)
					.replace(/w{2}/g, pad(this.ww))
					.replace(/dow/g, this.dow.toString())
					.replace(/day/g, this.day)
					.replace(/qtr/g, this.qtr.toString())
					.replace(/q{1,3}/g, this.qtr.toString())					// special to interpret up-to-3 'q' as {qtr}
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
	// #endregion Instance private methods
}

// #region Tempo types / interfaces / enums ~~~~~~~~~~~~~~~~
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
		layout?: Internal.InputFormat<Internal.StringPattern>;	// provide additional layouts to define patterns to help parse input
		event?: Internal.StringTuple[];													// provide additional date-maps (e.g. xmas => '25 Dec')
		period?: Internal.StringTuple[];												// provide additional time-maps (e.g. arvo => '3pm')
		value?: Tempo.DateTime;																	// the {value} to interpret can be supplied in the Options argument
	}

	/**
	 * the Config that Tempo will use to interpret a Tempo.DateTime  
	 * derived from user-supplied options, else json-stored options, else reasonable-default options
	 */
	export interface Config extends Required<Omit<Options, "value" | "monthDay" | "layout">> {
		version: string;																				// semantic version
		level: Internal.LEVEL,																	// separate configurations 
		parse: Internal.Parse,																	// detail about how the Tempo constructor parsed the supplied value
		monthDay: { locale: string; timeZones: string[]; }[];		// Array of locales/timeZones that prefer 'mm-dd-yy' date order
		layout: Map<symbol, Internal.StringPattern[]>;					// coerce {layout} to Map<Symbol, (string | RegExp)[]>
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
	export type Set = Partial<Record<Tempo.Mutate, Tempo.TimeUnit | Tempo.DiffUnit> &
		Record<'period', Internal.StringObject> &
		Record<'event', Internal.StringObject> &
		Record<'time' | 'date' | 'dow', string>>
	export type Add = Partial<Record<Tempo.TimeUnit | Tempo.DiffUnit, number>>

	/** detail about a Month */
	export type Month = {
		name: keyof typeof Tempo.MONTH;
		season: `${keyof typeof Tempo.SEASON}.${1 | 2 | 3}`;
		quarter: 1 | 2 | 3 | 4;
	}
	/** tuple of 13 months */
	export type Months = [Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month]

	/** pre-configured format strings */
	export interface Format {
		[Tempo.FORMAT.display]: string;
		[Tempo.FORMAT.dayDate]: string;
		[Tempo.FORMAT.dayTime]: string;
		[Tempo.FORMAT.dayFull]: string;
		[Tempo.FORMAT.dayStamp]: string;
		[Tempo.FORMAT.logStamp]: string;
		[Tempo.FORMAT.sortTime]: string;
		[Tempo.FORMAT.monthDay]: string;
		[Tempo.FORMAT.monthTime]: string;
		[Tempo.FORMAT.hourMinute]: string;
		[Tempo.FORMAT.yearWeek]: number;
		[Tempo.FORMAT.yearMonth]: number;
		[Tempo.FORMAT.yearMonthDay]: number;
		[Tempo.FORMAT.yearQuarter]: string;
		[Tempo.FORMAT.date]: string;
		[Tempo.FORMAT.time]: string;
		[str: string]: string | number;													// allow for dynamic format-codes
	}
	export type Formats = keyof Tempo.Format

	export type Modifier = '=' | '-' | '+' | '<' | '<=' | '-=' | '>' | '>=' | '+='

	export interface FormatType {
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

	/** pre-configured format names */
	export enum FORMAT {
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
// #endregion Tempo types / interfaces / enums

// #region Namespace that doesn't need to be shared externally
namespace Internal {
	export enum LEVEL { Global = 'global', Local = 'local' }

	export type StringPattern = (string | RegExp)
	export type StringTuple = [string, string];

	export type InputFormat<T> = Record<string, T | T[]> | Record<string, T | T[]>[] | Map<string | symbol, T | T[]>

	export interface Shape {																	// 'global' and 'local' variables
		/** current defaults for all Tempo instances */					config: Tempo.Config,
		/** Tempo units to aid in parsing */										units: Tempo.Units,
		/** Map of regex-patterns to match input-string */			patterns: Internal.RegexpMap,
		/** Array of settings related to a Month */							months: Tempo.Months,
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

// shortcut functions to common Tempo properties / methods
type Params<T> = {																					// Type for consistency in expected arguments
	(tempo?: Tempo.DateTime, options?: Tempo.Options): T;			// parse Tempo.DateTime, default to Temporal.Instant.now()
	(options: Tempo.Options): T;															// provide just Tempo.Options (use {value:'XXX'} for specific Tempo.DateTime)
}
type Fmt = {																								// used for the fmtTempo() shortcut
	<F extends Tempo.Formats>(fmt: F, tempo?: Tempo.DateTime, options?: Tempo.Options): Tempo.Format[F];
	<F extends Tempo.Formats>(fmt: F, options: Tempo.Options): Tempo.Format[F];
}

/** check valid Tempo */			export const isTempo = (tempo?: unknown) => isType<Tempo>(tempo, 'Tempo');
/** current timestamp (ts) */	export const getStamp = ((tempo, options) => new Tempo(tempo, options).ts) as Params<number | bigint>;
/** create new Tempo */				export const getTempo = ((tempo, options) => new Tempo(tempo, options)) as Params<Tempo>;
/** format a Tempo */					export const fmtTempo = ((fmt, tempo, options) => new Tempo(tempo, options).format(fmt)) as Fmt;
