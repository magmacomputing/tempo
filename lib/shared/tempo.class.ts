import { asArray } from '@module/shared/array.library';
import { enumKeys } from '@module/shared/enum.library';
import { clone } from '@module/shared/serialize.library';
import { getScript } from '@module/shared/utility.library';
import { asString, pad } from '@module/shared/string.library';
import { getAccessors, omit } from '@module/shared/object.library';
import { asNumber, fromOctal, isNumeric, split } from '@module/shared/number.library';
import { asType, isType, isEmpty, isNull, isDefined, isTemporal, type OneKey } from '@module/shared/type.library';

import '@module/shared/prototype.library';									// patch String, Array

/** TODO: THIS IMPORT MUST BE REMOVED ONCE TEMPORAL IS SUPPORTED IN BROWSERS */
import { Temporal } from '@js-temporal/polyfill';

// shortcut functions to common Tempo properties / methods.
/** get Tempo.ts	*/ export const getStamp = (tempo?: Tempo.DateTime, args: Tempo.Argument = {}) => new Tempo(tempo, args).ts;
/** get new Tempo	*/ export const getTempo = (tempo?: Tempo.DateTime, args: Tempo.Argument = {}) => new Tempo(tempo, args);
/** format Tempo	*/ export const fmtTempo = <K extends keyof Tempo.Formats>(fmt: K, tempo?: Tempo.DateTime, args: Tempo.Argument = {}) => new Tempo(tempo, args).format(fmt);

/**
 * Wrapper Class around Temporal API  
 * ````
 * new Tempo(date, options)   
 * 	date?: string | number | Tempo	- value to be interpreted as a Temporal.ZonedDateTime
 * 	options?: object				- arguments to assist with parsing the <date> and configuring the instance
 * ````
 * A Tempo is an object that is used to manage a Temporal.ZonedDateTime.  
 * It has properties that break the value into components ('yy', 'dd', etc.)  
 * It has methods to perform manipulations (add(), format(), diff(), offset(), etc.)  
 * Import the short-cut functions to work with a Tempo (getTempo(), fmtTempo(), getStamp())
 */
export class Tempo {
	// Instance variables  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	#temporal!: Temporal.ZonedDateTime;
	#config: Tempo.Config;
	#value?: Tempo.DateTime;																	// constructor value
	#args: Tempo.Argument;																		// constructor arguments
	#now!: Temporal.ZonedDateTime;														// instantiation DateTime, used only during construction
	fmt = {} as Tempo.TypeFmt;																// inbuilt Formats

