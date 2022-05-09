import { asArray } from '@module/shared/array.library';
import { enumKeys } from '@module/shared/enum.library';
import { clone, stringify, objectify } from '@module/shared/serialize.library';
import { getContext, CONTEXT } from '@module/shared/utility.library';
import { asString, pad } from '@module/shared/string.library';
import { getAccessors, omit } from '@module/shared/object.library';
import { asNumber, isNumeric, split } from '@module/shared/number.library';
import { asType, isType, isEmpty, isNull, isDefined, isUndefined, isArray, isRegExp, type OneKey } from '@module/shared/type.library';

import '@module/shared/prototype.library';									// patch prototypes

/** TODO: THIS IMPORT MUST BE REMOVED ONCE TEMPORAL IS SUPPORTED IN BROWSERS */
import { Temporal } from '@js-temporal/polyfill';

// shortcut functions to common Tempo properties / methods.
/** get Tempo.ts	*/ export const getStamp = (tempo?: Tempo.DateTime, opts: Tempo.Options = {}) => new Tempo(tempo, opts).ts;
/** get new Tempo	*/ export const getTempo = (tempo?: Tempo.DateTime, opts: Tempo.Options = {}) => new Tempo(tempo, opts);
/** format Tempo	*/ export const fmtTempo = <K extends keyof Tempo.Formats>(fmt: K, tempo?: Tempo.DateTime, opts: Tempo.Options = {}) => new Tempo(tempo, opts).format(fmt);

/**
 * Wrapper Class around Temporal API  
 * ````
 * new Tempo(DateTime, Options) or
 * Tempo.from(DateTime, Options) or
 * getTempo(DateTime, Options)  
 * 	DateTime?:	string | number | Tempo	- value to be interpreted as a Temporal.ZonedDateTime
 * 	Options?: 	object				- arguments to assist with parsing the <date> and configuring the instance
 * ````
 * A Tempo is an object that is used to wrap a Temporal.ZonedDateTime.  
 * It has accessors that report the value as DateTime components ('yy', 'dd', 'HH', etc.)  
 * It has methods to perform manipulations (add(), format(), diff(), offset(), etc.)  
 * Import the short-cut functions to work with a Tempo (getTempo(), fmtTempo(), getStamp()) indirectly
 */
export class Tempo {
	// Instance variables  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	#config: Tempo.Config;
	#value?: Tempo.DateTime;																	// constructor value
	#opts: Tempo.Options;																			// constructor arguments
	#temporal!: Temporal.ZonedDateTime;												// underlying Temporal DateTime
	#now!: Temporal.Instant;																	// instantiation Temporal Instant, used only during construction
	fmt = {} as Tempo.TypeFmt;																// prebuilt Formats

	// Static variables / methods	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** swap parsing-order of patterns (to suit different locales)  https://en.wikipedia.org/wiki/Date_format_by_country */
	static #swap(locale: string, ...arrs: { key: string }[][]) {
		const pats = [																					// regexs to swap (to change priority)
			['ddmm', 'mmdd'],																			// swap ddmm for mmdd
			['ddmmyy', 'mmddyy'],																	// swap ddmmyy for mmddyy
			['ddmmyyhhmi', 'mmddyyhhmi'],													// swap ddmmyyhhmi for ddmmyyhhmi
		]

		arrs.forEach(arr => {
			pats.forEach(([pat1, pat2]) => {
				const indx1 = arr.findIndex(el => el.key === pat1);
				const indx2 = arr.findIndex(el => el.key === pat2);

				if (indx1 === -1 || indx2 === -1)
					return;																						// nothing to swap

				const swap1 = (indx1 < indx2) && this.#default.mmddyy.includes(locale);
				const swap2 = (indx1 > indx2) && !(this.#default.mmddyy).includes(locale);

				if (swap1 || swap2)																	// since 'arr' is a reference to an array, ok to swap in-place
					[arr[indx1], arr[indx2]] = [arr[indx2], arr[indx1]];
			})
		})
	}

	/** setup meteorological seasons based on compass */
	static #compass(compass: Tempo.ConfigFile["compass"], month: Tempo.Months) {
		(compass !== Tempo.COMPASS.South
			? [void 0, 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter']
			: [void 0, 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer']
		)																												// 1=first, 2=mid, 3=last month of season
			.forEach((season, idx) => { if (idx !== 0) month[idx].season = `${season as keyof typeof Tempo.SEASON}.${idx % 3 + 1}` });
	}

	/** setup fiscal quarters, from a given start month */
	static #fiscal(quarter: keyof typeof Tempo.MONTH | keyof typeof Tempo.MONTHS, month: Tempo.Months) {
		const start = enumKeys(Tempo.MONTH).findIndex(mon => mon === quarter.substring(0, 3).toProperCase());

		for (let i = start, mon = 1; i <= (start + 12); i++, mon++) {
			const idx = i % 13;																		// index into the month
			if (idx !== 0) {
				const qtr = Math.floor((mon - 1) / 3) + 1;					// quarter increments every third iteration
				const offset = (mon - 1) % 3 + 1;										// 1=first, 2=mid, 3=last month of quarter
				month[idx].quarter = qtr + (offset / 10);
			}
			else mon--
		}
	}

