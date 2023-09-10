import { Pledge } from '@module/shared/pledge.class.js';
import { asArray } from '@module/shared/array.library.js';
import { enumKeys } from '@module/shared/enum.library.js';
import { getAccessors, omit } from '@module/shared/object.library.js';
import { getContext, CONTEXT } from '@module/shared/utility.library.js';
import { clone, stringify, objectify } from '@module/shared/serialize.library.js';
import { asString, pad, toProperCase, trimAll, } from '@module/shared/string.library.js';
import { asNumber, asInteger, isNumeric, split } from '@module/shared/number.library.js';
import { asType, isType, isEmpty, isNull, isDefined, isUndefined, isString, isArray, isObject, isRegExp } from '@module/shared/type.library.js';

import '@module/shared/prototype.library.js';								// patch prototype

/**
 * TODO: Localization options on output?  on input?  
 * this affects month-names, day-names, season-names !
 */

/** TODO: THIS IMPORT NEEDS TO BE REMOVED ONCE TEMPORAL IS SUPPORTED IN JAVASCRIPT RUNTIME */
import { Temporal } from '@js-temporal/polyfill';

const Version = '0.0.1';																		// semantic version

/**
 * Wrapper Class around Temporal API  
 * ````
 * (Instance)						new Tempo(DateTime, Options) or
 * (Static Method)			Tempo.from(DateTime, Options) or
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

	// start with defaults for all Tempo instances
	static #locales = [																				// Array of Locales that prefer 'mm-dd-yy' date order
		new Intl.Locale('en-US'),																// https://en.wikipedia.org/wiki/Date_format_by_country
		new Intl.Locale('en-AS'),																// add to this Array if required
	]
	static #configKey = '_Tempo_';														// for stash in persistent storage
	static #default = {} as Tempo.ConfigFile;
	static #pattern = [] as Tempo.Pattern[];									// Array of regex-patterns to test until a match
	static #months = Array.from({ length: 13 }, () => ({})) as Tempo.Months;	// Array of settings related to a Month
	static #dateTime = Intl.DateTimeFormat().resolvedOptions();
	static #timeStamp = {																			// lookup object for Tempo().ts resolution
		ss: 'epochSeconds',
		ms: 'epochMilliseconds',
		us: 'epochMicroseconds',
		ns: 'epochNanoseconds',
	} as Tempo.TimeStamps

	/**
	 * user will need to know these in order to configure their own patterns  
	 * a 'unit' is a simple regex	object											(e.g. { yy: /(18|19|20|21)?\d{2}/ })
	 * units are combined to build a 'pattern'								(e.g. { ymd: ['yy', 'mm', 'dd' ] )
	 * Tempo.regexp(pattern) will build a full regex					(e.g. { key: 'ymd', /^ ... $/ })
	 * the 'regex' will be used to analyze a string | number constructor DateTime argument
	 */
	static readonly units: Tempo.Units = {										// define some components to help interpret input-strings
		yy: new RegExp(/(?<yy>(18|19|20|21)?\d{2})/),
		mm: new RegExp(/(?<mm>0?[1-9]|1[012]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/),
		dd: new RegExp(/(?<dd>0?[1-9]|[12][0-9]|3[01])/),
		dow: new RegExp(/(?<dow>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)/),
		qtr: new RegExp(/(?<qtr>1|2|3|4)/),
		hh: new RegExp(/(?<hh>2[0-4]|[01]?\d)/),								// hh:  00 - 24
		mi: new RegExp(/(\:(?<mi>[0-5]\d))/),										// mi:  00 - 59
		ss: new RegExp(/(\:(?<ss>[0-5]\d))/),										// ss:	00 - 59
		ff: new RegExp(/(\.(?<ff>\d{1,9}))/),										// up-to 9-digits for fractional seconds
		am: new RegExp(/(\s*(?<am>am|pm))/),										// am/pm suffix
		sep: new RegExp(/[\/\-\s\,]*/),													// list of separators between date-components
		mod: new RegExp(/(?<mod>[\+\-\<\>][\=]?)?(?<nbr>\d*)\s*/)// modifiers (+,-,<,<=,>,>=)
	}

	// Static private methods ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * 'dt' is a special regex that combines date-related units (dd, mm -or- evt) into a pattern against which a string can be tested.  
	 * because it will include a list of events ('e.g. 'new_years' | 'xmas'), we need to rebuild it if the user adds a new event
	 */
	static #event(config: Tempo.ConfigFile | Tempo.Config, units: Tempo.Units) {
		const events = config.event.map(([key, _]) => key.toLowerCase()).join('|');
		units['evt'] = new RegExp(`(?<evt>${events})`, 'i');		// set the Tempo.units 'event' pattrn

		const date = Tempo.regexp('dd', 'sep', 'mm', 'sep', 'yy?', '/|/', 'evt').source.slice(1, -1);
		units['dt'] = new RegExp(date, 'i');										// set the Tempo.units 'dt' pattern (without anchors)
	}

	/**
	 * 'tm' is a special regex that combines time-related units (hh, mi, ss, ff, am -or- per) into a pattern against which a string can be tested.  
	 * because it will include a list of periods (e.g. 'midnight' | 'afternoon' ), we need to rebuild it if the user adds a new period
	 */
	static #period(config: Tempo.ConfigFile | Tempo.Config, units: Tempo.Units) {
		const periods = Object.keys(config.period).join('|');		// the current list of configured periods
		units['per'] = new RegExp(`(?<per>${periods})`, 'i');		// set the Tempo.units 'period' pattern

		const time = Tempo.regexp('hh', 'mi?', 'ss?', 'ff?', 'am?', '/|/', 'per').source.slice(1, -1);
		units['tm'] = new RegExp(time, 'i');										// set the Tempo.units 'tm' pattern (without anchors)
		units['tzd'] = new RegExp(`(?<tzd>[+-]${time}|Z)`, 'i');
	}

	/** swap parsing-order of patterns (to suit different locales) */
	static #swap(tz: string, ...arrs: { key: string }[][]) {
		const pats = [																					// regexs to swap (to change conform priority)
			['ddmmyy', 'mmddyy'],																	// swap ddmmyy for mmddyy
			['ddmmyytm', 'mmddyytm'],															// swap ddmmyytm for mmddyytm
		] as const;
		const idx = Tempo.#default.mmddyy.findIndex(itm => itm.timeZones?.includes(tz));
		const locale = idx !== -1
			? Tempo.#default.mmddyy[idx].locale										// found an Intl.Locale that contains our timeZone
			: void 0

		arrs.forEach(arr => {
			pats.forEach(([pat1, pat2]) => {
				const indx1 = arr.findIndex(el => el.key === pat1);
				const indx2 = arr.findIndex(el => el.key === pat2);

				if (indx1 === -1 || indx2 === -1)
					return;																						// nothing to swap

				const swap1 = (indx1 < indx2) && locale;
				const swap2 = (indx1 > indx2) && !locale;

				if (swap1 || swap2)																	// since 'arr' is a reference to an array, ok to swap in-line
					[arr[indx1], arr[indx2]] = [arr[indx2], arr[indx1]];
			})
		})

		return locale;
	}

	/** setup meteorological seasons based on hemisphere */
	static #sphere(sphere: Tempo.ConfigFile["sphere"], month: Tempo.Months) {
		(sphere !== Tempo.COMPASS.South
			? [void 0, 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter']
			: [void 0, 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer']
		)																												// 1=first, 2=mid, 3=last month of season
			.forEach((season, idx) => { if (idx !== 0) month[idx].season = `${season}.${idx % 3 + 1}` as Tempo.Month["season"] });
	}

	/** Northern -or- Southern hemisphere start of QTR1 */
	static #startFiscal(sphere: Tempo.Sphere = Tempo.COMPASS.North) {
		const start = sphere === Tempo.COMPASS.North ? Tempo.MONTH.Oct : Tempo.MONTH.Jul;
		return Tempo.MONTH[start] as Tempo.Calendar;
	}

	/** setup fiscal quarters, from a given start month */
	static #fiscal(quarter: Tempo.Calendar, month: Tempo.Months) {
		const start = enumKeys(Tempo.MONTH)
			.findIndex(mon => mon === Tempo.#prefix<Tempo.Calendar>(quarter));
		if (start === -1)
			return;																								// cannot determine start-Month

		for (let i = start, mon = 1; i <= (start + 12); i++, mon++) {
			const idx = i % 13;																		// index into the Month
			if (idx !== 0) {
				const qtr = Math.floor((mon - 1) / 3) + 1;					// quarter increments every third iteration
				const offset = (mon - 1) % 3 + 1;										// 1=first, 2=mid, 3=last month of quarter
				month[idx].quarter = qtr + (offset / 10) as Tempo.Month["quarter"];
			}
			else mon--
		}
	}

	/** properCase first letters of week-day/calendar-month */
	static #prefix = <T extends Tempo.Weekday | Tempo.Calendar>(str: T, len = 3) =>
		toProperCase(str.substring(0, len)) as T;

	/** get first Canonical name of a supplied locale */
	static #locale = (locale: string) => {
		let language: string | undefined;

		try {																										// lookup locale
			language = Intl.getCanonicalLocales?.(locale.replace('_', '-'))[0];
		} catch (error) { }																			// catch unknown locale

		return language ??
			navigator.languages[0] ??															// fallback to current first navigator.languages[]
			navigator.language ??																	// else navigator.language
			'en-US'																								// else reasonable default
	}

	/** try to infer hemisphere using the timezone's daylight-savings setting */
	static #dst = (tzone: string) => {
		const yy = Temporal.Now.plainDateISO().year;						// current year
		const tz = new Temporal.TimeZone(tzone);
		const jan = tz.getOffsetNanosecondsFor(Temporal.Instant.from(`${yy}-01-01T00:00+00:00`));
		const jun = tz.getOffsetNanosecondsFor(Temporal.Instant.from(`${yy}-06-01T00:00+00:00`));
		const dst = jan - jun;																	// timezone offset difference between Jan and Jun

		switch (true) {
			case dst < 0:
				return Tempo.COMPASS.North;
			case dst > 0:
				return Tempo.COMPASS.South;
			case dst === 0:																				// timeZone does not observe DST
			default:
				return void 0;
		}
	}

	// Static public methods ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * this allows Tempo to set a specific default configuration for a subsequent 'new Tempo()' to inherit.  
	 * Tempo.#default is set from init argument (if supplied), else local cache, else reasonable default values. 
	 * useful primarily for 'order of parsing input', as well as .quarter and .season
	 */
	static init = (init: Tempo.Init = {}) => {
		return Promise.race([
			Tempo.#ready.static.promise,													// wait until static-blocks are fully parsed (or two-seconds timeout)
			new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Tempo setup timed out')), Tempo.TIME.second * 2)),
		])
			.then(_ => {
				if (Tempo.#ready.init.status.state !== Pledge.STATE.Pending)
					Tempo.#ready.init = new Pledge<boolean>('Init');	// reset Init Pledge

				Object.assign(Tempo.#default, {
					level: Tempo.CONFIG.Static,												// static configuration
					calendar: init.calendar || Tempo.#dateTime.calendar,// default Calendar
					timeZone: init.timeZone || Tempo.#dateTime.timeZone,// default TimeZone
					locale: init.locale || Tempo.#dateTime.locale,		// default Locale
					pivot: init.pivot || 75,													// default pivot-duration for two-digit years
					debug: init.debug || false,												// default debug-mode
					catch: init.catch || false,												// default catch-mode
					timeStamp: init.timeStamp || 'ms',								// default millisecond timestamp
					sphere: init.sphere || Tempo.#dst(Tempo.#dateTime.timeZone) || Tempo.COMPASS.North,							// default hemisphere (for 'season')
					fiscal: init.fiscal || Tempo.#startFiscal(init.sphere || Tempo.#dst(Tempo.#dateTime.timeZone)),	// default fiscalYear start-month
					mmddyy: Tempo.#locales														// built-in locales that parse with 'mm-dd-yy' date order
						.map(locale => ({ locale: locale.baseName, timeZones: locale.timeZones })),										// timeZones in those locales
					pattern: [																				// built-in patterns to be processed in this order
						{ key: 'tm', reg: ['tm'] },											// clock or period
						{ key: 'dt', reg: ['dt'] },											// calendar or event
						{ key: 'ddmmyy', reg: ['dow?', 'dd?', 'sep', 'mm', 'sep', 'yy?'] },
						{ key: 'mmddyy', reg: ['dow?', 'mm', 'sep', 'dd?', 'sep', 'yy?'] },
						{ key: 'ddmmyytm', reg: ['dow?', 'sep', 'dd?', 'sep', 'mm', 'sep', 'yy?', '/ /', 'tm?'] },
						{ key: 'mmddyytm', reg: ['dow?', 'sep', 'mm', 'sep', 'dd', 'sep', 'yy?', '/ /', 'tm?'] },
						{ key: 'yymmdd', reg: ['dow?', 'sep', 'yy', 'sep', 'mm', 'sep', 'dd?'] },
						{ key: 'yymmddtm', reg: ['dow?', 'sep', 'yy', 'sep', 'mm', 'sep', 'dd', '/ /', 'tm?'] },
						{ key: 'dow', reg: ['mod?', 'dow', 'sep', 'tm?'] },
						{ key: 'evt', reg: ['mod?', 'evt', 'sep', 'tm?'] },
						{ key: 'yyqtr', reg: ['yy', 'sep', '/Q/', 'qtr'] },
					],
					period: {																					// built-in time-periods to be mapped
						midnight: '0:00',
						morning: '8:00',
						midmorning: '10:00',
						midday: '12:00',
						noon: '12:00',
						afternoon: '15:00',
						evening: '18:00',
						night: '20:00',
					},
					event: [																					// built-in date-events to be mapped (must be lower-case keys)
						['new.?years? ?eve', '31-Dec'],
						['nye', '31 Dec'],
						['new.?years?( ?day)?', '01 Jan'],
						['ny', '01 Jan'],
						['christmas', '25 Dec'],
						['xmas', '25 Dec'],
					],
					version: Version,																	// current semantic-version release
				} as Tempo.ConfigFile)

				const [country] = Tempo.#default.timeZone.toLowerCase().split('/');
				switch (country) {																	// TODO: better country detection
					case 'australia':
						Object.assign(Tempo.#default, { sphere: Tempo.COMPASS.South, fiscal: Tempo.#startFiscal(Tempo.COMPASS.South), locale: 'en-AU' });
						break;
					default:
				}

				// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				Tempo.read();																				// look for a stored config-file

				enumKeys(Tempo.MONTH)
					.forEach((mon, idx) => Tempo.#months[idx].name = mon);// stash month-name into Tempo.#months
				Tempo.#sphere(Tempo.#default.sphere, Tempo.#months);// setup seasons
				Tempo.#fiscal(Tempo.#default.fiscal, Tempo.#months);// setup fiscal quarters

				const locale = Tempo.#swap(Tempo.#default.timeZone, Tempo.#default.pattern);
				if (locale && !init.locale)
					Tempo.#default.locale = locale;										// found an override locale based on timeZone
				Tempo.#default.locale = Tempo.#locale(Tempo.#default.locale);

				Object.assign(Tempo.#default.event, init.event);		// add the argument events
				Tempo.#event(Tempo.#default, Tempo.units);					// setup special Date events (before patterns!)

				Object.assign(Tempo.#default.period, init.period);	// add the argument periods
				Tempo.#period(Tempo.#default, Tempo.units);					// setup special Time units (before patterns!)

				Tempo.#pattern = [];																// reset array of patterns
				Tempo.#default.pattern															// setup defaults as RegExp patterns
					.forEach(({ key, reg }) => Tempo.#pattern.push({ key, reg: Tempo.regexp(...reg) }));

				if ((getContext().type === CONTEXT.Browser && init.debug !== false) || init.debug === true)
					console.log('Tempo: ', omit(Tempo.#default, 'pattern', 'period'));

				return true;
			})
			.catch(err => {
				if (init.catch)
					console.warn(err.message)
				else throw new Error(err.message);									// re throw
			})
			.finally(() => Tempo.#ready.init.resolve(true));			// indicate Tempo.init() has completed
	}

	/**
	 * load a Tempo config-file into Tempo.#default
	 */
	static read() {
		const context = getContext();														// JavaScript runtime environment
		let store: string | null = null;
		switch (context.type) {
			case CONTEXT.Browser:
				store = context.global.localStorage.getItem(Tempo.#configKey);
				break;

			case CONTEXT.NodeJS:
				store = context.global.process.env[Tempo.#configKey];
				break;

			case CONTEXT.GoogleAppsScript:
				store = context.global.PropertiesService?.getUserProperties().getProperty(Tempo.#configKey);
				break;
		}

		if (isDefined(store)) {																	// found a config in storage
			const config = objectify(store) as Tempo.ConfigFile;	// config can override #default

			Object.assign(Tempo.#default, omit(config, 'pattern', 'period'));// override defaults from storage

			(config.pattern ?? [])
				.reverse()																					// prepend user-patterns from storage, as they have priority
				.map(pat => Object.entries(pat)[0])
				.forEach(([key, ref]) => Tempo.#default.pattern.unshift({ key, reg: asArray(ref) }));

			Object.assign(Tempo.#default.period, config.period ?? {});
		}
	}

	/** convert list of <string | RegExp> to a single RegExp */
	static regexp: {
		(...regs: Tempo.StringPattern[]): RegExp;
		(units: Tempo.Units, ...regs: Tempo.StringPattern[]): RegExp;
	}
		= (units: Tempo.Units | Tempo.StringPattern, ...regs: Tempo.StringPattern[]) => {
			if (!isObject(units)) {
				regs.splice(0, 0, units);														// stash 1st argument into 'regs' array
				units = Tempo.units;																// set units to static value
			}

			const regexes = regs.map(pat => {
				if (isRegExp(pat))																	// already a RegExp
					return pat;

				if (/^\/.*\/$/.test(pat))														// a string that looks like a RegExp  ("/.../")
					return new RegExp(pat.slice(1, -1));

				const isOpt = pat.endsWith('?') ? '?' : '';					// is pattern optional
				const match = isOpt ? pat.slice(0, -1) : pat;				// remove '?' from pattern
				const reg = (units as Tempo.Units)[match] ?? Tempo.units[match];	// lookup regexp

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
	static compare = (tempo1: Tempo.DateTime, tempo2?: Tempo.DateTime) => {
		const one = new Tempo(tempo1), two = new Tempo(tempo2);
		return Number((one.nano > two.nano) || -(one.nano < two.nano)) + 0;
	}

	/** write a default configuration into persistent storage */
	static store(config?: Tempo.ConfigFile) {
		const context = getContext();														// Javascript runtime environment
		const stash = stringify(config ?? omit(Tempo.#default, 'mmddyy', 'pattern'));

		switch (context.type) {
			case CONTEXT.Browser:
				context.global.localStorage.setItem(Tempo.#configKey, stash);
				break;

			case CONTEXT.NodeJS:
				context.global.process.env[Tempo.#configKey] = stash;
				break;

			case CONTEXT.GoogleAppsScript:
				context.global.PropertiesService?.getUserProperties().setProperty(Tempo.#configKey, stash);
				break;
		}
	}

	/** static method to create a new Tempo */
	static from = (tempo?: Tempo.DateTime, opts?: Tempo.Options) => new Tempo(tempo, opts);

	/** static method to access current epochNanoseconds */
	static now = () => Temporal.Now.instant().epochNanoseconds;

	/** static Tempo.Duration getter, where matched in Tempo.TIMES */
	static get durations() {
		return getAccessors<Temporal.DurationLike>(Temporal.Duration)
			.filter(key => enumKeys(Tempo.TIMES).includes(key));
	}

	/** static Tempo property getter */
	static get properties() {
		return getAccessors(Tempo) as (keyof Tempo)[];
	}

	/** Tempo global config settings */
	static get config() {
		return Tempo.#default;
	}

	/** array of regex patterns used when parsing Tempo.DateTime argument */
	static get patterns() {
		return Tempo.#pattern;
	}

	/** indicate when Tempo.init() is complete */
	static get ready() {
		return Tempo.#ready.static.promise
			.then(() => Tempo.#ready.init.promise)
	}

	/** end of static blocks */
	static {
		Tempo.#ready.static.resolve(true);
	}

	// Instance Symbols    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** allow for auto-convert of Tempo to BigInt */
	[Symbol.toPrimitive](hint?: 'string' | 'number' | 'default') {
		if (this.#config.debug)
			console.log('Tempo.hint: ', hint);
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
			console.log('dispose: ', this.#value);
	}

	get [Symbol.toStringTag]() {															// default string description
		return 'Tempo';
	}

	// Instance variables  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	#config: Tempo.Config;																		// instance config
	#value?: Tempo.DateTime;																	// constructor value
	#opts: Tempo.Options;																			// constructor arguments
	#units: Tempo.Units;																			// instance overrides
	#now: Temporal.Instant;																		// instantiation Temporal Instant, used only during construction
	#temporal!: Temporal.ZonedDateTime;												// underlying Temporal DateTime
	/** prebuilt formats object, for convenience */						fmt = {} as Tempo.TypeFmt;

	// Constructor  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	constructor(tempo?: Tempo.DateTime, opts?: Tempo.Options);// arg1: value to interpret (default to Temporal.Now.instant()), arg2: options to tailor the instance
	constructor(opts: Tempo.Options);													// arg1: options to tailor the instance

	constructor(tempo?: Tempo.DateTime | Tempo.Options, opts: Tempo.Options = {}) {
		if (isObject(tempo)) {
			Object.assign(opts, tempo);														// shift the 1st argument to the 2nd
			tempo = opts.value;																		// and reset the 1st argument (else undefined)
			delete opts.value;																		// no longer needed
		}
		this.#now = Temporal.Now.instant();											// stash current Instant
		this.#value = tempo;																		// stash original value
		this.#opts = opts;																			// stash original arguments
		this.#units = {};																				// units to use on this instance
		this.#config = {																				// allow for override of defaults and config-file
			level: Tempo.CONFIG.Instance,													// instance configuration
			version: Version,																			// instance version
			timeZone: new Temporal.TimeZone(opts.timeZone ?? Tempo.#default.timeZone).id,
			calendar: new Temporal.Calendar(opts.calendar ?? Tempo.#default.calendar).id,
			timeStamp: opts.timeStamp ?? Tempo.#default.timeStamp,// precision for Tempo timestamp
			locale: opts.locale ?? Tempo.#default.locale,					// help determine which DateFormat to check first
			pivot: opts.pivot ?? Tempo.#default.pivot,						// determines the century-cutoff for two-digit years
			sphere: opts.sphere ?? Tempo.#default.sphere,					// allow for override of hemisphere
			debug: opts.debug ?? Tempo.#default.debug,						// debug-mode for this instance
			catch: opts.catch ?? Tempo.#default.catch,						// catch-mode for this instance
			month: clone(Tempo.#months),													// clone the months
			period: clone(Tempo.#default.period),									// clone the Time-periods
			event: clone(Tempo.#default.event),										// clone the Date-events
			pattern: [],																					// additional instance-patterns
		}
		if (opts.debug) {
			Object
				.keys(opts)																					// get user-supplied options
				.filter(key => !['fiscal'].includes(key))						// except 'fiscal' which is used solely to derive #config.months
				.forEach(key => {
					if (!(key in this.#config))												// report warning if unrecognized key
						console.warn(`config: dropping unrecognized option '${key}'`);
				})
		}

		/** First task is to parse the 'Tempo.Options' looking for overrides to Tempo.#defaults */
		/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
		// timeZone provided but no hemisphere
		if (this.#config.timeZone !== Tempo.#default.timeZone && isUndefined(opts.sphere)) {
			const sphere = Tempo.#dst(this.#config.timeZone);			// infer hemisphere based on daylight-savings
			if (sphere)
				this.#config.sphere = sphere;
			if (!opts.locale)
				this.#config.locale = '';														// reset, so we can re-test
		}
		// change of sphere, setup new Seasons / Fiscal start-month
		if (this.#config.sphere !== Tempo.#default.sphere) {
			Tempo.#sphere(this.#config.sphere, this.#config.month);
			opts.fiscal ??= Tempo.#startFiscal(this.#config.sphere);
		}
		// change of Fiscal month, setup new Quarters
		if (opts.fiscal) {																			// change of fiscal-year starting month ?
			const mon = Tempo.#prefix<Tempo.Calendar>(opts.fiscal);
			const idx = Tempo.MONTH[mon];

			if (this.#config.month[idx].quarter !== 1)						// supplied fiscal is not Q1 in #config.month
				Tempo.#fiscal(mon, this.#config.month);
		}
		// user-specified time-periods to use when parsing this instance
		if (this.#opts.period)
			Tempo.#period(this.#config, this.#units);							// set instance 'per' and 'tm' patterns
		if (this.#opts.event)
			Tempo.#event(this.#config, this.#units);							// set instance 'evt' and 'dt' patterns

		// user-specified patterns to use when parsing this instance (might be array-of-array)
		if (this.#opts.pattern) {
			(isArray(this.#opts.pattern[0]) ? this.#opts.pattern as unknown as (NonNullable<Tempo.Options["pattern"]>)[] : [this.#opts.pattern])
				.map((pat, idx) => ({ key: '_' + idx, reg: Tempo.regexp(this.#units, ...pat) }))
				.forEach(pattern => this.#config.pattern.push(pattern));
		}
		// put user-patterns at the beginning of the parse-array
		this.#config.pattern.splice(this.#config.pattern.length, 0, ...Tempo.#pattern);
		// change of Locale, swap 'dmy' pattern parse-order?
		if (this.#config.locale !== Tempo.#default.locale) {
			const locale = Tempo.#swap(this.#config.timeZone, this.#config.pattern);

			if (isEmpty(this.#config.locale))
				this.#config.locale = locale || Tempo.#default.locale;
			this.#config.locale = Tempo.#locale(this.#config.locale);
		}

		if (this.#config.debug)
			console.log('tempo.config: ', this.config);						// show the resolve config options

		/** We now have all the info we need to instantiate a new Tempo                          */
		/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
		try {
			this.#temporal = this.#parse(tempo);									// attempt to interpret the DateTime arg

			if (['iso8601', 'gregory'].includes(this.config.calendar)) {
				enumKeys(Tempo.FORMAT)															// add all the pre-defined FORMATs to the instance (ie  Tempo().fmt.{})
					.forEach(key =>
						Object.assign(this.fmt, { [key]: this.format(Tempo.FORMAT[key]) }));	// add-on short-cut format codes
			}
		} catch (err) {
			if (this.#config.debug)																// log the error
				console.log('tempo.value: %s, opts: ', this.#value, this.#opts);
			if (this.#config.catch) {															// catch the error
				console.warn(`Cannot create Tempo: ${(err as Error).message}`);
				return {} as unknown as Tempo;											// TODO: need to return empty object?
			}
			else throw new Error(`Cannot create Tempo: ${(err as Error).message}`);
		}
	}

	// Public getters	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** 4-digit year */																				get yy() { return this.#temporal.year }
	/** month: Jan=1, Dec=12 */																get mm() { return this.#temporal.month }
	/** day of month */																				get dd() { return this.#temporal.day }
	/** hours since midnight: 24-hour format */								get hh() { return this.#temporal.hour }
	/** minutes since last hour */														get mi() { return this.#temporal.minute }
	/** seconds since last minute */													get ss() { return this.#temporal.second }
	/** milliseconds since last second */											get ms() { return this.#temporal.millisecond }
	/** microseconds since last millisecond */								get us() { return this.#temporal.microsecond }
	/** nanoseconds since last microsecond */									get ns() { return this.#temporal.nanosecond }
	/** fractional seconds since last second */								get ff() { return Number(`0.${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`) }
	/** number of weeks */																		get ww() { return this.#temporal.weekOfYear }
	/** timezone */																						get tz() { return this.#temporal.timeZoneId }
	/** default as milliseconds since Unix epoch */						get ts() { return this.#temporal[Tempo.#timeStamp[this.#config.timeStamp]] as number | bigint }
	/** weekday: Mon=1, Sun=7 */															get dow() { return this.#temporal.dayOfWeek }
	/** short month name */																		get mmm() { return Tempo.MONTH[this.#temporal.month] }
	/** long month name */																		get mon() { return Tempo.MONTHS[this.#temporal.month] }
	/** short weekday name */																	get ddd() { return Tempo.WEEKDAY[this.#temporal.dayOfWeek] }
	/** long weekday name */																	get day() { return Tempo.WEEKDAYS[this.#temporal.dayOfWeek] }
	/** quarter: Q1-Q4 */																			get qtr() { return Math.trunc(this.#config.month[this.mm].quarter) }
	/** meteorological season: Spring/Summer/Autumn/Winter */	get season() { return this.#config.month[this.mm].season.split('.')[0] as keyof typeof Tempo.SEASON }
	/** nanoseconds (BigInt) since Unix epoch */							get nano() { return this.#temporal.epochNanoseconds }
	/** Instance configuration */															get config() { return { ...this.#config } }
	/** units since epoch */																	get epoch() {
		return {
			/** seconds since epoch */														ss: this.#temporal.epochSeconds,
			/** milliseconds since epoch */												ms: this.#temporal.epochMilliseconds,
			/** microseconds since epoch */												us: this.#temporal.epochMicroseconds,
			/** nanoseconds since epoch */												ns: this.#temporal.epochNanoseconds,
		}
	}

	// Public Methods	 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/** calc DateTime duration */															until<U extends Tempo.DateTime | Tempo.Until>(until?: U) { return this.#until(until) }
	/** format elapsed time */																since<S extends Tempo.DateTime | Tempo.Until>(since?: S) { return this.#since(since) }
	/** apply formatting */																		format<K extends Tempo.FormatKeys>(fmt: K) { return this.#format(fmt) }

	/** add date/time unit */																	add(mutate: Tempo.Add) { return this.#set(mutate) }
	/** set to start/mid/end/period of unit */								set(offset: Tempo.Set) { return this.#set(offset) }

	/** is valid Tempo */																			isValid() { return !isEmpty(this) }
	/** as Temporal.ZonedDateTime */													toTemporal() { return this.#temporal }
	/** as Date object */																			toDate() { return new Date(this.#temporal.round({ smallestUnit: 'millisecond' }).epochMilliseconds) }
	/** as String */																					toString() { return this.#temporal.toString() }
	/** as Object */																					toJSON() {
		const config = (({ month, pattern, ...rest }) => rest)(this.#config);
		return ({ ...config, value: this.toString() });
	}

	// Private methods	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** parse DateTime input */
	#parse(tempo?: Tempo.DateTime) {
		const today = this.#now																	// cast instantiation to current timeZone, calendar
			.toZonedDateTime({ timeZone: this.#config.timeZone, calendar: this.#config.calendar });
		const arg = this.#conform(tempo, today);								// if String or Number, conform the input against known patterns
		if (this.#config.debug)
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
					if (this.#config.debug)
						console.warn('Cannot detect DateTime, fallback to Date.parse');
					return Temporal.ZonedDateTime.from(`${new Date(arg.value.toString()).toISOString()}[${this.config.timeZone}]`);
				}

			case 'Temporal.PlainDate':
			case 'Temporal.PlainDateTime':
				return arg.value
					.toZonedDateTime(this.#config.timeZone);

			case 'Temporal.PlainTime':
				return arg.value
					.toZonedDateTime({ timeZone: this.#config.timeZone, plainDate: today.toPlainDate() });

			case 'Temporal.PlainYearMonth':												// assume current day, else end-of-month
				return arg.value
					.toPlainDate({ day: Math.min(today.day, arg.value.daysInMonth) })
					.toZonedDateTime(this.#config.timeZone);

			case 'Temporal.PlainMonthDay':												// assume current year
				return arg.value
					.toPlainDate({ year: today.year })
					.toZonedDateTime(this.#config.timeZone);

			case 'Temporal.Instant':
				return arg.value
					.toZonedDateTime({ timeZone: this.#config.timeZone, calendar: this.#config.calendar });

			case 'Tempo':
				return arg.value
					.toTemporal();																		// clone current Tempo

			case 'Date':
				return new Temporal.ZonedDateTime(BigInt(arg.value.getTime() * 1_000_000), this.#config.timeZone, this.#config.calendar);

			case 'Number':																				// Number which didn't match a Tempo.pattern
			case 'BigInt':																				// BigInt is not checked against a Tempo.pattern
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
				return new Temporal.ZonedDateTime(epoch, this.#config.timeZone, this.#config.calendar);

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
			if (value.length <= 7)         												// cannot reliably interpret small numbers.  might be 'ss' or 'yymmdd' or 'dmmyyyy'
				throw new Error('Cannot safely interpret number with less than 8-digits: use string instead');
		}

		for (const { key, reg } of this.#config.pattern) {			// test against regular-expression patterns until a match is found		
			const pat = value.match(reg);													// return any matches

			if (isNull(pat) || isUndefined(pat.groups))						// if regexp named-groups not found
				continue;																						// 	skip this iteration

			/**
			 * if named-group 'dow' detected (with optional 'mod', 'nbr', and time-units), then calc relative weekday offset
			 *   Wed		-> Wed this week													might be earlier or later or equal to current day
			 *  -Wed		-> Wed last week													same as new Tempo('Wed').add({ weeks: -1 })
			 *  +Wed		-> Wed next week													same as new Tempo('Wed').add({ weeks:  1 })
			 * -3Wed		-> Wed three weeks ago  									same as new Tempo('Wed').add({ weeks: -3 })
			 *  <Wed		-> Wed prior to today 										might be current or previous week
			 * <=Wed		-> Wed prior to tomorrow									might be current or previous week
			 * Wed noon	-> Wed this week at 12:00pm								also allow for time-period specifiers
			 */
			if (isDefined(pat.groups['dow']) && Object.keys(pat.groups).every(el => ['dow', 'mod', 'nbr', 'hh', 'mi', 'ss', 'ff', 'am', 'per'].includes(el))) {
				const { dow, mod, nbr } = pat.groups;
				const weekday = Tempo.#prefix<Tempo.Weekday>(dow as Tempo.Weekday);
				const offset = enumKeys(Tempo.WEEKDAY).findIndex(el => el === weekday);
				const adj = today.daysInWeek * Number(isEmpty(nbr) ? '1' : nbr);
				let days = offset - today.dayOfWeek;								// number of days to offset from today

				switch (mod) {																			// switch on the 'modifier' character
					case void 0:																			// current week
					case '=':
						break;
					case '+':																					// next week
						days += adj;
						break;
					case '-':																					// last week
						days -= adj;
						break;
					case '<':																					// latest dow (this week or prev)
						if (today.dayOfWeek <= offset)
							days -= adj;
						break;
					case '<=':																				// latest dow (prior to today)
					case '-=':
						if (today.dayOfWeek < offset)
							days -= adj;
						break;
					case '>':																					// next dow
						if (today.dayOfWeek >= offset)
							days += adj;
						break;
					case '>=':
					case '+=':
						if (today.dayOfWeek > offset)
							days += adj;
						break;
				}

				const { year, month, day } = today.add({ days });
				pat.groups['yy'] = year.toString();									// set the now current year
				pat.groups['mm'] = month.toString();								// and month
				pat.groups['dd'] = day.toString();									// and day
			}

			/**
			 * if named-group 'dt' detected (with optional 'mod', 'nbr' and date-events), then calc date offset
				*/
			// if (isDefined(pat.groups['dt']) && Object.keys(pat.groups).every(el => ['dt', 'mod', 'nbr', 'dd', 'mm', 'yy', 'evt'].includes(el))) {
			// 	const { evt, mod, nbr } = pat.groups;
			// }
			/**
			 * if a date-event pattern was detected, translate it into its calendar values  
			 * we really are just expecting 'Day-Month' with optional 'Year' in the event-text at this release
			 */
			if (isDefined(pat.groups['evt'])) {										// re-test date-event against 'evt' pattern
				const evt = pat.groups['evt'].toLowerCase();
				const map = [...this.#config.event]
					.find(([pat, _]) => isDefined(evt?.match(pat)));	// first find which event-key matches the pat.groups['evt']
				if (isUndefined(map))
					throw new Error(`No definition for Event key: ${evt}`);

				const dmy = this.#config.pattern.find(pat => pat.key === 'ddmmyy');
				const ymd = this.#config.pattern.find(pat => pat.key === 'yymmdd');
				const grp = {} as Record<string, string>;						// RegExp.groups on a match

				if (dmy)																						// try a match on 'dmy' first
					Object.assign(grp, map[1].match(dmy['reg'])?.groups);
				if (isEmpty(grp) && ymd)														// try a match on 'ymd' if 'dmy' failed
					Object.assign(grp, map[1].match(ymd['reg'])?.groups);

				if (!isEmpty(grp)) {
					const { dd, mm, yy } = grp;
					Object.assign(pat.groups, { dd, mm, yy });
				}
			}

			/**
			 * resolve a month-name into a month-number (some browsers do not allow month-names)
			 * eg.	May				-> 05
			 */
			if (isDefined(pat.groups['mm']) && !isNumeric(pat.groups['mm'])) {
				const mm = Tempo.#prefix(pat.groups['mm'] as Tempo.Calendar);

				pat.groups['mm'] = enumKeys(Tempo.MONTH).findIndex(el => el === mm).toString();
			}

			// if 'Q1' or 'Q2' specified, might need to adjust year
			const qtr = Number(pat.groups['qtr'] < '3');					// if Q1 or Q2, then need to adjust 'yy' later on

			// resolve a quarter-number into a month-number
			if (isDefined(pat.groups['qtr'])) {
				const key = Number(`${pat.groups['qtr']}.1`);				// '.1' means start of quarter
				const idx = this.#config.month
					.findIndex(mon => mon.quarter === key);
				pat.groups['mm'] = idx.toString();									// set month to beginning of quarter
			}

			// if a time-period pattern was detected, translate it into its clock values
			if (isDefined(pat.groups['per'])) {										// re-test time-period against 'tm' pattern
				const per = this.#config.period[pat.groups['per'] as Tempo.Period];
				const lkp = this.#config.pattern.find(pat => pat.key === 'tm');
				if (lkp) {
					const { hh, mi, ss, ff, am } = per.match(lkp['reg'])?.groups || {};
					Object.assign(pat.groups, { hh, mi, ss, ff, am });
				}
			}

			// if a clock-value pattern was detected (at least 'hh'), translate it into a UTC-time string
			if (isDefined(pat.groups['hh'])) {										// assemble into a hh:mm:ss value
				const am = pat.groups['am'] as Tempo.Midday;				// 'am' or 'pm'
				let hh = pat.groups['hh'];

				pat.groups['dd'] ??= today.day.toString();					// if no 'day', use today
				if (hh === '24')																		// special for 'midnight'
					pat.groups['dd'] = (Number(pat.groups['dd']) + 1).toString();

				this.#adjustMidday(hh, am);													// adjust for midday offset (eg. 10pm => 22:00:00, 12:00am => 00:00:00)
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
					.subtract({ 'years': this.#config.pivot })				// arbitrary-years ago is pivot for century
					.year / 100, '.')																	// split on decimal-point
				const [century] = split(today.year / 100, '.');			// current century
				const yy = Number(pat.groups['yy']);								// as number

				pat.groups['yy'] = `${century - Number(yy > pivot)}${pat.groups['yy']}`;
			}

			/**
			 * finished analyzing pattern.  
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
					`[${this.#config.timeZone}]` +										// append timeZone
					`[u-ca=${this.#config.calendar}]`									// append calendar
			})

			if (this.#config?.debug)															// show the pattern that was matched, and the conformed value
				console.log('tempo.match: "%s", ', key, JSON.stringify(pat.groups));
			break;																								// stop checking patterns
		}

		return arg;
	}

	/**
	 * 
	 */
	#adjustMidday(hh: string | number, am: Tempo.Midday) {
		let hour = Number(hh);

		if (am?.toLowerCase() === 'pm' && hour < 12)
			hour += 12;
		if (am?.toLowerCase() === 'am' && hour >= 12)
			hour -= 12;
		if (hour === 24)
			hour = 0;																							// special for 'midnight'

		return hour;
	}

	/**
	 * parse a time-string against known patterns.  
	 * returns a 'hh:mm:ss' string.  
	 * input is a period (like 'midnight' or 'noon') or a pattern (like '10:30am')
	 */
	#clock(time: string) {
		const per = this.#config.period[time.toLowerCase() as Tempo.Period];
		const pat = this.#config.pattern.find(pat => pat.key === 'tm');

		if (per)																								// if arg is a Period,
			time = per;																						// 	then substitute the associated 'time' string
		if (!pat)																								// cannot find 'tm' Pattern
			return;

		const match = time.match(pat.reg);											// match the time-string against the 'tm' Pattern
		if (!match?.groups)																			//	else early exit
			return;

		// the 'match' result against the 'tm' RegExp should return named-group strings for 'hh', 'mi', 'ss' and 'am'
		let [hh, mi, ss, am] = split(match.groups['tm'], ':') as [number, string, string, Tempo.Midday];

		hh = this.#adjustMidday(hh, am);													// adjust for am/pm offset (eg. 10pm => 22:00:00, 12:00am => 00:00:00)

		return `${hh}:${mi}:${ss}`;
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
							return { mutate: key, offset: 0, single: unit.endsWith('s') ? unit.slice(0, -1) : unit }

						case 'period':
							return { mutate: 'set', offset: unit, single: 'period' }

						case 'event':
							return { mutate: 'set', offset: unit, single: 'event' }

						default:
							return { mutate: 'add', offset: Number(unit), single: key.endsWith('s') ? key.slice(0, -1) : key }
					}
				})(key);																						// IIFE to analyze arguments
				// const { mutate, offset, single } = ['start', 'mid', 'end'].includes(key)
				// 	? { mutate: key, offset: 0, single: unit.endsWith('s') ? unit.slice(0, -1) : unit }
				// 	: ['period'].includes(key)
				// 		? { mutate: 'set', offset: unit, single: 'period' }
				// 		: ['event'].includes(key)
				// 			? { mutate: 'set', offset: unit, single: 'event' }
				// 			: { mutate: 'add', offset: Number(unit), single: key.endsWith('s') ? key.slice(0, -1) : key }

				switch (`${mutate}.${single}`) {
					case 'set.period':
						const period = offset as Tempo.Period;
						const tm = this.#config.period[period];					// TODO
						return zdt;

					case 'set.event':																	// TODO
						return zdt;

					case 'start.year':
						return zdt
							.with({ month: Tempo.MONTH.Jan, day: 1 })
							.startOfDay();
					case 'start.season':
						const season1 = this.#config.month.findIndex(mon => mon.season === (this.season + .1));
						return zdt
							.with({ day: 1, month: season1 })
							.startOfDay();
					case 'start.quarter':
					case 'start.qtr':
						const qtr1 = this.#config.month.findIndex(mon => mon.quarter === (this.qtr + .1));
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
						return zdt
							.round({ smallestUnit: 'hour', roundingMode: 'trunc' });
					case 'start.minute':
						return zdt
							.round({ smallestUnit: 'minute', roundingMode: 'trunc' });
					case 'start.second':
						return zdt
							.round({ smallestUnit: 'second', roundingMode: 'trunc' });

					case 'mid.year':
						return zdt
							.with({ month: Tempo.MONTH.Jul, day: 1 })
							.startOfDay();
					case 'mid.season':
						const season2 = this.#config.month.findIndex(mon => mon.season === (this.season + .2));
						return zdt
							.with({ day: Math.trunc(zdt.daysInMonth / 2), month: season2 })
							.startOfDay();
					case 'mid.quarter':
					case 'mid.qtr':
						const qtr2 = this.#config.month.findIndex(mon => mon.quarter === (this.qtr + .2));
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

					case 'end.year':
						return zdt
							.add({ years: 1 })
							.with({ month: Tempo.MONTH.Jan, day: 1 })
							.startOfDay()
							.subtract({ nanoseconds: 1 });
					case 'end.season':
						const season3 = this.#config.month.findIndex(mon => mon.season === (this.season + .3));
						return zdt
							.with({ month: season3 })
							.add({ months: 1 })
							.with({ day: 1 })
							.startOfDay()
							.subtract({ nanoseconds: 1 });
					case 'end.quarter':
					case 'end.qtr':
						const qtr3 = this.#config.month.findIndex(mon => mon.quarter === (this.qtr + .3));
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
						return zdt
							.round({ smallestUnit: 'day', roundingMode: 'ceil' })
							.subtract({ nanoseconds: 1 });
					case 'end.hour':
						return zdt
							.round({ smallestUnit: 'hour', roundingMode: 'ceil' })
							.subtract({ nanoseconds: 1 });
					case 'end.minute':
						return zdt
							.round({ smallestUnit: 'minute', roundingMode: 'ceil' })
							.subtract({ nanoseconds: 1 });
					case 'end.second':
						return zdt
							.round({ smallestUnit: 'second', roundingMode: 'ceil' })
							.subtract({ nanoseconds: 1 });

					case 'add.year':
						return zdt
							.add({ years: offset });
					case 'add.season':
					case 'add.quarter':
					case 'add.qtr':
						return zdt
							.add({ months: offset * 3 });
					case 'add.month':
						return zdt
							.add({ months: offset });
					case 'add.week':
						return zdt
							.add({ weeks: offset });
					case 'add.day':
						return zdt
							.add({ days: offset });
					case 'add.hour':
						return zdt
							.add({ hours: offset });
					case 'add.minute':
						return zdt
							.add({ minutes: offset });
					case 'add.second':
						return zdt
							.add({ seconds: offset });

					default:
						throw new Error(`Unexpected method(${mutate}), unit(${unit}) and offset(${single})`);
				}
			}, this.#temporal)																		// start with the Tempo zonedDateTime

		return new Tempo(zdt as unknown as typeof Temporal);
	}

	#format = <K extends Tempo.FormatKeys>(fmt: K): Tempo.Format[K] => {
		const bailOut = void 0 as unknown as Tempo.Format[K];		// allow for return of 'undefined'

		if (isNull(this.#value))
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
				if (isUndefined(this.#config.month[this.mm]?.quarter)) {
					console.warn('Cannot determine "yearQuarter"');
					return bailOut;
				}

				const [full, part] = split(this.#config.month[this.mm].quarter);
				const mon = (full - 1) * 3 + part - 1;
				const yy = this.#temporal.with({ day: 1 }).add({ months: -mon }).add({ months: 11 }).year;

				return `${yy}Q${this.qtr}`;

			default:
				const am = asString(fmt).includes('hh')							// if 'twelve-hour' is present in fmtString
					? this.hh >= 12 ? 'pm' : 'am'											// noon is considered 'pm'
					: ''																							// else no am/pm suffix needed

				return asString(fmt)
					.replace(/y{4}/g, pad(this.yy))
					.replace(/y{2}/g, pad(this.yy).substring(2, 4))
					.replace(/m{3}/g, this.mmm)
					.replace(/m{2}/g, pad(this.mm))
					.replace(/d{3}/g, this.ddd)
					.replace(/d{2}/g, pad(this.dd))
					.replace(/h{2}/g, pad(this.hh))
					.replace(/mi/g, pad(this.mi))
					.replace(/s{2}/g, pad(this.ss))
					.replace(/H{2}$/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh) + am)
					.replace(/H{2}/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh))
					.replace(/MI$/g, pad(this.mi) + am)								// append 'am' if 'MI' at end of fmtString, and it follows 'HH'
					.replace(/MI/g, pad(this.mi))
					.replace(/S{2}$/g, pad(this.ss) + am)							// append 'am' if 'SS' at end of fmtString, and it follows 'HH'
					.replace(/S{2}/g, pad(this.ss))
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
		const offset = new Tempo(tempo, opts).#temporal;
		const dur = {} as Tempo.Duration;

		const duration = this.#temporal.until(offset, { largestUnit: unit === 'quarters' || unit === 'seasons' ? 'months' : (unit || 'years') });
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
				return duration.total({ relativeTo: this.#temporal, unit });
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
/** Tempo types / interfaces / enums */
export namespace Tempo {
	/** the value that Tempo will attempt to interpret as a valid ISO date / time */
	export type DateTime = string | number | bigint | Date | Tempo | typeof Temporal | null
	/** the options that Tempo will use to interpret a Tempo.DateTime */
	export type StringPattern = string | RegExp

	export type Options = {
		timeZone?: string,
		calendar?: string,
		locale?: string,
		pivot?: number,
		sphere?: Tempo.Sphere,
		debug?: boolean,
		catch?: boolean,
		fiscal?: Tempo.Calendar,
		timeStamp?: Tempo.TimeStamp,
		period?: Tempo.Periods,
		event?: Tempo.Events,
		pattern?: StringPattern[],
		fmt?: keyof Tempo.Format,
		value?: string,
	}
	/** Expected arguments */
	export interface Arguments {
		(): Tempo;
		(tempo: Tempo.DateTime, options?: Tempo.Options): Tempo;
		(opts: Tempo.Options): Tempo;
	}

	/** Timestamp precision */
	export type TimeStamp = 'ss' | 'ms' | 'us' | 'ns'
	export type TimeStamps = Record<Tempo.TimeStamp, keyof Temporal.ZonedDateTime>
	export type TimeUnit = Temporal.DateTimeUnit | 'quarter' | 'season'
	export type DiffUnit = Temporal.PluralUnit<Temporal.DateTimeUnit> | 'quarters' | 'seasons'
	export type Midday = 'am' | 'pm'
	export type Period = 'midnight' | 'morning' | 'midmorning' | 'midday' | 'noon' | 'afternoon' | 'evening' | 'night'
	export type Periods = Record<Tempo.Period, string>
	export type Units = Record<string, RegExp>
	export type EventKey = 'new.?year' | 'ny' | 'christmas' | 'xmas'
	export type Events = [Tempo.EventKey, string][]

	/** constructor parameter object */
	export interface Parameter {
		tempo?: Tempo.DateTime;
		opts?: Tempo.Options;
	}
	/** configuration to use for #until() and #since() argument */
	export interface Until extends Tempo.Parameter {
		unit?: Tempo.DiffUnit;
	}
	export type Mutate = 'start' | 'mid' | 'end'
	export type Set = Partial<Record<Tempo.Mutate, Tempo.TimeUnit | Tempo.DiffUnit> & Record<'period', Tempo.Period> & Record<'event', Tempo.EventKey>>
	export type Add = Partial<Record<Tempo.TimeUnit | Tempo.DiffUnit, number>>

	/** detail about a Month */
	export type Month = {
		name: keyof typeof Tempo.MONTH;
		season: `${keyof typeof Tempo.SEASON}.${1 | 2 | 3}`;
		quarter: 1 | 2 | 3 | 4;
	}
	/** tuple of 13 months */
	export type Months = [Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month]

	/** configuration on tempo.config.json */
	export interface ConfigFile {
		timeZone: string;
		calendar: string;
		locale: string;
		debug: boolean;
		catch: boolean;
		pivot: number;
		sphere: Tempo.Sphere;																		// hemisphere
		fiscal: Tempo.Calendar;																	// month to start fiscal-year
		timeStamp: Tempo.TimeStamp;															// precision for Tempo().ts
		mmddyy: { locale: string; timeZones: string[]; }[];			// Array of locales that prefer 'mm-dd-yy' date order
		pattern: { key: string, reg: string[] }[];							// Array of pattern strings, in order of preference
		period: Tempo.Periods;																	// map of time periods
		event: Tempo.Events;																		// map of known dates (usually only day-month, year inferred)
	}

	export interface Pattern {
		key: string;
		reg: RegExp;
	}
	/** configuration to use on Instance */
	export enum CONFIG { Static = 'static', Instance = 'instance' }
	export interface Config {
		level: Tempo.CONFIG,																		// separate configurations
		version: string;																				// semantic version
		timeZone: string,																				// TimeZone Id for this instance
		calendar: string,																				// Calendar Id for this instance
		pivot: number;																					// two-digit number to determine when to prepend '19' or '20' to a year
		locale: string;																					// Locale for this instance
		timeStamp: Tempo.TimeStamp;															// precision for Tempo().ts timestamp
		sphere: Tempo.Sphere;																		// primarily for seasons
		month: Tempo.Months;																		// tuple of months to assign quarter / season
		debug: boolean;																					// debug-mode for this instance
		catch: boolean;																					// catch-mode for this instance
		pattern: Tempo.Pattern[];																// conform patterns
		period: Tempo.Periods;																	// time periods for this instance
		event: Tempo.Events;																		// known dates for this instance
	}

	/** use to set Tempo.defaults */
	export interface Init {
		debug?: boolean;
		catch?: boolean;
		sphere?: Tempo.Sphere;
		fiscal?: Tempo.Calendar;
		calendar?: string;
		timeStamp?: Tempo.TimeStamp;
		timeZone?: string;
		locale?: string;
		pivot?: number;
		period?: Tempo.Periods;
		event?: Tempo.Events;
	}

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
	export type FormatKeys = keyof Tempo.Format

	export interface TypeFmt {
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
		epoch: 0,																								// TODO: is this needed ?
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

/**
 * kick-start Tempo configuration with default config  
 * use top-level await to indicate Tempo is ready
 */
await Tempo.init();

// shortcut functions to common Tempo properties / methods.
type Args<T> = {																						// Type for consistency in expected arguments
	(tempo?: Tempo.DateTime, opts?: Tempo.Options): T;				// parse Tempo.DateTime, default to Temporal.Instant.now()
	(opts: Tempo.Options): T;																	// provide just Tempo.Options (use {value:'XXX'} for specific Tempo.DateTime)
}
type Fmt = {																								// used for the fmtTempo() shortcut
	<F extends Tempo.FormatKeys>(fmt: F, tempo?: Tempo.DateTime, opts?: Tempo.Options): Tempo.Format[F];
	<F extends Tempo.FormatKeys>(fmt: F, opts: Tempo.Options): Tempo.Format[F];
}

/** check valid Tempo */			export const isTempo = (tempo?: unknown) => isType<Tempo>(tempo, 'Tempo');
/** current timestamp (ts) */	export const getStamp = ((tempo, opts) => new Tempo(tempo, opts).ts) as Args<number | bigint>;
/** create new Tempo */				export const getTempo = ((tempo, opts) => new Tempo(tempo, opts)) as Args<Tempo>;
/** format a Tempo */					export const fmtTempo = ((fmt, tempo, opts) => new Tempo(tempo, opts).format(fmt)) as Fmt;