	// Static variables / methods	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	// user will need to know these in order to configure their own patterns
	static readonly regex: Record<string, RegExp> = {					// define some patterns to help conform input-strings
		yy: new RegExp(/(?<yy>(18|19|20|21)?\d{2})/),
		mm: new RegExp(/(?<mm>0?[1-9]|1[012]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/),
		dd: new RegExp(/(?<dd>0?[1-9]|[12][0-9]|3[01])/),
		dow: new RegExp(/(?<dow>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?(,)?( )?/),
		qtr: new RegExp(/(?<qtr>1|2|3|4)/),
		hh: new RegExp(/([01]\d|2[0-3])/),											// hh:  00 - 24
		tm: new RegExp(/(:[0-5]\d)/),														// tm:  00 - 59 (can be used for minutes and for seconds)
		ff: new RegExp(/(\.\d+)?/),															// fractional seconds
		am: new RegExp(/ ?(?<am>am|pm)?/),											// am/pm suffix
		sep: new RegExp(/[\/\-\ ]?/),														// list of separators between date-components
		mod: new RegExp(/(?<mod>[\+\-\<\>]?[\=]?)?(?<nbr>\d*)?/)// modifiers (_,-,<,<=,>,>=)
	}
	static {																									// now, combine some of the above component codes
		Tempo.regex['hm'] = new RegExp('(' + Tempo.regex.hh.source + Tempo.regex.tm.source + ')');
		Tempo.regex['hms'] = new RegExp('(?<hms>' + Tempo.regex.hh.source + '|' + Tempo.regex.hm.source + '|' + Tempo.regex.hm.source + Tempo.regex.tm.source + Tempo.regex.ff.source + ')');
		Tempo.regex['tzd'] = new RegExp('(?<tzd>[+-]' + Tempo.regex.hm.source + '|Z)')
	}

	// start with defaults for all Tempo instances
	static #Intl = Intl.DateTimeFormat().resolvedOptions();
	static #default: Tempo.ConfigFile = {											// these will be used if no tempo.config.json and no instance-argument overrides
		timeZone: this.#Intl.timeZone,													// default TimeZone
		calendar: this.#Intl.calendar,													// default Calendar
		locale: this.#Intl.locale,															// default Locale
		pivot: 75,																							// default pivot-duration for two-digit years
		debug: false,																						// default debug-mode
		catch: false,																						// default catch-mode
		compass: 'north' as Tempo.COMPASS.North,								// default hemisphere (for 'season')
		quarter: 'Jan',																					// default quarter-one start-month
		pattern: [																							// built-in patterns to be processed in this order
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
			{ key: 'dow', reg: ['mod', '/[\s]?/', 'dow'] },
			{ key: 'mon', reg: ['mm'] },
			{ key: 'isoDate', reg: ['yy', '/-/', 'mm', '/-/', 'dd', '/T/', 'hms', 'tzd'] },
		]
	}
	static #pattern: { key: string, reg: RegExp }[] = [];			// Array of regex-patterns to test, in order of 
	static #months = asArray({ length: 13 }, {}) as Tempo.Months;

	// override #default with any tempo.config settings
	static {
		const makeReg = (...regexes: RegExp[]) => new RegExp('^' + regexes.map(regex => regex.source).join('') + '$', 'i');

		if (isDefined(window)) {																// TODO: skip nodejs for now; only browser
			new Promise<boolean>(resolve => {
				try {
					fetch(`${getScript()}/../tempo.config.json`)			// look for config in same directory as this script
						.then(resp => resp.ok ? resp.json() : Promise.reject(resp.status))
						.then((cfg: Tempo.ConfigFile) => {							// override defaults from tempo.config
							Object.assign(this.#default, omit(cfg, 'pattern'));

							((cfg.pattern ?? []).concat(this.#default.pattern)) // prepend user-patterns from tempo.config as they have priority
								.forEach(({ key, reg }) =>
									this.#pattern.push({
										key,
										reg: makeReg(...reg.map(pat => /^\/.*\/$/.test(pat)
											? new RegExp(pat.substring(1, pat.length - 1))
											: Tempo.regex[pat]
										))
									})
								)

							// swap a couple of patterns, if required
							this.#swap(Tempo.#default.locale, this.#pattern, this.#default.pattern);
							this.#compass(Tempo.#default.compass, this.#months);
							this.#quarter(Tempo.#default.quarter, this.#months);
						})
						.catch(err => console.warn(`Error ${err}: Cannot fetch tempo.config.json`))
						.finally(() => resolve(true))										// resolve 'fetch'
				} catch (err: any) {																// catch network errors from 'fetch'
					console.warn(`Network issue on ./tempo.config.json: ${err.message}`);
					resolve(false);
				}
			})
				.finally(() => console.log('Tempo: ', omit(this.#default, 'pattern')))
		}
	}

	/** swap parsing-order of patterns (to suit different locales) */
	static #swap(locale: string, ...arrs: { key: string }[][]) {
		const fmts = ['en-US'];																	// locales that want m-d-y
		const pats = [																					// regexs to swap (to change priority)
			['ddmm', 'mmdd'],																			// swap ddmm for mmdd, if fmts
			['ddmmyy', 'mmddyy'],																	// swap ddmmyy for mmddyy if fmts
			['ddmmyyhhmi', 'mmddyyhhmi'],													// swap ddmmyyhhmi for ddmmyyhhmi if fmts
		]

		arrs.forEach(arr => {
			pats.forEach(([pat1, pat2]) => {
				const indx1 = arr.findIndex(el => el.key === pat1);
				const indx2 = arr.findIndex(el => el.key === pat2);

				if (indx1 === -1 || indx2 === -1)
					return;																						// nothing to swap

				const swap1 = (indx1 < indx2) && fmts.includes(locale);
				const swap2 = (indx1 > indx2) && !fmts.includes(locale);

				if (swap1 || swap2)																	// since 'arr' is a reference to an array, ok to swap in-place
					[arr[indx1], arr[indx2]] = [arr[indx2], arr[indx1]];
			})
		})
	}

	/** setup meteorological seasons based on compass */
	static #compass(compass: Tempo.ConfigFile["compass"], month: Tempo.Months) {
		(compass !== Tempo.COMPASS.South
			? [void 0, 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter']
			: [void 0, 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer'])
			.forEach((season, idx) => { if (idx !== 0) month[idx].season = `${season as keyof typeof Tempo.SEASON}.${idx % 3 + 1}` });
	}

	/** setup financial quarters, given a starting month */
	static #quarter(quarter: keyof typeof Tempo.MONTH | keyof typeof Tempo.MONTHS, month: Tempo.Months) {
		const start = Tempo.MONTH[quarter.substring(0, 3) as unknown as Tempo.MONTH] as unknown as number;

		for (let i = start, mon = 1; i <= (start + 12); i++, mon++) {
			const idx = i % 13;																		// index into the month
			if (idx !== 0) {
				const qtr = Math.floor((mon - 1) / 3) + 1;					// quarter increments every third iteration
				const offset = (mon - 1) % 3 + 1;										// 1=start, 2=mid, 3=end of quarter
				month[idx].quarter = qtr + (offset / 10);
			}
			else mon--
		}
	}

	static from = (tempo?: Tempo.DateTime, args: Tempo.Argument = {}) => new Tempo(tempo, args);

	/** Tempo.Duration getters, where matched in Tempo.TIMES */
	static get durations() {
		return getAccessors<Temporal.DurationLike>(Temporal.Duration)
			.filter(key => enumKeys(Tempo.TIMES).includes(key));
	}

	/** Tempo getters */
	static get properties() {
		return getAccessors<string>(Tempo);
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
	constructor(tempo?: Tempo.DateTime, args: Tempo.Argument = {}) {
		this.#value = tempo;																		// stash original value
		this.#args = args;																			// stash original arguments
		this.#config = {																				// allow for override of defaults and config-file
			timeZone: new Temporal.TimeZone(args.timeZone ?? Tempo.#default.timeZone),
			calendar: new Temporal.Calendar(args.calendar ?? Tempo.#default.calendar),
			locale: args.locale ?? Tempo.#default.locale,					// help determine which DateFormat to check first
			pivot: args.pivot ?? asNumber(Tempo.#default.pivot),	// determines the century-cutoff for two-digit years
			compass: args.compass ?? Tempo.#default.compass ?? Tempo.COMPASS.North,
			debug: args.debug ?? Tempo.#default.debug,						// debug-mode for this instance
			catch: args.catch ?? Tempo.#default.catch,						// catch-mode for this instance
			pattern: [...Tempo.#pattern],													// clone the pattern of RegExp's
			month: clone(Tempo.#months),													// clone the months
		}

		if (this.#config.locale !== Tempo.#default.locale) {		// change of locale, swap patterns-order ?
			if (this.#config.debug)
				console.log('locale: ', this.#config.locale);
			Tempo.#swap(this.#config.locale, this.#config.pattern);
		}
		if (this.#config.compass !== Tempo.#default.compass) {	// change of compass, swap hemisphere ?
			if (this.#config.debug)
				console.log('compass: ', this.#config.compass);
			Tempo.#compass(this.#config.compass, this.#config.month)
		}
		if (args.quarter) {
			const idx = Tempo.MONTH[args.quarter.substring(0, 3) as unknown as Tempo.MONTH] as unknown as number;
			if (Tempo.#months[idx].quarter !== 1) {								// change of Q1 start month
				if (this.#config.debug)
					console.log('quarter: ', args.quarter);
				Tempo.#quarter(args.quarter, this.#config.month);
			}
		}
		if (this.#config.debug)
			console.log('tempo: ', this.config);

		try {																										// we now have all the info we need to instantiate a Tempo
			this.#now = Temporal.Now.zonedDateTime(this.config.calendar, this.config.timeZone);
			this.#temporal = this.#parse(tempo);							// attempt to interpret the input arg

			if (['gregory', 'iso8601'].includes(this.config.calendar.toString())) {
				enumKeys(Tempo.FORMAT)															// add all the FORMATs to the instance
					.forEach(key =>
						Object.assign(this.fmt, { [key]: this.format(Tempo.FORMAT[key]) }));	// add-on short-cut format-codes
			}
		} catch (err: any) {
			if (this.#config.debug)																// log the error
				console.log('value: %s, args: ', this.#value, this.#args);
			if (this.#config.catch) {															// catch the error
				console.warn(`Cannot create Tempo: ${err.message}`);// TODO: need to return empty object?
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
	/** quarter: Q1-Q4 */																			get quarter() { return Math.trunc(this.#config.month[this.mm].quarter) }
	/** meteorolgical season: Spring/Summer/Autumn/Winter */	get season() { return this.#config.month[this.mm].season.split('.')[0] as keyof typeof Tempo.SEASON }
	/** Instance configuration */															get config() { return omit(this.#config as unknown as Tempo.Config, 'pattern') }

	// Public Methods	 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** calc DateTime duration */															diff<U extends Tempo.Diff>(diff: U) { return this.#since(diff) }
	/** apply formatting */																		format<K extends keyof Tempo.Formats>(fmt: K) { return this.#format(fmt) }
	/** format elapsed diff Dates */													elapse<E extends Tempo.Parameter>(elapse: E) { return this.#elapse(elapse) }

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
		const arg = this.#conform(tempo);												// if String or Number, conform the input against known patterns
		if (this.#config.debug)
			console.log('arg: ', arg);

		switch (arg.type) {
			case 'Null':																					// TODO: special Tempo
			case 'Undefined':
				return this.#now;

			case 'String':
			case 'Temporal.ZonedDateTime':
				try {
					return Temporal.ZonedDateTime.from(arg.value);		// attempt to parse conformed string
				} catch {
					const date = new Date(arg.value.toString());			// fallback to browser's Date.parse
					return Temporal.ZonedDateTime.from(`${date.toISOString()} [${this.#config.timeZone.toString()}]`);
				}

			case 'Temporal.PlainDate':
			case 'Temporal.PlainDateTime':
				return arg.value.toZonedDateTime(this.#config.timeZone);

			case 'Temporal.PlainTime':
				return arg.value.toZonedDateTime({ timeZone: this.#config.timeZone, plainDate: this.#now.toPlainDate() });

			case 'Temporal.PlainYearMonth':												// assume current day, else end-of-month
				const day = this.#now.day === this.#now.daysInMonth ? arg.value.daysInMonth : this.#now.day;
				return arg.value
					.toPlainDate({ day })
					.toZonedDateTime(this.#config.timeZone);

			case 'Temporal.PlainMonthDay':												// assume current year
				return arg.value
					.toPlainDate({ year: this.#now.year })
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
				const nano = BigInt(suffix.toString().substring(0, 9).padEnd(9, '0'));
				const value = BigInt(prefix);
				let epoch: bigint;

				switch (true) {
					case !isEmpty(suffix):														// seconds, with a fractional sub-second
					case prefix.length <= 10:													// looks like 'seconds'
						epoch = value * 1_000_000_000n + nano;
						break;
					case prefix.length <= 13:													// looks like 'milliseconds'
						epoch = value * 1_000_000n;
						break;
					case prefix.length <= 16:													// looks like 'microseconds'
						epoch = value * 1_000n;
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

	/** conform input against known patterns */
	#conform(tempo?: Tempo.DateTime) {
		const arg = asType(tempo, { type: 'Tempo', class: Tempo });

		// If value is a string | number | bigint and no format-arguments were provided to the constructor()
		if (isEmpty(this.#args?.format) && isType<string | number | bigint>(arg.value, 'String', 'Number', 'BigInt')) {
			const value = fromOctal(arg.value);										// attempt to interpret 'octal' as 'decimal'

			// Attempt to match the value against each one of the Tempo.pattern regular expressions until a match is found
			for (const { key, reg } of this.#config.pattern) {
				const pat = value.toString().trimAll(/\(|\)|\t/gi).match(reg);

				if (!isNull(pat) && isDefined(pat.groups)) {				// regexp named-groups found
					/**
					 * If just day-of-week specified, calc date offset
					 * Wed			-> Wed in the current week (might be earlier or later than current day)
					 * -Wed			-> Wed last week				-> same as new Tempo('Wed').add(-1,'weeks')
					 * +Wed			-> Wed next week				-> same as new Tempo('Wed').add(1, 'weeks')
					 * <Wed			-> Wed prior to today 	-> current week or previous week
					 * <=Wed		-> Wed prior to and including today
					 * -3Wed		-> Wed three weeks ago  -> same as new Tempo('Wed').add(-3,'weeks')
					 */
					if (Object.keys(pat.groups).every(el => ['dow', 'mod', 'nbr'].includes(el))) {
						const dow = pat.groups['dow'].substring(0, 3).toProperCase();
						const weeks = this.#now.daysInWeek * Number(isEmpty(pat.groups['nbr']) ? '1' : pat.groups['nbr']);
						const offset = enumKeys(Tempo.WEEKDAY).findIndex(el => el === dow);
						let adj = this.#now.dayOfWeek - offset;					// number of days to offset from today

						switch (pat.groups['mod']) {
							case void 0:																	// current week
							case '=':
								break;
							case '+':																			// next week
							case '+=':
								adj -= weeks;
								break;
							case '-':																			// last week
							case '-=':
								adj += weeks;
								break;
							case '<':																			// latest dow (this week or prev)
								if (this.#now.dayOfWeek <= offset)
									adj += weeks;
								break;
							case '<=':																		// latest dow (prior to today)
								if (this.#now.dayOfWeek < offset)
									adj += weeks;
								break;
							case '>':																			// next dow
								if (this.#now.dayOfWeek >= offset)
									adj -= weeks;
								break;
							case '>=':
								if (this.#now.dayOfWeek > offset)
									adj -= weeks;
								break;
						}

						this.#now = this.#now.subtract({ days: adj });	// adjust #now to new weekday
						pat.groups['dd'] = this.#now.day.toString();		// and set 'dd' to the now-current day
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
						const key = Number(`${pat.groups['qtr']} .1`);		// '.1' means start of quarter
						const idx = this.#config.month.findIndex(mon => mon.quarter === key) + 1;
						pat.groups['mm'] = idx.toString();							// set month to beginning of quarter
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
						pat.groups['dd'] ??= this.#now.day.toString();	// if no 'day', use today
					}

					/**
					 * Change two-digit year into four-digits using 'pivot-year' to determine previous century
					 * 20			-> 2022
					 * 34			-> 1934
					 */
					if (/^\d{2}$/.test(pat.groups['yy'])) {
						const [, pivot] = split<number>(this.#now
							.subtract({ 'years': this.#config.pivot })		// arbitrary-years ago is pivot for century
							.year / 100, '.')															// split on decimal-point
						const [century] = split<number>(this.#now.year / 100, '.');		// current century
						const yy = Number(pat.groups['yy']);						// as number

						pat.groups['yy'] = `${century - Number(yy > pivot)}${pat.groups['yy']}`;
					}

					/**
					 * Rebuild 'arg' into a string that Temporal can recognize
					 */
					Object.assign(arg, {
						type: 'String',
						value: `
								${pad(((Number(pat.groups['yy']) || this.#now.year) - Number(Number(pat.groups['qtr'] ?? '9') < 3)), 4)}-\
								${pad(pat.groups['mm'] || this.#now.month)}-\
								${pad(pat.groups['dd'] || '1')}\
								${pat.groups['hms'] || ''}`
							.trimAll(/\t/g) + 														// remove <tab> and redundant <space>
							`[${this.#config.timeZone}]` +								// append timeZone
							`[u-ca=${this.#config.calendar}]`							// append calendar
					})

					if (this.#config?.debug)
						console.log('%s: %s, pat: ', key, value, JSON.stringify(pat.groups));
					break;																						// stop checking patterns
				}
			}
		}

		return arg;
	}

	/** create a new offset Tempo */
	#offset = (args: (Tempo.Add | { offset: Tempo.Mutate }) | Tempo.Offset) => {
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
			case 'mid.quarter':
			case 'mid.qtr':
				const qtr2 = this.#config.month.findIndex(mon => mon.quarter === (this.qtr + .2));
				zdt = zdt.with({ day: 15, month: qtr2 }).startOfDay();
				break;
			case 'mid.month':
				zdt = zdt.with({ day: 15 }).startOfDay();
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

		return new Tempo(zdt);
	}

	#format = <K extends keyof Tempo.Formats>(fmt: K): Tempo.Formats[K] => {
		if (isNull(this.#value))
			return void 0 as unknown as Tempo.Formats[K];					// dont format <null> dates

		switch (fmt) {
			case Tempo.FORMAT.yearWeek:
				const offset = this.ww === 1 && this.mm === Tempo.MONTH.Dec;			// if late-Dec, add 1 to yy
				return asNumber(`${this.yy + Number(offset)}${pad(this.ww)}`);

			case Tempo.FORMAT.yearMonth:
				return asNumber(`${this.yy}${pad(this.mm)}`);

			case Tempo.FORMAT.yearMonthDay:
				return asNumber(`${this.yy}${pad(this.mm)}${pad(this.dd)}`);

			case Tempo.FORMAT.yearQuarter:
				const [full, part] = this.#config.month[this.mm].quarter.toString().split('.').map(Number);
				const mon = (full - 1) * 3 + part - 1;
				const yy = this.#temporal.with({ day: 1 }).add({ months: -mon }).add({ months: 11 }).year;
				// const yy = this.#offset({ start: 'month' }).add({ months: -mon }).add({ months: 11 }).yy;
				// const yy = this.yy - mon + 11;
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
					.replace(/us/g, pad(this.us))
					.replace(/ns/g, pad(this.ns))
					.replace(/f{2}/g, (pad(this.ff).split('.')[1] || '').padEnd(9, '0'))
					.replace(/w{2}/g, asString(this.ww))
					.replace(/dow/g, asString(this.dow))
					.replace(/day/g, this.day)
					.replace(/qtr/g, this.qtr.toString())
		}
	}

	/** calculate the difference between dates  
	 * (past is positive, future is negative)
	 */
	#since<U extends Tempo.Diff>({ tempo, args, unit }: U): U["unit"] extends Tempo.DiffUnit ? number : Tempo.Duration;
	#since({ tempo, args, unit } = {} as Tempo.Diff) {
		const offset = new Tempo(tempo, args).#temporal;
		const dur = {} as Tempo.Duration;

		const duration = this.#temporal.since(offset, { largestUnit: unit === 'quarters' || unit === 'seasons' ? 'months' : (unit || 'years') });
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
	#elapse({ tempo, args } = {} as Tempo.Parameter) {
		const offset = new Tempo(tempo, args).#temporal;
		let diff = offset.epochMilliseconds - this.#temporal.epochMilliseconds;

		const dd = Math.floor(diff / Tempo.TIMES.days);
		diff -= dd * Tempo.TIMES.days;

		const hh = Math.floor(diff / Tempo.TIMES.hours) % 24;
		diff -= hh * Tempo.TIMES.hours;

		const mm = Math.floor(diff / Tempo.TIMES.minutes) % 60;
		diff -= mm * Tempo.TIMES.minutes;

		const ss = Math.floor(diff / Tempo.TIMES.seconds);
		diff -= ss * Tempo.TIMES.seconds;

		return dd
			? pad(dd) + ':' + pad(hh) + ':' + pad(mm) + ':' + pad(ss) + '.' + pad(diff, 3)
			: hh
				? pad(hh) + ':' + pad(mm) + ':' + pad(ss) + '.' + pad(diff, 3)
				: pad(mm) + ':' + pad(ss) + '.' + pad(diff, 3)
	}
}

export namespace Tempo {
	/** the argument 'types' that this Class will attempt to interpret via Temporal API */
	export type DateTime = string | number | Date | Tempo | Temporal.ZonedDateTime | Temporal.PlainDateTime | Temporal.PlainDate | Temporal.PlainTime | Temporal.PlainYearMonth | Temporal.PlainMonthDay | null;
	export type Argument = { timeZone?: string, calendar?: string, format?: string, locale?: string, compass?: Tempo.COMPASS, quarter?: keyof typeof Tempo.MONTH | keyof typeof Tempo.MONTHS, pivot?: number, debug?: boolean, catch?: boolean };
	export type Mutate = 'start' | 'mid' | 'end';
	export type TimeUnit = Temporal.DateTimeUnit | 'quarter' | 'season';
	export type DiffUnit = Temporal.PluralUnit<Temporal.DateTimeUnit> | 'quarters' | 'seasons';

	export interface Parameter {															// parameter object
		tempo?: Tempo.DateTime;
		args?: Tempo.Argument;
	}
	export interface Diff extends Tempo.Parameter {						// configuration to use for diff() argument
		unit?: Tempo.DiffUnit;
	}
	export type Offset = OneKey<Tempo.Mutate, Tempo.TimeUnit | Tempo.DiffUnit>
	export type Add = OneKey<Tempo.TimeUnit | Tempo.DiffUnit, number>
	export type Month = {
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
		compass?: Tempo.COMPASS;
		quarter: Tempo.CALENDAR;																// month to start quarter-one
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
		compass?: Tempo.COMPASS;																// primarily for seasons
		month: Tempo.Months;																		// tuple of months to assign quarter / season
		debug?: boolean;																				// debug-mode for this instance
		catch?: boolean;																				// catch-mode for this instance
		pattern: Tempo.Pattern[];
	}
	export interface Formats {																// pre-configured format strings
		[str: string]: string | number;													// allow for dynamic format-codes
		[Tempo.FORMAT.display]: string;
		[Tempo.FORMAT.dayTime]: string;
		[Tempo.FORMAT.dayFull]: string;
		[Tempo.FORMAT.dayMonth]: string;
		[Tempo.FORMAT.dayDate]: string;
		[Tempo.FORMAT.sortTime]: string;
		[Tempo.FORMAT.monthDate]: string;
		[Tempo.FORMAT.monthTime]: string;
		[Tempo.FORMAT.HHMISS]: string;
		[Tempo.FORMAT.HHMI]: string;
		[Tempo.FORMAT.hhmi]: string;
		[Tempo.FORMAT.log]: string;
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
		dayMonth: string;
		dayDate: string;
		sortTime: string;
		monthDate: string;
		monthTime: string;
		HHMISS: string;
		HHMI: string;
		hhmi: string;
		log: string;
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
		dayMonth = 'dd-mmm',
		dayDate = 'ddd, yyyy-mmm-dd',
		sortTime = 'yyyy-mm-dd HH:MI',													// useful for sorting display-strings
		monthDate = 'yyyy-mmm-dd',
		monthTime = 'yyyy-mmm-dd HH:MI',												// useful for dates where dow is not needed
		HHMISS = 'HH:MI:SS',
		HHMI = 'HH:MI',																					// 24-hour format
		hhmi = 'hh:mi',																					// 12-hour format
		log = 'HH:MI:SS.ff',																		// useful for log-stamping
		yearWeek = 'yyyyww',
		yearMonth = 'yyyymm',
		yearMonthDay = 'yyyymmdd',
		yearQuarter = 'yyyyQqtr',
		date = 'ddd, yyyy-mmm-dd',															// synonym for dayDate
		time = 'HH:MI:SS',																			// synonym for HHMISS
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