	// user will need to know these in order to configure their own patterns
	static readonly units: Record<string, RegExp> = {					// define some patterns to help conform input-strings
		yy: new RegExp(/(?<yy>(18|19|20|21)?\d{2})/),
		mm: new RegExp(/(?<mm>0?[1-9]|1[012]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/),
		dd: new RegExp(/(?<dd>0?[1-9]|[12][0-9]|3[01])/),
		dow: new RegExp(/(?<dow>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?(,)?( )?/),
		qtr: new RegExp(/(?<qtr>1|2|3|4)/),
		hh: new RegExp(/([01]\d|2[0-3])/),											// hh:  00 - 24
		tm: new RegExp(/(:[0-5]\d)/),														// tm:  00 - 59 (can be used for minutes and for seconds)
		ff: new RegExp(/(\.\d+)?/),															// fractional seconds
		am: new RegExp(/ ?(?<am>am|pm)?/),											// am/pm suffix
		sep: new RegExp(/[\/\-\ \,]*/),													// list of separators between date-components
		mod: new RegExp(/((?<mod>[\+\-\<\>][\=]?)(?<nbr>\d*))?/),	// modifiers (_,-,<,<=,>,>=)
	}
	static {																									// now, combine some of the above units into common components
		Tempo.units['hm'] = new RegExp('(' + Tempo.units.hh.source + Tempo.units.tm.source + ')');
		Tempo.units['hms'] = new RegExp('(?<hms>' + Tempo.units.hh.source + '|' + Tempo.units.hm.source + '|' + Tempo.units.hm.source + Tempo.units.tm.source + Tempo.units.ff.source + ')');
		Tempo.units['tzd'] = new RegExp('(?<tzd>[+-]' + Tempo.units.hm.source + '|Z)')
	}

	/** convert array of <string | RegExp> to a single RegExp */
	static regexp = (...reg: (keyof typeof Tempo.units | RegExp)[]) => {
		const regexes = reg.map(pat => {
			if (isRegExp(pat))																		// already a RegExp
				return pat;

			if (/^\/.*\/$/.test(pat))															// a string that looks like a RegExp
				return new RegExp(pat.substring(1, pat.length - 1));

			if (isUndefined(Tempo.units[pat]))										// unknown unit, cannot proceed
				throw new Error(`Cannot find "${pat}" in Tempo.units`);

			return Tempo.units[pat]																// lookup prebuilt pattern
		})

		return new RegExp('^' + regexes.map(regex => regex.source).join('') + '$', 'i')
	}

	// start with defaults for all Tempo instances
	static #Intl = Intl.DateTimeFormat().resolvedOptions();
	static #default = {} as Tempo.ConfigFile;
	static #pattern: Tempo.Pattern[] = [];										// Array of regex-patterns to test until a match
	static #months = asArray({ length: 13 }, {}) as Tempo.Months;	// Array of settings related to a Month
	static #configKey = '_Tempo_';

	/**
	 * this allows Tempo to set specific default configuration.  
	 * useful primarily for 'order of parsing input', as well as .quarter and .season
	 */
	static init = (log = false) => {
		Object.assign(Tempo.#default, {
			timeZone: this.#Intl.timeZone,												// default TimeZone
			calendar: this.#Intl.calendar,												// default Calendar
			locale: this.#Intl.locale,														// default Locale
			pivot: 75,																						// default pivot-duration for two-digit years
			debug: false,																					// default debug-mode
			catch: false,																					// default catch-mode
			compass: Tempo.COMPASS.North,													// default hemisphere (for 'season')
			fiscal: Tempo.MONTH[Tempo.MONTH.Oct],									// default fiscalYear start-month
			mmddyy: ['en-US', 'en-AS'],														// default locales that prefer 'mm-dd-yy' date order
			pattern: [																						// built-in patterns to be processed in this order
				{ key: 'yyqtr', reg: ['yy', 'sep', '/Q/', 'qtr'] },
				{ key: 'hhmi', reg: ['hms', 'am'] },
				{ key: 'ddmm', reg: ['dow', 'dd', 'sep', 'mm'] },
				{ key: 'mmdd', reg: ['dow', 'mm', 'sep', 'dd'] },
				{ key: 'ddmmyy', reg: ['dow', 'dd', 'sep', 'mm', 'sep', 'yy'] },
				{ key: 'mmddyy', reg: ['dow', 'mm', 'sep', 'dd', 'sep', 'yy'] },
				{ key: 'ddmmyyhhmi', reg: ['dow', 'dd', 'sep', 'mm', 'sep', 'yy', '/ /', 'hms', 'am'] },
				{ key: 'mmddyyhhmi', reg: ['dow', 'mm', 'sep', 'dd', 'sep', 'yy', '/ /', 'hms', 'am'] },
				{ key: 'yymmdd', reg: ['dow', 'yy', 'sep', 'mm', 'sep', 'dd'] },
				{ key: 'yymmddhhmi', reg: ['dow', 'yy', 'sep', 'mm', 'sep', 'dd', '/ /', 'hms', 'am'] },
				{ key: 'dow', reg: ['mod', 'sep', 'dow'] },
				{ key: 'mon', reg: ['mm'] },
				{ key: 'yymm', reg: ['yy', 'sep', 'mm'] },
				// { key: 'isoDate', reg: ['yy', '/-/', 'mm', '/-/', 'dd', '/T/', 'hms', 'tzd'] },
			]
		})

		const country = Tempo.#Intl.timeZone.split('/')[0];
		switch (country) {																			// TODO: better country detection
			case 'Australia':
				Object.assign(Tempo.#default, { compass: Tempo.COMPASS.South, fiscal: Tempo.MONTH[Tempo.MONTH.Jul], locale: 'en-AU' });
				break;
			default:
		}

		const context = getContext();
		let store: string | undefined | null = void 0;
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
			config.locale &&= config.locale.replace('_', '-');		// standardize locale string
			Object.assign(this.#default, omit(config, 'pattern'));// override defaults from storage
			(config.pattern ?? [])
				.reverse()																					// prepend user-patterns from storage as they have priority
				.map(pat => Object.entries(pat)[0])
				.forEach(([key, ref]) => this.#default.pattern.unshift({ key, reg: asArray(ref) }));
		}

		this.#default.pattern																		// setup defaults as RegExp patterns
			.forEach(({ key, reg }) => this.#pattern.push({ key, reg: this.regexp(...reg) }));
		this.#swap(Tempo.#default.locale, this.#pattern, this.#default.pattern);
		this.#compass(Tempo.#default.compass, this.#months);		// setup seasons
		this.#fiscal(Tempo.#default.fiscal, this.#months);			// setup quarters
		enumKeys(Tempo.MONTH).forEach((mon, idx) => this.#months[idx].month = mon, 0);

		if (isUndefined(store)) {
			switch (context.type) {
				case CONTEXT.Browser:
					context.global.localStorage.setItem(Tempo.#configKey, stringify(omit(this.#default, 'pattern')));
					break;
			}
		}
		if (log)
			console.log('Tempo: ', omit(this.#default, 'pattern'));
	}

	/**
	 * static method to allow sorting array of Tempo  
	 * usage: [tempo1, tempo2, tempo3].sort(Tempo.compare)
	 */
	static compare = ((a: Tempo, b: Tempo) => a.age - b.age);

	/** static method to create a new Tempo */
	static from = (tempo?: Tempo.DateTime, opts: Tempo.Options = {}) => new Tempo(tempo, opts);

	/** Tempo.Duration getters, where matched in Tempo.TIMES */
	static get durations() {
		return getAccessors<Temporal.DurationLike>(Temporal.Duration)
			.filter(key => enumKeys(Tempo.TIMES).includes(key));
	}

	/** Tempo getters */
	static get properties() {
		return getAccessors(Tempo) as string[];
	}

	/** Tempo config settings */
	static get defaults() {
		return this.#default;
	}

	/** Array of regex patterns to check when parsing Tempo.DateTime */
	static get patterns() {
		return this.#pattern;
	}

	/** Constructor ************************************************************************************************* */
	constructor(tempo?: Tempo.DateTime, opts: Tempo.Options = {}) {
		this.#now = Temporal.Now.instant();											// stash current Instant
		this.#value = tempo;																		// stash original value
		this.#opts = opts;																			// stash original arguments
		this.#config = {																				// allow for override of defaults and config-file
			timeZone: new Temporal.TimeZone(opts.timeZone ?? Tempo.#default.timeZone),
			calendar: new Temporal.Calendar(opts.calendar ?? Tempo.#default.calendar),
			locale: opts.locale ?? Tempo.#default.locale,					// help determine which DateFormat to check first
			pivot: opts.pivot ?? asNumber(Tempo.#default.pivot),	// determines the century-cutoff for two-digit years
			compass: opts.compass ?? Tempo.#default.compass ?? Tempo.COMPASS.North,
			debug: opts.debug ?? Tempo.#default.debug,						// debug-mode for this instance
			catch: opts.catch ?? Tempo.#default.catch,						// catch-mode for this instance
			month: clone(Tempo.#months),													// clone the months
			pattern: [],																					// instance-patterns
		}

		if (this.#config.compass !== Tempo.#default.compass) {	// change of compass, swap hemisphere ?
			if (this.#config.debug)
				console.log('compass: ', this.#config.compass);
			Tempo.#compass(this.#config.compass, this.#config.month);
		}
		if (opts.fiscal) {
			const idx = Tempo.MONTH[opts.fiscal.substring(0, 3) as unknown as Tempo.MONTH] as unknown as number;
			if (Tempo.#months[idx].quarter !== 1) {								// change of fiscal-year start month
				if (this.#config.debug)
					console.log('fiscal: ', opts.fiscal);
				Tempo.#fiscal(opts.fiscal, this.#config.month);
			}
		}
		if (this.#opts.pattern) {																// user-specified pattern for this instance
			(isArray(this.#opts.pattern[0]) ? this.#opts.pattern as unknown as (NonNullable<Tempo.Options["pattern"]>)[] : [this.#opts.pattern])
				.map((pat, idx) => ({ key: '_' + idx, reg: Tempo.regexp(...pat) }))
				.forEach(pattern => this.#config.pattern.push(pattern))
		}
		this.#config.pattern.splice(this.#config.pattern.length, 0, ...Tempo.#pattern);
		if (this.#config.locale !== Tempo.#default.locale) {		// change of locale, swap patterns-order ?
			if (this.#config.debug)
				console.log('locale: ', this.#config.locale);
			Tempo.#swap(this.#config.locale, this.#config.pattern);
		}

		if (this.#config.debug)
			console.log('tempo: ', this.config);

		try {																										// we now have all the info we need to instantiate a Tempo
			this.#temporal = this.#parse(tempo);									// attempt to interpret the input arg

			if (['gregory', 'iso8601'].includes(this.config.calendar.toString())) {
				enumKeys(Tempo.FORMAT)															// add all the FORMATs to the instance
					.forEach(key =>
						Object.assign(this.fmt, { [key]: this.format(Tempo.FORMAT[key]) }));	// add-on short-cut format-codes
			}
		} catch (err: any) {
			if (this.#config.debug)																// log the error
				console.log('value: %s, opts: ', this.#value, this.#opts);
			if (this.#config.catch) {															// catch the error
				console.warn(`Cannot create Tempo: ${err.message}`);
				return {} as unknown as Tempo;											// TODO: need to return empty object?
			}
			else throw new Error(`Cannot create Tempo: ${err.message}`);
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
	/** timezone */																						get tz() { return this.#temporal.timeZone.toString() }
	/** seconds (timeStamp) since Unix epoch */								get ts() { return this.#temporal.epochSeconds }
	/** nanoseconds (BigInt) since Unix epoch */							get age() { return this.#temporal.epochNanoseconds }
	/** weekday: Mon=1, Sun=7 */															get dow() { return this.#temporal.dayOfWeek }
	/** short month name */																		get mmm() { return Tempo.MONTH[this.#temporal.month] }
	/** long month name */																		get mon() { return Tempo.MONTHS[this.#temporal.month] }
	/** short weekday name */																	get ddd() { return Tempo.WEEKDAY[this.#temporal.dayOfWeek] }
	/** long weekday name */																	get day() { return Tempo.WEEKDAYS[this.#temporal.dayOfWeek] }

	/** quarter: Q1-Q4 */																			get qtr() { return Math.trunc(this.#config.month[this.mm].quarter) }
	/** meteorological season: Spring/Summer/Autumn/Winter */	get season() { return this.#config.month[this.mm].season.split('.')[0] as keyof typeof Tempo.SEASON }
	/** Instance configuration */															get config() { return this.#config }

	// Public Methods	 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** calc DateTime duration */															diff<U extends Tempo.Until>(diff: U) { return this.#until(diff) }
	/** format elapsed diff Dates */													elapse<E extends Tempo.Until>(elapse: E) { return this.#since(elapse) }
	/** apply formatting */																		format<K extends keyof Tempo.Formats>(fmt: K) { return this.#format(fmt) }

	/** add date offset */																		add(mutate: Tempo.Add) { return this.#offset(Object.assign({}, mutate, { offset: 'add' })) }
	/** offset to start/mid/end of unit */										offset(offset: Tempo.Offset) { return this.#offset(offset) }

	/** as Temporal.ZonedDateTime */													toTemporal() { return this.#temporal }
	/** as Date object */																			toDate() { return new Date(this.#temporal.round({ smallestUnit: 'millisecond' }).epochMilliseconds) }
	/** as String */																					toString() { return this.#temporal.toString() }
	/** as method for JSON.stringify */												toJSON() { return this.#temporal.toJSON() }
	/** is valid Tempo */																			isValid() { return !isNaN(this.ts) }

	// Private methods	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** parse input */
	#parse(tempo?: Tempo.DateTime) {
		const today = this.#now.toZonedDateTime({ timeZone: this.#config.timeZone, calendar: this.#config.calendar });
		const arg = this.#conform(tempo, today);								// if String, Number or BigInt, conform the input against known patterns
		if (this.#config.debug)
			console.log('arg: ', arg);

		switch (arg.type) {
			case 'Null':																					// TODO: special Tempo for null?
			case 'Undefined':
				return today;

			case 'String':
			case 'Temporal.ZonedDateTime':
				try {
					return Temporal.ZonedDateTime.from(arg.value);		// attempt to parse conformed string
				} catch {																						// fallback to browser's Date.parse
					if (this.#config.debug)
						console.warn('Cannot detect DateTime, fallback to Date.parse');
					return Temporal.ZonedDateTime.from(`${new Date(arg.value.toString()).toISOString()}[${this.config.timeZone}]`);
				}

			case 'Temporal.PlainDate':
			case 'Temporal.PlainDateTime':
				return arg.value.toZonedDateTime(this.#config.timeZone);

			case 'Temporal.PlainTime':
				return arg.value.toZonedDateTime({ timeZone: this.#config.timeZone, plainDate: today.toPlainDate() });

			case 'Temporal.PlainYearMonth':												// assume current day, else end-of-month
				return arg.value
					.toPlainDate({ day: Math.min(today.day, arg.value.daysInMonth) })
					.toZonedDateTime(this.#config.timeZone);

			case 'Temporal.PlainMonthDay':												// assume current year
				return arg.value
					.toPlainDate({ year: today.year })
					.toZonedDateTime(this.#config.timeZone);

			case 'Temporal.Instant':
				return arg.value.toZonedDateTime({ timeZone: this.#config.timeZone, calendar: this.#config.calendar });

			case 'Tempo':
				return arg.value.toTemporal();											// clone current Tempo

			case 'Date':
				return new Temporal.ZonedDateTime(BigInt(arg.value.getTime() * 1_000_000), this.#config.timeZone, this.#config.calendar);

			case 'Number':
			case 'BigInt':
				const [prefix = '', suffix = ''] = arg.value.toString().split('.');
				const nano = BigInt(suffix.substring(0, 9).padEnd(9, '0'));
				const value = BigInt(prefix);
				let age: bigint;

				switch (true) {
					case !isEmpty(suffix):														// seconds, with a fractional sub-second
					case prefix.length <= 10:													// looks like 'seconds'
						age = value * 1_000_000_000n + nano;
						break;
					case prefix.length <= 13:													// looks like 'milliseconds'
						age = value * 1_000_000n;
						break;
					case prefix.length <= 16:													// looks like 'microseconds'
						age = value * 1_000n;
						break;
					default:																					// looks like 'nanoseconds'
						age = value;
						break;
				}
				return new Temporal.ZonedDateTime(age, this.#config.timeZone, this.#config.calendar);

			default:
				throw new Error(`Unexpected Tempo parameter type: ${arg.type}, ${arg.value}`);
		}
	}

	/** conform input against known patterns */
	#conform(tempo: Tempo.DateTime | undefined, today: Temporal.ZonedDateTime) {
		const arg = asType(tempo, { type: 'Tempo', class: Tempo });

		// only if type is a string | number | bigint
		if (!isType<string | number | bigint>(arg.value, 'String', 'Number', 'BigInt'))
			return arg;

		if (['Number', 'BigInt'].includes(arg.type)) {
			if (arg.value!.toString().length <= 7)								// might be 'seconds', might be 'yymmdd', might be 'dmmyyyy'
				throw new Error('Cannot safely parse number with less than 8-digits: use string');
		}

		// Attempt to match the value against each one of the regular expression patterns until a match is found
		for (const { key, reg } of this.#config.pattern) {
			const pat = arg.value.toString().trimAll(/\(|\)|\t/gi).match(reg);

			if (isNull(pat) || isUndefined(pat.groups))						// regexp named-groups not found
				continue;

			/**
			 * If just day-of-week specified, calc date offset
			 * Wed			-> Wed in the current week (might be earlier or later than or equal to current day)
			 * -Wed			-> Wed last week				-> same as new Tempo('Wed').add({ weeks: -1 })
			 * +Wed			-> Wed next week				-> same as new Tempo('Wed').add({ weeks: 1 })
			 * -3Wed		-> Wed three weeks ago  -> same as new Tempo('Wed').add({ weeks: 3 })
			 * <Wed			-> Wed prior to today 	-> current or previous week
			 * <=Wed		-> Wed prior to tomorrow-> current or previous week
			 */
			if (Object.keys(pat.groups).every(el => ['dow', 'mod', 'nbr'].includes(el)) && isDefined(pat.groups['dow'])) {
				const { dow, mod, nbr } = pat.groups;
				const weekday = dow.substring(0, 3).toProperCase();
				const offset = enumKeys(Tempo.WEEKDAY).findIndex(el => el === weekday);
				const days = today.daysInWeek * Number(isEmpty(nbr) ? '1' : nbr);
				let adj = offset - today.dayOfWeek;									// number of days to offset from today

				switch (mod) {																			// switch on the 'modifier' character
					case void 0:																			// current week
					case '=':
						break;
					case '+':																					// next week
					case '+=':
						adj += days;
						break;
					case '-':																					// last week
					case '-=':
						adj -= days;
						break;
					case '<':																					// latest dow (this week or prev)
						if (today.dayOfWeek <= offset)
							adj -= days;
						break;
					case '<=':																				// latest dow (prior to today)
						if (today.dayOfWeek < offset)
							adj -= days;
						break;
					case '>':																					// next dow
						if (today.dayOfWeek >= offset)
							adj += days;
						break;
					case '>=':
						if (today.dayOfWeek > offset)
							adj += days;
						break;
				}

				const { year, month, day } = today.add({ days: adj });
				pat.groups['yy'] = year.toString();									// set the now current year
				pat.groups['mm'] = month.toString();								// and month
				pat.groups['dd'] = day.toString();									// and day
			}

			/**
			 * Resolve a month-name into a month-number (some browsers do not allow month-names)
			 * May			-> 05
			 */
			if (isDefined(pat.groups['mm']) && !isNumeric(pat.groups['mm'])) {
				const mm = pat.groups['mm'].substring(0, 3).toProperCase();

				pat.groups['mm'] = enumKeys(Tempo.MONTH).findIndex(el => el === mm).toString();
			}

			/** Resolve a quarter-nummber into a month-number */
			if (isDefined(pat.groups['qtr'])) {
				const key = Number(`${pat.groups['qtr']} .1`);			// '.1' means start of quarter
				const idx = this.#config.month.findIndex(mon => mon.quarter === key) + 1;
				pat.groups['mm'] = idx.toString();									// set month to beginning of quarter
			}

			/**
			 * Adjust for am/pm offset
			 * 10pm			-> 22:00:00
			 * 12:00am	-> 00:00:00
			 */
			if (isDefined(pat.groups['hms'])) {
				let [hh, mi, ss] = split<number>(pat.groups['hms'], ':');

				if (pat.groups['am']?.toLowerCase() === 'pm' && hh < 12)
					hh += 12
				pat.groups['hms'] = `T${pad(hh)}:${pad(mi)}:${pad(ss)}`;
				pat.groups['dd'] ??= today.day.toString();					// if no 'day', use today
			}

			/**
			 * Change two-digit year into four-digits using 'pivot-year' to determine previous century
			 * 20			-> 2022
			 * 34			-> 1934
			 */
			if (/^\d{2}$/.test(pat.groups['yy'])) {
				const [, pivot] = split<number>(today
					.subtract({ 'years': this.#config.pivot })				// arbitrary-years ago is pivot for century
					.year / 100, '.')																	// split on decimal-point
				const [century] = split<number>(today.year / 100, '.');		// current century
				const yy = Number(pat.groups['yy']);								// as number

				pat.groups['yy'] = `${century - Number(yy > pivot)}${pat.groups['yy']}`;
			}

			/**
			 * Rebuild 'arg' into a string that Temporal can recognize
			 */
			Object.assign(arg, {
				type: 'String',
				value: `
						${pad(((Number(pat.groups['yy']) || today.year) - Number(Number(pat.groups['qtr'] ?? '9') < 3)), 4)}-\
						${pad(pat.groups['mm'] || today.month)}-\
						${pad(pat.groups['dd'] || '1')}\
						${pat.groups['hms'] || ''}`
					.trimAll(/\t/g) + 																// remove <tab> and redundant <space>
					`[${this.#config.timeZone}]` +										// append timeZone
					`[u-ca=${this.#config.calendar}]`									// append calendar
			})

			if (this.#config?.debug)
				console.log('%s: %s, pat: ', key, arg.value, JSON.stringify(pat.groups));
			break;																								// stop checking patterns
		}

		return arg;
	}

	/** create a new offset Tempo */
	#offset = (args: (Tempo.Add | Tempo.Offset | { offset: Tempo.Mutate })) => {
		const { mutate = 'add', unit = 'seconds', offset = 1 } = Object
			.entries(args)
			.reduce((acc, [key, val], _itm, arr) => {
				if (arr.length === 1) {															// mutate: start | mid | end
					acc.mutate = key as Tempo.Mutate;
					acc.unit = val;
				} else {																						// mutate: add
					if (key === 'offset') {
						acc.mutate = val;																// method to use when mutate a Tempo
					} else {
						acc.unit = key as Tempo.TimeUnit;								// unit of measure to mutate
						acc.offset = val ?? 1;													// number of units to mutate
					}
				}
				return acc;
			}, {} as { mutate: Tempo.Mutate, offset: number, unit: Tempo.TimeUnit | Tempo.DiffUnit })

		const single = unit.endsWith('s')
			? unit.substring(0, unit.length - 1)									// remove plural suffix
			: unit
		let zdt = this.#temporal;																// clone the Tempo instance

		switch (`${mutate}.${single}`) {
			case 'start.year':
				zdt = zdt.with({ month: Tempo.MONTH.Jan, day: 1 }).startOfDay();
				break;
			case 'start.season':
				const season1 = this.#config.month.findIndex(mon => mon.season === (this.season + .1));
				zdt = zdt.with({ day: 1, month: season1 }).startOfDay();
				break;
			case 'start.quarter':
			case 'start.qtr':
				const qtr1 = this.#config.month.findIndex(mon => mon.quarter === (this.qtr + .1));
				zdt = zdt.with({ day: 1, month: qtr1 }).startOfDay();
				break;
			case 'start.month':
				zdt = zdt.with({ day: 1 }).startOfDay();
				break;
			case 'start.week':
				zdt = zdt.with({ day: this.dd - this.dow + Tempo.WEEKDAY.Mon }).startOfDay();
				break;
			case 'start.day':
				zdt = zdt.startOfDay();
				break;
			case 'start.hour':
				zdt = zdt.round({ smallestUnit: 'hour', roundingMode: 'trunc' });
				break;
			case 'start.minute':
				zdt = zdt.round({ smallestUnit: 'minute', roundingMode: 'trunc' });
				break;
			case 'start.second':
				zdt = zdt.round({ smallestUnit: 'second', roundingMode: 'trunc' });
				break;

			case 'mid.year':
				zdt = zdt.with({ month: Tempo.MONTH.Jul, day: 1 }).startOfDay();
				break;
			case 'mid.season':
				const season2 = this.#config.month.findIndex(mon => mon.season === (this.season + .2));
				zdt = zdt.with({ day: Math.trunc(zdt.daysInMonth / 2), month: season2 }).startOfDay();
				break;
			case 'mid.quarter':
			case 'mid.qtr':
				const qtr2 = this.#config.month.findIndex(mon => mon.quarter === (this.qtr + .2));
				zdt = zdt.with({ day: Math.trunc(zdt.daysInMonth / 2), month: qtr2 }).startOfDay();
				break;
			case 'mid.month':
				zdt = zdt.with({ day: Math.trunc(zdt.daysInMonth / 2) }).startOfDay();
				break;
			case 'mid.week':
				zdt = zdt.with({ day: this.dd - this.dow + Tempo.WEEKDAY.Thu }).startOfDay();
				break;
			case 'mid.day':
				zdt = zdt.round({ smallestUnit: 'day', roundingMode: 'trunc' }).add({ hours: 12 });
				break;
			case 'mid.hour':
				zdt = zdt.round({ smallestUnit: 'hour', roundingMode: 'trunc' }).add({ minutes: 30 });
				break;
			case 'mid.minute':
				zdt = zdt.round({ smallestUnit: 'minute', roundingMode: 'trunc' }).add({ seconds: 30 });
				break;
			case 'mid.second':
				zdt = zdt.round({ smallestUnit: 'second', roundingMode: 'trunc' }).add({ milliseconds: 500 });
				break;

			case 'end.year':
				zdt = zdt.add({ years: 1 }).with({ month: Tempo.MONTH.Jan, day: 1 }).startOfDay().subtract({ nanoseconds: 1 });
				break;
			case 'end.season':
				const season3 = this.#config.month.findIndex(mon => mon.season === (this.season + .3));
				zdt = zdt.with({ month: season3 })
					.add({ months: 1 })
					.with({ day: 1 })
					.startOfDay()
					.subtract({ nanoseconds: 1 });
			case 'end.quarter':
			case 'end.qtr':
				const qtr3 = this.#config.month.findIndex(mon => mon.quarter === (this.qtr + .3));
				zdt = zdt.with({ month: qtr3 })
					.add({ months: 1 })
					.with({ day: 1 })
					.startOfDay()
					.subtract({ nanoseconds: 1 });
				break;
			case 'end.month':
				zdt = zdt.add({ months: 1 }).with({ day: 1 }).startOfDay().subtract({ nanoseconds: 1 });
				break;
			case 'end.week':
				zdt = zdt.with({ day: this.dd - this.dow + Tempo.WEEKDAY.Sun + 1 }).startOfDay().subtract({ nanoseconds: 1 });
				break;
			case 'end.day':
				zdt = zdt.round({ smallestUnit: 'day', roundingMode: 'ceil' }).subtract({ nanoseconds: 1 });
				break;
			case 'end.hour':
				zdt = zdt.round({ smallestUnit: 'hour', roundingMode: 'ceil' }).subtract({ nanoseconds: 1 });
				break;
			case 'end.minute':
				zdt = zdt.round({ smallestUnit: 'minute', roundingMode: 'ceil' }).subtract({ nanoseconds: 1 });
				break;
			case 'end.second':
				zdt = zdt.round({ smallestUnit: 'second', roundingMode: 'ceil' }).subtract({ nanoseconds: 1 });
				break;

			case 'add.year':
				zdt = zdt.add({ years: offset });
				break;
			case 'add.season':
			case 'add.quarter':
			case 'add.qtr':
				zdt = zdt.add({ months: offset * 3 });
				break;
			case 'add.month':
				zdt = zdt.add({ months: offset });
				break;
			case 'add.week':
				zdt = zdt.add({ weeks: offset });
				break;
			case 'add.day':
				zdt = zdt.add({ days: offset });
				break;
			case 'add.hour':
				zdt = zdt.add({ hours: offset });
				break;
			case 'add.minute':
				zdt = zdt.add({ minutes: offset });
				break;
			case 'add.second':
				zdt = zdt.add({ seconds: offset });
				break;

			default:
				throw new Error(`Unexpected method(${mutate}) and offset(${single})`);
		}

		return new Tempo(zdt as unknown as typeof Temporal);
	}

	#format = <K extends keyof Tempo.Formats>(fmt: K): Tempo.Formats[K] => {
		const bailOut = void 0 as unknown as Tempo.Formats[K];

		if (isNull(this.#value))
			return bailOut;																				// dont format <null> dates

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

				const [full, part] = split<number>(this.#config.month[this.mm].quarter);
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
					.replace(/H{2}/g, pad(this.hh))
					.replace(/MI/g, pad(this.mi))
					.replace(/S{2}/g, pad(this.ss))
					.replace(/h{2}$/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh) + am)
					.replace(/h{2}/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh))
					.replace(/mi$/g, pad(this.mi) + am)								// add 'am' if 'mi' at end of fmtString, and it follows 'hh'
					.replace(/mi/g, pad(this.mi))
					.replace(/s{2}$/g, pad(this.ss) + am)							// add 'am' if 'ss' at end of fmtString, and it follows 'hh'
					.replace(/s{2}/g, pad(this.ss))
					.replace(/ts/g, asString(this.ts))
					.replace(/ms/g, pad(this.ms, 3))
					.replace(/us/g, pad(this.us, 3))
					.replace(/ns/g, pad(this.ns, 3))
					.replace(/f{2}/g, asString(this.ff * 1_000_000_000))
					.replace(/w{2}/g, asString(this.ww))
					.replace(/dow/g, asString(this.dow))
					.replace(/day/g, this.day)
					.replace(/qtr/g, this.qtr.toString())
		}
	}

	/** calculate the difference between dates  (past is positive, future is negative) */
	#until<U extends Tempo.Until>({ tempo, opts, unit }: U): U["unit"] extends Tempo.DiffUnit ? number : Tempo.Duration;
	#until({ tempo, opts, unit } = {} as Tempo.Until) {
		const offset = new Tempo(tempo, opts).#temporal;
		const dur = {} as Tempo.Duration;

		const duration = this.#temporal.until(offset, { largestUnit: unit === 'quarters' || unit === 'seasons' ? 'months' : (unit || 'years') });
		for (const getter of Tempo.durations)
			dur[getter] = duration[getter] ?? 0;

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

	/** format the elapsed time between two dates (to milliseconds) */
	#since({ tempo, opts, unit } = {} as Tempo.Until) {
		const { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = this.#until({ tempo, opts });
		const since = `${pad(seconds)}.${pad(milliseconds, 3)}}`// default since

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

export namespace Tempo {
	/** the argument 'types' that this Class will attempt to interpret via Temporal API */
	export type DateTime = string | number | Date | Tempo | typeof Temporal | null;
	export type Options = { timeZone?: string, calendar?: string, pattern?: (string | RegExp)[], locale?: string, compass?: Tempo.COMPASS, fiscal?: keyof typeof Tempo.MONTH | keyof typeof Tempo.MONTHS, pivot?: number, debug?: boolean, catch?: boolean };
	export type Mutate = 'start' | 'mid' | 'end';
	export type TimeUnit = Temporal.DateTimeUnit | 'quarter' | 'season';
	export type DiffUnit = Temporal.PluralUnit<Temporal.DateTimeUnit> | 'quarters' | 'seasons';

	export interface Parameter {															// parameter object
		tempo?: Tempo.DateTime;
		opts?: Tempo.Options;
	}
	export interface Until extends Tempo.Parameter {					// configuration to use for diff() argument
		unit?: Tempo.DiffUnit;
	}
	export type Offset = OneKey<Tempo.Mutate, Tempo.TimeUnit | Tempo.DiffUnit>
	export type Add = OneKey<Tempo.TimeUnit | Tempo.DiffUnit, number>
	export type Month = {
		month: keyof typeof Tempo.MONTH;
		quarter: number;
		season: `${keyof typeof Tempo.SEASON}.${number}`;
	}
	export type Months = [Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month, Tempo.Month]

	export interface ConfigFile {															// configuration on tempo.config.json
		timeZone: string;
		calendar: string;
		locale: string;
		debug: boolean;
		catch: boolean;
		pivot: string | number;
		compass: Tempo.COMPASS;
		fiscal: Tempo.CALENDAR;																	// month to start fiscal-year
		mmddyy: string[];																				// Array of locales that prefer 'mm-dd-yy' date order
		pattern: { key: string, reg: string[] }[];							// Array of pattern objects, in order of preference
	}

	export interface Pattern {
		key: string;
		reg: RegExp;
	}
	export interface Config {																	// configuration to use on Instance
		timeZone: Temporal.TimeZone,														// TimeZone for this instance
		calendar: Temporal.Calendar,														// Calendar for this instance
		pivot: number;																					// two-digit number to determine when to prepend '19' or '20' to a year
		locale: string;																					// Locale for this instance
		compass: Tempo.COMPASS;																	// primarily for seasons
		month: Tempo.Months;																		// tuple of months to assign quarter / season
		debug?: boolean;																				// debug-mode for this instance
		catch?: boolean;																				// catch-mode for this instance
		pattern: Tempo.Pattern[];																// conform patterns
	}
	export interface Formats {																// pre-configured format strings
		[str: string]: string | number;													// allow for dynamic format-codes
		[Tempo.FORMAT.display]: string;
		[Tempo.FORMAT.dayTime]: string;
		[Tempo.FORMAT.dayFull]: string;
		[Tempo.FORMAT.dayMonth]: string;
		[Tempo.FORMAT.dayDate]: string;
		[Tempo.FORMAT.sortTime]: string;
		[Tempo.FORMAT.monthTime]: string;
		[Tempo.FORMAT.HHMI]: string;
		[Tempo.FORMAT.hhmi]: string;
		[Tempo.FORMAT.yearWeek]: number;
		[Tempo.FORMAT.yearMonth]: number;
		[Tempo.FORMAT.yearMonthDay]: number;
		[Tempo.FORMAT.yearQuarter]: string;
		[Tempo.FORMAT.date]: string;
		[Tempo.FORMAT.time]: string;
	}

	export interface TypeFmt {
		display: string;
		dayTime: string;
		dayFull: string;
		dayDate: string;
		dayMonth: string;
		sortTime: string;
		monthTime: string;
		HHMI: string;
		hhmi: string;
		yearWeek: number;
		yearMonth: number;
		yearMonthDay: number;
		yearQuarter: string;
		date: string;
		time: string;
	}

	export type Duration = Temporal.DurationLike & Record<"quarters" | "seasons", number> & Record<"iso", string>

	export enum WEEKDAY { All, Mon, Tue, Wed, Thu, Fri, Sat, Sun };
	export enum WEEKDAYS { Everyday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };
	export enum MONTH { All, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec };
	export enum MONTHS { Every, January, February, March, April, May, June, July, August, September, October, November, December };
	export enum DURATION { year, quarter, month, week, day, hour, minute, second };
	export enum DURATIONS { years, quarters, months, weeks, days, hours, minutes, seconds };
	export type CALENDAR = Exclude<keyof typeof Tempo.MONTH, 'All'>;

	export enum COMPASS {
		North = 'north',
		East = 'east',
		South = 'south',
		West = 'west'
	}

	export enum FORMAT {																			// pre-configured format names
		display = 'ddd, dd mmm yyyy',
		dayTime = 'ddd, yyyy-mmm-dd HH:MI',
		dayFull = 'ddd, yyyy-mmm-dd HH:MI:SS',									// useful for Sheets cell-format
		dayDate = 'ddd, yyyy-mmm-dd',
		dayMonth = 'dd-mmm',
		sortTime = 'yyyy-mm-dd HH:MI:SS',												// useful for sorting display-strings
		monthTime = 'yyyy-mmm-dd HH:MI',												// useful for dates where dow is not needed
		HHMI = 'HH:MI',																					// 24-hour format
		hhmi = 'hh:mi',																					// 12-hour format
		yearWeek = 'yyyyww',
		yearMonth = 'yyyymm',
		yearMonthDay = 'yyyymmdd',
		yearQuarter = 'yyyyQqtr',
		date = 'yyyy-mmm-dd',																		// just Date portion
		time = 'HH:MI:SS',																			// just Time portion
	}

	/** number of seconds per unit-of-time */
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
		nanoseconds = TIME.nanosecond * 1_000,
	}

	/** some useful Dates */
	export const DATE = {
		epoch: 0,
		maxDate: Temporal.PlainDate.from('9999-12-31'),
		minDate: Temporal.PlainDate.from('1000-01-01'),
		maxStamp: Temporal.Instant.from('9999-12-31+00:00').epochSeconds,
		minStamp: Temporal.Instant.from('1000-01-01+00:00').epochSeconds,
	} as const

	/** Seasons */
	export enum SEASON {
		Spring,
		Summer,
		Autumn,
		Winter,
	}
}

Tempo.init();																								// kick-start Tempo configuration