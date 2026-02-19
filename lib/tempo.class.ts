// #region library modules~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

import { Logify } from '#core/shared/logify.class.js';
import { ifDefined } from '#core/shared/object.library.js';
import { secure } from '#core/shared/utility.library.js';
import { Immutable, Serializable } from '#core/shared/class.library.js';
import { Cipher } from '#core/shared/cipher.class.js';
import { asArray } from '#core/shared/array.library.js';
import { cleanify } from '#core/shared/serialize.library.js';
import { getStorage, setStorage } from '#core/shared/storage.library.js';
import { ownKeys, ownEntries, getAccessors } from '#core/shared/reflection.library.js';
import { getContext, CONTEXT } from '#core/shared/utility.library.js';
import { asInteger, isNumeric, ifNumeric } from '#core/shared/number.library.js';
import { asString, pad, singular, toProperCase, trimAll } from '#core/shared/string.library.js';
import { getType, asType, isType, isEmpty, isNull, isNullish, isDefined, isUndefined, isString, isObject, isRegExp, isSymbol } from '#core/shared/type.library.js';
import type { IntRange, Property, Type } from '#core/shared/type.library.js';

import * as enums from '#core/shared/tempo.config/tempo.enum.js';
import terms from '#core/shared/tempo.config/plugins/term.import.js';
import { Match, Token, Snippet, Layout, Event, Period, Default, Options } from '#core/shared/tempo.config/tempo.defaults.js';

import '#core/shared/prototype.library.js';									// patch prototype

// /** TODO: THIS IMPORT CAN TO BE REMOVED ONCE TEMPORAL IS SUPPORTED IN JAVASCRIPT RUNTIME */
import { Temporal } from '@js-temporal/polyfill';

// #endregion

const VERSION = '0.2.0';																		// semantic version
const STORAGEKEY = '$Tempo';																// for stash in persistent storage
const Context = getContext();																// get current execution context

// #endregion Const variables

/**
 * # Tempo
 * **Tempo** is a powerful wrapper around `Temporal.ZonedDateTime` designed for flexible parsing and intuitive manipulation of date-time objects.
 * 
 * It bridges the gap between raw string/number inputs and the strict requirements of the ECMAScript Temporal API.
 * 
 * ### Key Features
 * - **Flexible Parsing**: Interprets strings, numbers, BigInts, and various Temporal objects.
 * - **Static Utility**: Access to common enums like `WEEKDAY`, `MONTH` and `SEASON`.
 * - **Fluent API**: Methods for adding, setting, formatting, and comparing date-times.
 * - **Alias Parsing**: Define custom `events` (e.g., "xmas" → "25 Dec") and `periods` (e.g., "noon" → "12:00") for intuitive parsing.
 * - **Plugin System**: Extensible via "terms" to provide contextual date calculations (e.g., quarters, seasons, zodiac signs, etc.).
 * 
 * @example
 * ```typescript
 * // Standard parsing
 * const t1 = new Tempo('2024-05-20');
 * 
 * // Using an event alias (pre-defined or custom)
 * const t2 = new Tempo('christmas'); // Dec 25th
 * 
 * // Using a period alias
 * const t3 = new Tempo('2024-05-20 midnight'); // 2024-05-20T00:00:00
 * 
 * // Custom events and periods for this instance
 * const t4 = new Tempo('birthday', { 
 *   event: [['birthday', '20 May']],
 *   period: [['tea-time', '15:30']] 
 * });
 * ```
 */
@Immutable
@Serializable
export class Tempo {
// #region Static enum properties~~~~~~~~~~~~~~~~~~~~~~~~~
	/** Weekday names (short-form) */													static get WEEKDAY() { return enums.WEEKDAY }
	/** Weekday names (long-form) */													static get WEEKDAYS() { return enums.WEEKDAYS }
	/** Month names (short-form) */														static get MONTH() { return enums.MONTH }
	/** Month names (long-form) */														static get MONTHS() { return enums.MONTHS }
	/** Time durations (singular) */													static get DURATION() { return enums.DURATION }
	/** Time durations (plurar) */														static get DURATIONS() { return enums.DURATIONS }
	/** Time durations as seconds (singular) */								static get TIME() { return enums.TIME }
	/** Time durations as milliseconds (plural) */						static get TIMES() { return enums.TIMES }

	/** Quarterly Seasons */																	static get SEASON() { return enums.SEASON }
	/** Compass cardinal points */														static get COMPASS() { return enums.COMPASS }

	/** Tempo to Temporal DateTime Units map */								static get ELEMENT() { return enums.ELEMENT }
	/** Pre-configured format {name -> string} pairs */				static get FORMAT() { return enums.FORMAT }
	/** some useful Dates */																	static get LIMIT() { return enums.LIMIT }

	// #endregion

	// #region Static private properties~~~~~~~~~~~~~~~~~~~~~~
	static #dbg = new Logify('Tempo', {
		debug: Default?.debug ?? false,
		catch: Default?.catch ?? false
	})

	static #global = {} as Internal.Shape

	// #endregion

	// #region Static private methods~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * {dt} is a layout that combines date-related {snippets} (dd, mm -or- evt) into a pattern against which a string can be tested.  
	 * because it will also include a list of events (e.g. 'new_years' | 'xmas'), we need to rebuild {dt} if the user adds a new event
	 */
	// TODO:  check all Layouts which reference "{evt}" and update them
	static #makeEvent(shape: Internal.Shape) {
		const src = shape.config.level.substring(0, 1);					// 'g'lobal or 'l'ocal
		const events = ownEntries(shape.parse.event)
			.map(([pat, _], idx) => `(?<${src}evt${idx}>${pat})`)	// assign a number to the pattern
			.join('|')																						// make an 'Or' pattern for the event-keys

		if (events)
			shape.parse.snippet[Token.evt] = new RegExp(events);	// set the snippet's {event} pattern

		if (shape.isMonthDay)																		// override the {dt} layout if {isMonthDay}
			shape.parse.layout[Token.dt] = '{mm}{sep}?{dd}({sep}?{yy})?|{mod}?({evt})' as typeof shape.parse.layout[typeof Token.dt];
		// else
		// 	shape.parse.layout[Token.dt] = '{dd}{sep}?{mm}({sep}?{yy})?|{mod}?({evt})';
	}

	/**
	 * {tm} is a layout that combines time-related snippets (hh, mi, ss, ff, mer -or- per) into a pattern against which a string can be tested.  
	 * because it will also include a list of periods (e.g. 'midnight' | 'afternoon' ), we need to rebuild {tm} if the user adds a new period
	*/
	// TODO:  check all Layouts which reference "{per}" and update them
	static #makePeriod(shape: Internal.Shape) {
		const src = shape.config.level.substring(0, 1);					// 'g'lobal or 'l'ocal
		const periods = ownEntries(shape.parse.period)
			.map(([pat, _], idx) => `(?<${src}per${idx}>${pat})`)	// {pattern} is the 1st element of the tuple
			.join('|')																						// make an 'or' pattern for the period-keys

		if (periods)
			shape.parse.snippet[Token.per] = new RegExp(periods);	// set the snippet's {period} pattern
	}

	/** determine if we have a {timeZone} which prefers {mdy} date-order */
	static #isMonthDay(shape: Internal.Shape) {
		const shapeZone = shape.config.timeZone ?? Tempo.#global.config.timeZone;
		const monthDay = asArray(Tempo.#global.config.monthDay)	// combine global and local {monthDay}

		if (shape.config.level === 'local' && isDefined(shape.config.monthDay))
			monthDay.concat(shape.config.monthDay)

		return monthDay.some(mdy => mdy.timeZones?.includes(shapeZone));
	}

	/**
	 * swap parsing-order of layouts to suit different locales  
	 * this allows the parser to try to interpret '04012023' as Apr-01-2023 before trying 04-Jan-2023  
	 */
	static #swapLayout(shape: Internal.Shape) {
		const layouts = ownEntries(shape.parse.layout);					// get entries of Layout Record
		const swap = shape.parse.mdyLayouts;										// get the swap-tuple
		let chg = false;																				// no need to rebuild, if no change

		swap
			.forEach(([dmy, mdy]) => {														// loop over each swap-tuple
				const idx1 = layouts.findIndex(([key]) => key.description === dmy);	// 1st swap element exists in {layouts}
				const idx2 = layouts.findIndex(([key]) => key.description === mdy);	// 2nd swap element exists in {layouts}

				if (idx1 === -1 || idx2 === -1)
					return;																						// no pair to swap

				const swap1 = (idx1 < idx2) && shape.isMonthDay;		// we prefer {mdy} and the 1st tuple was found earlier than the 2nd
				const swap2 = (idx1 > idx2) && !shape.isMonthDay;		// we dont prefer {mdy} and the 1st tuple was found later than the 2nd

				if (swap1 || swap2) {																// since {layouts} is an array, ok to swap by-reference
					[layouts[idx1], layouts[idx2]] = [layouts[idx2], layouts[idx1]];
					chg = true;
				}
			})

		if (chg)
			shape.parse.layout = Object.fromEntries(layouts) as Layout;			// rebuild Layout in new parse order
	}

	/** properCase week-day / calendar-month */
	static #prefix = <T extends Tempo.WEEKDAY | Tempo.MONTH>(str: T) =>
		toProperCase(str.substring(0, 3)) as T;

	/** get first Canonical name of a supplied locale */
	static #locale = (locale?: string) => {
		let language: string | undefined;

		try {																										// lookup locale
			language = Intl.getCanonicalLocales(locale!.replace('_', '-'))[0];
		} catch (error) { }																			// catch unknown locale

		const global = Context.global;

		return language ??
			global?.navigator?.languages?.[0] ??									// fallback to current first navigator.languages[]
			global?.navigator?.language ??												// else navigator.language
			locale																								// cannot determine locale
	}

	/** try to infer hemisphere using the timezone's daylight-savings setting */
	static #setSphere = (shape: Internal.Shape) => {
		if (isUndefined(shape.config.timeZone) || isDefined(shape.config.sphere))
			return shape.config.sphere;														// already specified

		const zdt = Temporal.Now.zonedDateTimeISO(shape.config.timeZone);
		const jan = zdt.with({ day: 1, month: 1 }).offsetNanoseconds;
		const jun = zdt.with({ day: 1, month: 6 }).offsetNanoseconds;
		const dst = Math.sign(jan - jun);												// timeZone offset difference between Jan and Jun

		switch (dst) {
			case -1:
				return Tempo.COMPASS.North;													// clock moves backward in Northern hemisphere
			case 1:
				return Tempo.COMPASS.South;													// clock moves forward in Southern hemisphere
			default:
				return Default.sphere ?? this.COMPASS.North;				// timeZone does not observe DST
		}
	}

	/**
	 * conform input of Snippet / Layout / Event / Period options  
	 * This is needed because we allow the user to flexibly provide detail as {[key]:val} or {[key]:val}[] or [key,val][]  
	 * for example:  
	 ```  
	 Tempo.init({ snippet: {'yy': /20\d{2}/, 'mm': /[0-9|1|2]\d/ } })  
	 Tempo.init({ layout: {'ddmm': '{dd}{sep}?{mm}'} })  
	 Tempo.init({ layout: '{wkd}' })													(can be a single string)  
	 Tempo.init({ layout: '({wkd})? {tm}' })									(or a string combination of snippets)  
	 Tempo.init({ layout: new Map([['name1', '{wkd} {yy}']], ['name2', '{mm}{sep}{dd}']]]) }) 
	 Tempo.init({ layout: [ {name1: '{wkd} {yy}'}, {name2: '{mm}{sep}{dd}'} ]
	 
	 Tempo.init({event: {'canada ?day': '01-Jun', 'aus(tralia)? ?day': '26-Jan'} })  
	 Tempo.init({period: [{'morning tea': '09:30' }, {'elevenses': '11:00' }]})  
	 new Tempo('birthday', {event: [["birth(day)?", "20-May"], ["anniversary", "01-Jul"] ]})  
	 ```
	 */
	static #setConfig(shape: Internal.Shape, ...options: Tempo.Options[]) {
		shape.config ??= {} as Tempo.Config;
		shape.parse ??= {} as Internal.Parse;

		options
			.forEach(option => {
				if (!option) return;
				ownEntries(option)
					.forEach(([optKey, optVal]) => {
						const arg = asType(optVal);

						switch (optKey) {
							case 'snippet':
								shape.parse["snippet"] ??= {};
								const snip = shape.parse["snippet"];

								switch (arg.type) {
									case 'Object':
										ownEntries(arg.value as Snippet)
											.forEach(([key, val]) => snip[Tempo.getSymbol(key)] = val);
										break;
									case 'String':
										snip[Tempo.getSymbol()] = new RegExp(arg.value);
										break;
									case 'RegExp':
										snip[Tempo.getSymbol()] = arg.value;
										break;
									case 'Array':
										(arg.value as any[])
											.forEach(elm => {
												const itm = asType(elm);
												switch (itm.type) {
													case 'Object':
														ownEntries(itm.value as Snippet)
															.forEach(([key, val]) => snip[Tempo.getSymbol(key)] = val);
														break;
													case 'String':
														snip[Tempo.getSymbol()] = new RegExp(itm.value);
														break;
													case 'RegExp':
														snip[Tempo.getSymbol()] = itm.value;
														break;
												}
											})
										break;
								}
								break;

							case 'layout':
								shape.parse["layout"] ??= {};
								const lay = shape.parse["layout"];						// reference to the layout-record

								switch (arg.type) {
									case 'Object':															// add key-value pairs to Layout
										ownEntries(arg.value as Layout)
											.forEach(([key, val]) => Object.assign(lay, { [Tempo.getSymbol(key)]: val }));
										break;

									case 'String':															// add string with unique key to Layout
										Object.assign(lay, { [Tempo.getSymbol()]: arg.value });
										break;

									case 'RegExp':															// add pattern with unique key to Layout
										Object.assign(lay, { [Tempo.getSymbol()]: arg.value.source });
										break;

									case 'Array':
										(arg.value as any[])											// could be Array of Object, String, RegExp
											.forEach(elm => {
												const itm = asType(elm);
												switch (itm.type) {
													case 'Object':
														ownEntries(itm.value as Layout)
															.forEach(([key, val]) => Object.assign(lay, { [Tempo.getSymbol(key)]: val }));
														break;
													case 'String':
														Object.assign(lay, { [Tempo.getSymbol()]: itm.value });
														break;
													case 'RegExp':
														Object.assign(lay, { [Tempo.getSymbol()]: itm.value.toString() });
														break;
												}
											})
										break;

									default:
										Tempo.#dbg.catch(shape.config, 'Unexpected type for "layout": ', arg.type);
										break;
								}
								break;

							case 'event':
							case 'period':
								shape.parse[optKey] ??= {} as any;					// ensure the parse object exists
								const rule = shape.parse[optKey];						// reference to the parse object

								asArray(arg.value as Event | Period)
									.forEach(elm => {
										ownEntries(elm)
											.forEach(([key, val]) => rule[key] = val);
									})
								break;

							case 'mdyLocales':														// stash locales that prefer 'mm-dd-yy' date order	
								shape.parse.mdyLocales = Tempo.#mdyLocales(shape, arg.value as NonNullable<Tempo.Options["mdyLocales"]>)
								break;

							case 'mdyLayouts':														// stash layout names that need to swap to 'mm-dd-yy' date order
								shape.parse.mdyLayouts = asArray(arg.value as NonNullable<Tempo.Options["mdyLayouts"]>)
								break;

							default:
								Object.assign(shape.config, { [optKey]: optVal });	// just move the option to the config
								break;
						}
					})
			})

		shape.isMonthDay = Tempo.#isMonthDay(shape);						// locale and/or timeZone or monthDay may have changed
		shape.config.sphere = Tempo.#setSphere(shape);					// setup hemisphere

		if (isDefined(shape.parse.mdyLayouts))
			Tempo.#swapLayout(shape);

		if (isDefined(shape.parse.event))
			Tempo.#makeEvent(shape);															// setup special Date {layout} (before patterns!)
		if (isDefined(shape.parse.period))
			Tempo.#makePeriod(shape);															// setup special Time {layout} (before patterns!)

		Tempo.#makePattern(shape);															// setup Regex DateTime patterns
	}

	/** setup mdy Locales */
	static #mdyLocales(shape: Internal.Shape, value: Tempo.Options["mdyLocales"]) {
		return asArray(value)
			.map(mdy => new Intl.Locale(mdy))
			.map(mdy => ({ locale: mdy.baseName, timeZones: mdy.getTimeZones() ?? [] }))
	}

	/** build RegExp patterns */
	static #makePattern(shape: Internal.Shape) {
		const snippet = (shape.config.level === 'local')
			? shape.parse.snippet
			: void 0;

		shape.parse.pattern ??= new Map();
		shape.parse.pattern.clear();														// reset {pattern} Map

		for (const [sym, layout] of ownEntries(shape.parse.layout))
			shape.parse.pattern.set(sym, Tempo.regexp(layout, snippet));
	}

	// #endregion Static private methods

	// #region Static public methods~~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * Initializes the global default configuration for all subsequent `Tempo` instances.
	 * 
	 * Settings are inherited in this priority:
	 * 1. Reasonable library defaults (defined in tempo.config.js)
	 * 2. Persistent storage (e.g. localStorage), if available.
	 * 3. `options` provided to this method.
	 * 
	 * @param options - Configuration overrides to apply globally.
	 * @returns The resolved global configuration.
	 */
	static init(options: Tempo.Options = {}) {
		if (isEmpty(options)) {																	// if no options supplied, reset all
			Tempo.#global.config = {} as Tempo.Config;						// remove previous config
			Tempo.#global.parse = {																// set parsing rules
				snippet: Snippet,
				layout: Layout,
				event: Event,
				period: Period,
				mdyLocales: Tempo.#mdyLocales(Tempo.#global, Default.mdyLocales),
				mdyLayouts: Default.mdyLayouts,
			} as Internal.Parse;																	// remove previous parsing rules

			const dateTime = Intl.DateTimeFormat().resolvedOptions();
			Object.assign(Tempo.#global.config, {									// some global locale-specific defaults
				calendar: dateTime.calendar,
				timeZone: dateTime.timeZone,
				locale: Tempo.#locale(),														// get from browser, if possible
			})

			Tempo.#setConfig(Tempo.#global,
				{ version: VERSION, store: STORAGEKEY, level: 'global' } as Tempo.Options,
				Default,																						// set Tempo defaults
				Tempo.readStore(),																	// allow for storage-values to overwrite
			)
		}
		else {
			if (options.store !== STORAGEKEY)
				Tempo.#setConfig(Tempo.#global, Tempo.readStore(options.store));	// user-defined local storage
			Tempo.#setConfig(Tempo.#global, options);							// overload with init() argument (options)
		}

		if (Context.type === CONTEXT.Browser || options.debug === true)
			Tempo.#dbg.info(Tempo.config, 'Tempo:', Tempo.#global.config);

		return Tempo.#global.config;
	}

	/**
	 * Reads `Tempo` options from persistent storage (e.g., localStorage).
	 * @returns The stored configuration or an empty object.
	 */
	static readStore(key = Tempo.#global.config.store) {
		return getStorage<Tempo.Options>(key, {});
	}

	/**
	 * Writes the provided configuration into persistent storage.
	 * @param config - The options to save.
	 */
	static writeStore(config?: Tempo.Options, key = Tempo.#global.config.store) {
		return setStorage(key, config);
	}

	/**
	 * Looks-up or registers a `Symbol` for a given key.  
	 * Used for internal consistency.  
	 * 
	 * @param key - The description for which to retrieve/create a symbol.
	 */
	static getSymbol(key?: string | symbol) {
		if (isUndefined(key)) {
			const userKeys = ownKeys(Token)
				.filter(usr => usr.startsWith('usr'))
				.map(usr => parseInt(usr.substring(3)))
				.concat(0)
			const max = `usr${Math.max(...userKeys) + 1}`;

			return key = Symbol(max);															// allocate a new 'user' key
		}

		if (isSymbol(key)) {
			const description = key.description ?? Cipher.randomKey();	// get Symbol description, else allocate random string
			if (isUndefined(Token[description]))
				Token[description] = key;														// add to Symbol register
			return key;
		}

		const [sym, description = key] = key										// for example, 'key = zdc.zodiac'
			.split(Match.separator)
			.filter(s => !isEmpty(s));

		if (isUndefined(Token[sym]))
			Token[sym] = Symbol(description);											// add to Symbol register

		return Token[sym];
	}

	static getRegExp(reg: string | RegExp, ...layouts: Internal.StringPattern[]) {
		return (isRegExp(reg))
			? reg
			: new RegExp(reg)
	}

	/**
	 * translates a {layout} string into an anchored, case-insensitive regular expression.  
	 * supports placeholder expansion using the {snippet} registry (e.g., `{yy}`, `{mm}`).
	 */
	static regexp(layout: string | RegExp, snippet?: Snippet) {
		const names = new Set<string>();												// track the regex named capture-groups

		function checker(source: string) {											// check for named capture-groups, and intercept duplicates
			return source.replace(Match.captures, (match, name) => {
				if (names.has(name)) return `(\\k<${name}>)`;				// replace with a back-reference to the {name}
				names.add(name);																		// add {name} to the set of names
				return match;
			})
		}

		function matcher(str: string | RegExp): string {
			let source = isRegExp(str) ? str.source : str;

			if (isDefined(source.match(Match.regexp)))						// string that looks like a RegExp
				source = source.substring(1, source.length - 1);		// remove the leading/trailing "/"
			if (source.startsWith('^') && source.endsWith('$'))
				source = source.substring(1, source.length - 1);		// remove the leading/trailing anchors (^ $)

			return source.replace(Match.braces, (match, name) => {// iterate over "{}" pairs in the source string
				const token = Token[name];													// get the symbol for this {name}
				const snip = snippet?.[token]?.source								// get the snippet source (custom)
					?? Snippet[token]?.source													// else get the snippet source (global)
					?? Layout[token];																	// else get the layout source

				return (isNullish(snip) || snip === match)					// if no definition found,
					? match																						// return the original match
					: matcher(snip);																	// else recurse to see if snippet contains embedded "{}" pairs
			})
		}

		layout = matcher(layout);																// initiate the layout-parse
		names.clear();																					// clear the set of names
		layout = checker(layout);																// check for named capture-groups

		return new RegExp(`^(${layout})$`, 'i');								// translate the source into a regex
	}

	/**
	 * Compares two `Tempo` instances or date-time values.  
	 * Useful for sorting or determining chronological order.  
	 * 
	 * @param tempo1 - The first value to compare.
	 * @param tempo2 - The second value to compare (defaults to 'now').
	 * @returns `-1` if `tempo1 < tempo2`, `0` if tempo1 == tempo2, `1` if `tempo1 > tempo2`.
	 * 
	 * @example
	 * ```typescript
	 * const sorted = [t1, t2].sort(Tempo.compare);
	 * ```
	 */
	static compare(tempo1?: Tempo.DateTime | Tempo.Options, tempo2?: Tempo.DateTime | Tempo.Options) {
		const one = new Tempo(tempo1), two = new Tempo(tempo2);

		return Number((one.nano > two.nano) || -(one.nano < two.nano));
	}

	/** Creates a new `Tempo` instance from a value and options. */
	static from(tempo: Tempo.DateTime, options?: Tempo.Options) { return new Tempo(tempo, options); }

	/** Returns current time as epoch nanoseconds (BigInt). */
	static now() { return Temporal.Now.instant().epochNanoseconds; }

	/** static Tempo.terms getter */
	static get terms() {
		return secure(terms
			.map(({ define, ...rest }) => rest));									// omit the 'define' method
	}

	/** static Tempo properties getter */
	static get properties() {
		return secure(getAccessors(Tempo)
			.filter(acc => getType(acc) !== 'Symbol'));						// omit any Symbol properties
	}

	/** Tempo global config settings */
	static get config() {
		return secure({ ...Tempo.#global.config });
	}

	/** Tempo initial default settings */
	static get default() {
		return secure(Default);
	}

	/** array of regex patterns used when parsing Tempo.DateTime argument */
	static get parse() {
		return secure(Tempo.#global.parse);
	}

	/** iterate over Tempo properties */
	static [Symbol.iterator]() {
		const props = Tempo.properties[Symbol.iterator]();			// static Iterator over array of 'getters'

		return {
			next: () => props.next(),
		}
	}

	// #endregion Static public methods

	// #region Instance symbols~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** allow for auto-convert of Tempo to BigInt */
	[Symbol.toPrimitive](hint?: 'string' | 'number' | 'default') {
		Tempo.#dbg.info(this.config, getType(this), '.hint: ', hint);
		return this.nano;
	}

	/** iterate over instance formats */
	[Symbol.iterator]() {
		const props = ownEntries(this.#fmt)[Symbol.iterator]();	// instance Iterator over tuple of FormatType[]

		return {
			next: () => props.next(),															// tuple of [fmtCode, value]
		}
	}

	/** release any Tempo resources */
	[Symbol.dispose]() {
		Tempo.#dbg.info('release Tempo resources');							// TODO: what do we want to do here?
	}

	get [Symbol.toStringTag]() {															// default string description
		return 'Tempo';																					// hard-coded to avoid minification mangling
	}

	// #endregion Instance symbols

	// #region Instance properties~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** constructor tempo */																	#tempo?: Tempo.DateTime;
	/** constructor options */																#options = {} as Tempo.Options;
	/** instantiation Temporal Instant */											#now: Temporal.Instant;
	/** underlying Temporal ZonedDateTime */									#zdt!: Temporal.ZonedDateTime;
	/** prebuilt formats, for convenience */									#fmt = {} as Tempo.Format;
	/** instance term plugins */															#term = {} as Property<any>;
	/** instance values to complement static values */				#local = {
		/** instance configuration */															config: {} as Tempo.Config,
		/** instance parse rules */																parse: {
		/** instance parse match result */													result: {} as Internal.Match,
		/** instance pattern */																			snippet: {} as Snippet,
		/** instance Layouts */																			layout: {} as Layout,
		/** instance Events */																			event: {} as Event,
		/** instance Periods */																			period: {} as Period,
		/** instance patterns */																		pattern: new Map() as Internal.RegexpMap,
		} as Internal.Parse
	} as Internal.Shape

	// #endregion Instance properties

	// #region Constructor~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	/**
	 * Instantiates a new `Tempo` object.
	 * 
	 * @param tempo - The date-time value to parse. Can be a string, number, BigInt, Date, or another Tempo/Temporal object.
	 * @param options - Configuration options for this specific instance.
	 */
	constructor(options?: Tempo.Options);
	constructor(tempo: Tempo.DateTime, options?: Tempo.Options);
	constructor(tempo?: Tempo.DateTime | Tempo.Options, options: Tempo.Options = {}) {
		this.#now = Temporal.Now.instant();											// stash current Instant

		[this.#tempo, this.#options] = this.#isZonedDateTimeLike(tempo)
			? [(tempo as Tempo.Options)?.value, tempo as Tempo.Options]	// swap arguments, if arg1=Options
			: [tempo, { ...options }]															// stash original values

		// parse the 'Tempo.Options' looking for overrides to Tempo.#global.config
		this.#setLocal(this.#options);

		// we now have all the info we need to instantiate a new Tempo
		try {
			this.#zdt = this.#parse(this.#tempo);									// attempt to interpret the DateTime arg

			if (['iso8601', 'gregory'].includes(this.#getConfig('calendar'))) {
				for (const [key, val] of Tempo.FORMAT)							// add all the pre-defined FORMATs to the instance
					Object.assign(this.#fmt, { [key]: this.format(val) })	// under 'Tempo.fmt' getter
			}
			secure(this.#fmt);																		// and prevent mutations

			terms																									// add the plug-in getters for the pre-defined Terms to the instance
				.forEach(({ key, scope, define }) => {							// under 'Tempo.term' getter
					if (isDefined(define)) {
						isDefined(key) && this.#setTerm(this, key, true, define);
						isDefined(scope) && this.#setTerm(this, scope, false, define);
					}
				})
		} catch (err) {
			Tempo.#dbg.catch(this.config, `Cannot create Tempo: ${(err as Error).message}\n${(err as Error).stack}`);
			return {} as Tempo;																		// return empty Object
		}
	}

	// This function has be defined within the Tempo class (and not imported from another module) because it references a private-variable
	/** this will add the self-updating {getter} on the Tempo.term object */
	#setTerm(self: Tempo, name: PropertyKey, key = true, define: (this: any, key?: boolean) => any) {
		if (isDefined(name)) {
			Object.defineProperty(self.#term, name, {
				configurable: false,
				enumerable: false,
				get: function () {
					const props = Object.getOwnPropertyDescriptors(self.#term);
					self.#term = {}																		// wipe down the 'term'
					ownEntries(props)
						.forEach(([prop, desc]) => {										// rebuild all the 'term' descriptors
							if (prop !== name)														// except the current one
								Object.defineProperty(self.#term, prop, desc);
						})

					const value = define.call(self, key);							// evaluate the term range-lookup
					Object.defineProperty(self.#term, name, {					// re-add the property as a value instead of a getter
						value,
						configurable: false,
						writable: false,
						enumerable: true,
					})
					secure(self.#term);
					return secure(value);
				}
			})
		}
	}

	// #endregion Constructor

	// #region Instance public accessors~~~~~~~~~~~~~~~~~~~~~~
	/** 4-digit year (e.g., 2024) */													get yy() { return this.#zdt.year }
	/** Month number: Jan=1, Dec=12 */												get mm() { return this.#zdt.month as Tempo.mm }
	/** ISO week number of the year */												get ww() { return this.#zdt.weekOfYear as Tempo.ww }
	/** Day of the month (1-31) */														get dd() { return this.#zdt.day }
	/** Day of the month (alias for `dd`) */									get day() { return this.#zdt.day }
	/** Hour of the day (0-23) */															get hh() { return this.#zdt.hour as Tempo.hh }
	/** Minutes of the hour (0-59) */													get mi() { return this.#zdt.minute as Tempo.mi }
	/** Seconds of the minute (0-59) */												get ss() { return this.#zdt.second as Tempo.ss }
	/** Milliseconds of the second (0-999) */									get ms() { return this.#zdt.millisecond as Tempo.ms }
	/** Microseconds of the millisecond (0-999) */						get us() { return this.#zdt.microsecond as Tempo.us }
	/** Nanoseconds of the microsecond (0-999) */							get ns() { return this.#zdt.nanosecond as Tempo.ns }
	/** Fractional seconds (e.g., 0.123456789) */							get ff() { return +(`0.${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`) }
	/** IANA Time Zone ID (e.g., 'Australia/Sydney') */				get tz() { return this.#zdt.timeZoneId }
	/** Unix timestamp (defaults to milliseconds) */					get ts() { return this.epoch[this.#getConfig('timeStamp')] }
	/** Short month name (e.g., 'Jan') */											get mmm() { return Tempo.MONTH.keyOf(this.#zdt.month as Tempo.Month) }
	/** Long month name (e.g., 'January') */									get mon() { return Tempo.MONTHS.keyOf(this.#zdt.month as Tempo.Month) }
	/** Short weekday name (e.g., 'Mon') */										get www() { return Tempo.WEEKDAY.keyOf(this.#zdt.dayOfWeek as Tempo.Weekday) }
	/** Long weekday name (e.g., 'Monday') */									get wkd() { return Tempo.WEEKDAYS.keyOf(this.#zdt.dayOfWeek as Tempo.Weekday) }
	/** ISO weekday number: Mon=1, Sun=7 */										get dow() { return this.#zdt.dayOfWeek as Tempo.Weekday }
	/** Nanoseconds since Unix epoch (BigInt) */							get nano() { return this.#zdt.epochNanoseconds }
	/** Instance-specific configuration settings */						get config() { return secure({ ...this.#local.config }) }
	/** Instance-specific parse rules */											get parse() { return secure({ ...this.#local.parse }) }
	/** Object containing results from all term plugins */		get term() { return this.#term }
	/** Formatted results for all pre-defined format codes */	get fmt() { return secure({ ...this.#fmt }) }
	/** units since epoch */																	get epoch() {
		return secure({
			/** seconds since epoch */														ss: Math.trunc(this.#zdt.epochMilliseconds / 1000),
			/** milliseconds since epoch */												ms: this.#zdt.epochMilliseconds,
			/** microseconds since epoch */												us: Number(this.#zdt.epochNanoseconds / BigInt(1000)),
			/** nanoseconds since epoch */												ns: this.#zdt.epochNanoseconds,
		})
	}
	// #endregion Instance public accessors

	// #region Instance public methods~~~~~~~~~~~~~~~~~~~~~~~~
	/** time duration until (with options) */									until(opts?: Tempo.Options): Tempo.Duration;
	/** time duration until (with date-time and options) */		until(dateTime: Tempo.DateTime, opts?: Tempo.Options): Tempo.Duration;
	/** time duration until (with date-time and unit) */			until(dateTime: Tempo.DateTime, until: Tempo.Until): number;
	/** time duration until (with unit and options) */				until(until: Tempo.Until, opts?: Tempo.Options): number;
	/** time duration until (with options and unit) */				until(opts: Tempo.Options, until: Tempo.Until): number;
	/** time duration until another date-time */							until(until?: Tempo.DateTime | Tempo.Until, opts?: Tempo.Options | Tempo.Until) { return this.#until(until, opts) }

	/** time elapsed since (with options) */									since(opts?: Tempo.Options): string;
	/** time elapsed since (with date-time and options) */		since(dateTime: Tempo.DateTime, opts?: Tempo.Options): string;
	/** time elapsed since (with date-time and unit) */				since(dateTime: Tempo.DateTime, until: Tempo.Until): string;
	/** time elapsed since (with unit and options) */					since(until: Tempo.Until, opts?: Tempo.Options): string;
	/** time elapsed since (with options and unit) */					since(opts: Tempo.Options, until: Tempo.Until): string;
	/** time elapsed since another date-time */								since(since?: Tempo.DateTime | Tempo.Until, opts?: Tempo.Options | Tempo.Until) { return this.#since(since, opts) }

	/** applies a format to the current `Tempo` instance. */	format<K extends Tempo.Formats>(fmt: K) { return this.#format(fmt) }
	/** returns a new `Tempo` with specific duration added. */add(mutate: Tempo.Add) { return this.#add(mutate) }
	/** returns a new `Tempo` with specific offsets. */				set(offset: Tempo.Set | Tempo.Add) { return this.#set(offset) }

	/** `true` if the underlying date-time is valid. */				isValid() { return !isEmpty(this) }
	/** the underlying `Temporal.ZonedDateTime` object. */		toDateTime() { return this.#zdt }
	/** the date-time as a `Temporal.Instant`. */							toInstant() { return this.#zdt.toInstant() }
	/** the date-time as a standard `Date` object. */					toDate() { return new Date(this.#zdt.round({ smallestUnit: 'millisecond' }).epochMilliseconds) }
	/** the ISO8601 string representation of the date-time. */toString() { return this.#zdt.toString() }
	/** Custom JSON serialization for `JSON.stringify`. */		toJSON() { return { ...this.#local.config, value: this.toString() } }

	// #endregion Instance public methods


	// #region Instance private methods~~~~~~~~~~~~~~~~~~~~~~~
	/**
	 * setup local Shape instance, which will contain all the configuration and state for this instance.  
	 * we copy down the current global config to the local instance, then apply any options provided.  
	 * in this way, we preserve immutability of this instance, in case the user later changes the global config.
	 */
	#setLocal(options: Tempo.Options) {
		// copy down current global config to local instance
		const { mdyLocales, mdyLayouts, ...config } = Tempo.#global.config as Tempo.Options;
		Object.assign(this.#local.config, config, { level: 'local' });

		Tempo.#setConfig(this.#local, options);									// set #local config

		/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
		// if a timeZone provided but no hemisphere, try to infer hemisphere based on daylight-savings  
		if (options.timeZone !== Tempo.#global.config.timeZone && isUndefined(options.sphere))
			Tempo.#setSphere(this.#local);

		// // change of Locale, swap 'dmy' pattern with 'mdy' parse-order?
		// if (this.#local.config.locale !== Tempo.#global.config.locale) {
		// 	const locale = Tempo.#swapLayout(this.#local);

		// if (isEmpty(this.#local.config.locale))
		// 	this.#local.config.locale = locale || Tempo.#global.config.locale;
		// this.#local.config.locale = Tempo.#locale(this.#local.config.locale);
		// }

		// // user-specified time-periods to use when parsing this instance
		// if (isDefined(this.#options.period))
		// 	Tempo.#makePeriod(this.#local);												// set instance 'per' and 'tm' {patterns}

		// // user-specified date-events to use when parsing this instance
		// if (isDefined(this.#options.event))
		// 	Tempo.#makeEvent(this.#local);												// set instance 'evt' and 'dt' {patterns}

		// user-specified patterns to use when parsing this instance
		// if (isDefined(this.#options.layout))
		// 	Tempo.#makePattern(this.#local);											// set instance {patterns}
	}

	/**
	 * get config value from local else global config  
	 * in the unlikely event that global config has an option added that was not present when this instance was created
	 */
	#getConfig<K extends keyof Tempo.Config>(key: K): Tempo.Config[K] {
		return this.#local.config[key] ?? Tempo.#global.config[key];
	}

	/** parse DateTime input */
	#parse(tempo?: Tempo.DateTime, dateTime?: Temporal.ZonedDateTime) {
		const timeZone = this.#getConfig('timeZone');
		const calendar = this.#getConfig('calendar');
		const today = dateTime ?? this.#now											// cast instantiation to current timeZone
			.toZonedDateTimeISO(timeZone);
		const arg = this.#conform(tempo, today);								// if String or Number, conform the input against known patterns

		Tempo.#dbg.info(this.#local.config, 'parse', `{type: ${arg.type}, value: ${arg.value}}`);					// show what we're parsing

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
				} catch {
					this.#local.parse.result = { match: 'Date.parse', value: arg.value, type: arg.type }																					// fallback to browser's Date.parse() method
					Tempo.#dbg.warn(this.#local.config, 'Cannot detect DateTime; fallback to Date.parse');
					return Temporal.ZonedDateTime
						.from(`${new Date(arg.value.toString()).toISOString()}[${timeZone}]`)
						.withCalendar(calendar)
				}

			case 'Temporal.PlainDate':
			case 'Temporal.PlainDateTime':
				return arg.value
					.toZonedDateTime(timeZone)
					.withCalendar(calendar);

			case 'Temporal.PlainTime':
				return today.withPlainTime(arg.value);

			case 'Temporal.PlainYearMonth':												// assume current day, else end-of-month
				return arg.value
					.toPlainDate({ day: Math.min(today.day, arg.value.daysInMonth) })
					.toZonedDateTime(timeZone)
					.withCalendar(calendar)

			case 'Temporal.PlainMonthDay':												// assume current year
				return arg.value
					.toPlainDate({ year: today.year })
					.toZonedDateTime(timeZone)
					.withCalendar(calendar)

			case 'Temporal.Instant':
				return arg.value
					.toZonedDateTimeISO(timeZone)
					.withCalendar(calendar)

			case 'Tempo':
				return arg.value
					.toDateTime();																		// clone current Tempo

			case 'Date':
				return new Temporal.ZonedDateTime(BigInt(arg.value.getTime() * 1_000_000), timeZone, calendar);

			case 'Number':																				// Number which didn't conform to a Tempo.pattern
				const [seconds = BigInt(0), suffix = BigInt(0)] = arg.value.toString().split('.').map(BigInt);
				const nano = BigInt(suffix.toString().substring(0, 9).padEnd(9, '0'));

				return new Temporal.ZonedDateTime(seconds * BigInt(1_000_000_000) + nano, timeZone, calendar);

			case 'BigInt':																				// BigInt is not conformed against a Tempo.pattern
				return new Temporal.ZonedDateTime(arg.value, timeZone, calendar);

			default:
				Tempo.#dbg.catch(this.#local.config, `Unexpected Tempo parameter type: ${arg.type}, ${String(arg.value)}`);
				return today;
		}
	}

	/** check if we've been given a ZonedDateTimeLike object */
	#isZonedDateTimeLike(tempo: Tempo.DateTime | undefined): tempo is Temporal.ZonedDateTimeLike & { value?: any } {
		if (!isObject(tempo) || isEmpty(tempo))
			return false;

		// we include {value} to allow for Tempo instances
		return ownKeys(tempo)
			.every(key => ['value', 'year', 'month', 'monthCode', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'timeZone', 'calendar'].includes(key))							// if every key in tempo-object is included in this array
	}

	/** evaluate 'string | number' input against known patterns */
	#conform(tempo: Tempo.DateTime | undefined, dateTime: Temporal.ZonedDateTime) {
		const arg = asType(tempo);
		this.#local.parse.result = { ...arg };									// for debugging

		if (this.#isZonedDateTimeLike(tempo)) {									// tempo is ZonedDateTime-ish object (throw away 'value' property)
			const { timeZone, calendar, value, ...options } = tempo;
			let zdt = !isEmpty(options)
				? dateTime.with({ ...options })
				: dateTime;

			if (timeZone)
				zdt = zdt.withTimeZone(timeZone);										// optionally set timeZone
			if (calendar)
				zdt = zdt.withCalendar(calendar);										// optionally set calendar

			this.#local.parse.result.match = 'Temporal.ZonedDateTimeLike';

			return Object.assign(arg, {
				type: 'Temporal.ZonedDateTime',											// override {arg.type}
				value: zdt,
			})
		}

		if (!isType<string | number>(arg.value, 'String', 'Number'))
			return arg;																						// only conform String or Number (not BigInt, etc) against known patterns

		const value = trimAll(arg.value, /\(|\)/g);							// cast as String, remove \( \) and control-characters

		if (isString(arg.value)) {															// if original value is String
			if (isEmpty(value)) {																	// don't conform empty string
				this.#local.parse.result.match = 'Empty';						// matched an empty-String
				return Object.assign(arg, { type: 'Empty' });
			}
			if (value.match(Match.bigint)) {											// if string representation of BigInt literal
				this.#local.parse.result.match = 'BigInt';					// matched a bigint-String
				return Object.assign(arg, { type: 'BigInt', value: asInteger(value) });
			}
		} else {																								// else it is a Number
			if (value.length <= 7) {         											// cannot reliably interpret small numbers:  might be {ss} or {yymmdd} or {dmmyyyy}
				Tempo.#dbg.catch(this.#local.config, 'Cannot safely interpret number with less than 8-digits: use string instead');
				return arg;
			}
		}

		if (isUndefined(this.#zdt))															// if first pass
			dateTime = dateTime.withPlainTime('00:00:00');				// strip out all time-components

		const map = new Map([...this.#local.parse.pattern, ...Tempo.#global.parse.pattern]);
		for (const [sym, pat] of map) {
			const groups = this.#parseMatch(pat, value);					// determine pattern-match groups
			if (isEmpty(groups))
				continue;																						// no match, so skip this iteration

			Object.assign(this.#local.parse.result, { match: sym.description, groups: cleanify(groups) });// stash the {key} of the pattern that was matched								
			this.#parseGroups(groups);														// mutate the {groups} object
			dateTime = this.#parseWeekday(groups, dateTime);			// if {weekDay} pattern, calculate a calendar value
			dateTime = this.#parseDate(groups, dateTime);					// if {calendar}|{event} pattern, translate to date value
			dateTime = this.#parseTime(groups, dateTime);					// if {clock}|{period} pattern, translate to a time value

			/**
			 * finished analyzing a matched pattern.  
			 * rebuild {arg.value} into a ZonedDateTime
			 */
			Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime });

			Tempo.#dbg.info(this.#local.config, 'groups', groups);						// show the resolved date-time elements
			Tempo.#dbg.info(this.#local.config, 'pattern', sym.description);	// show the pattern that was matched

			break;																								// stop checking patterns
		}

		return arg;
	}

	/** apply a regex-match against a value, and clean the result */
	#parseMatch(pat: RegExp, value: string | number) {
		const groups = value.toString().match(pat)?.groups || {};

		ownEntries(groups)																			// remove undefined, NaN, null and empty values
			.forEach(([key, val]) => isEmpty(val) && delete groups[key]);

		return groups;
	}

	/**
	 * resolve any {event} | {period} to their date | time values  
	 * intercept any {month} string  
	 * set default {cnt} if {mod} present  
	 * Note:  this will mutate the {groups} object
	*/
	#parseGroups(groups: Internal.StringRecord) {
		// fix {event}
		const event = ownKeys(groups).find(key => key.match(Match.event));
		if (event) {
			const idx = +event[4];																// number index of the {event}
			const src = event.startsWith('g') ? Tempo.#global.parse.event : this.#local.parse.event;
			const [_key, evt] = ownEntries(src)[idx];							// fetch the indexed tuple's value
			Object.assign(groups, this.#parseEvent(evt));					// determine the date-values for the {event}
			delete groups[event];

			const { yy, mm, dd } = groups as Internal.GroupDate;
			if (isEmpty(yy) && isEmpty(mm) && isEmpty(dd))
				return Tempo.#dbg.catch(this.#local.config, `Cannot determine a {date} or {event} from "${evt}"`);
		}

		// fix {period}
		const period = ownKeys(groups).find(key => key.match(Match.period));
		if (period) {
			const idx = +period[4];																// number index of the {period}
			const src = period.startsWith('g') ? Tempo.#global.parse.period : this.#local.parse.period;
			const [_key, per] = ownEntries(src)[idx];							// fetch the indexed tuple's value

			Object.assign(groups, this.#parsePeriod(per));				// determine the time-values for the {period}
			delete groups[period];

			if (isEmpty(groups["hh"]))														// must have at-least {hh} time-component
				return Tempo.#dbg.catch(this.#local.config, `Cannot determine a {time} or {period} from "${per}"`);
		}

		// fix {mm}
		if (isDefined(groups["mm"]) && !isNumeric(groups["mm"])) {
			const mm = Tempo.#prefix(groups["mm"] as Tempo.MONTH);// conform month-name

			groups["mm"] = Tempo.MONTH.keys()
				.findIndex(el => el === mm)													// resolve month-name into a month-number
				.toString()																					// (some browsers do not allow month-names when parsing a Date)
				.padStart(2, '0')
		}

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
	#parseModifier({ mod, adjust, offset, period }: Internal.GroupModifier) {
		adjust = Math.abs(adjust);
		switch (mod) {
			case void 0:																					// no adjustment
			case '=':
			case 'this':																					// current period
				return 0
			case '+':																							// next period
			case 'next':
				return adjust;
			case '-':																							// previous period
			case 'prev':
			case 'last':
				return -adjust;
			case '<':																							// period before base-date
			case 'ago':
				return (period <= offset)
					? -adjust
					: -(adjust - 1)
			case '<=':																						// period before or including base-date
				return (period < offset)
					? -adjust
					: -(adjust - 1)
			case '>':																							// period after base-date
			case 'hence':
				return (period > offset)
					? adjust
					: (adjust - 1)
			case '>=':																						// period after or including base-date
			case '+=':
				return (period >= offset)
					? adjust
					: (adjust - 1)
			default:																							// unexpected modifier
				return 0;
		}
	}

	/**
	 * if named-group 'wkd' detected (with optional 'mod', 'cnt', or time-units), then calc relative weekday offset  
	 * | Example | Result | Note |
	 * | :--- | :---- | :---- |
	 * | `Wed` | Wed this week | might be earlier or later or equal to current day |
	 * | `-Wed` | Wed last week | same as new Tempo('Wed').add({ weeks: -1 }) |
	 * | `+Wed` | Wed next week | same as new Tempo('Wed').add({ weeks:  1 }) |
	 * | `-3Wed` | Wed three weeks ago | same as new Tempo('Wed').add({ weeks: -3 }) |
	 * | `<Wed` | Wed prior to today | might be current or previous week |
	 * | `<=Wed` | Wed prior to tomorrow | might be current or previous week |
	 * | `Wed noon` | Wed this week at 12:00pm | even though time-periods may be present, ignore them in this method |
	 * 
	 * @returns  ZonedDateTime with computed date-offset  
	 */
	#parseWeekday(groups: Internal.StringRecord, dateTime: Temporal.ZonedDateTime) {
		const { wkd, mod, cnt = '1', sfx, ...rest } = groups as Internal.GroupWkd;
		if (isUndefined(wkd))																		// this is not a true {weekDay} pattern match
			return dateTime;

		/**
		 * the {weekDay} pattern should only have keys of {wkd}, {mod}, {cnt}, {sfx} (and optionally time-units)  
		 * for example: {wkd: 'Wed', mod: '>', hh: '10', mer: 'pm'}  
		 * we early-exit if we find anything other than time-units  
		*/
		const time = ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'] as const;
		if (!ownKeys(rest)
			.every(key => time.includes(key)))										// non 'time-unit' keys detected
			return dateTime;																			// this is not a true {weekDay} pattern, so early-exit

		if (!isEmpty(mod) && !isEmpty(sfx)) {
			Tempo.#dbg.warn(`Cannot provide both a modifier '${mod}' and suffix '${sfx}'`);
			return dateTime;																			// cannot provide both 'modifier' and 'suffix'
		}

		const weekday = Tempo.#prefix(wkd);											// conform weekday-name
		const adjust = +cnt;																		// how many weeks to adjust
		const offset = Tempo.WEEKDAY.keys()											// how far weekday is from today
			.findIndex(el => el === weekday);

		const days = offset - dateTime.dayOfWeek								// number of days to offset from dateTime
			+ (this.#parseModifier({ mod: mod ?? sfx, adjust, offset, period: dateTime.dayOfWeek }) * dateTime.daysInWeek);
		delete groups["wkd"];
		delete groups["mod"];
		delete groups["cnt"];
		delete groups["sfx"];

		return dateTime
			.add({ days });																				// set new {day}
	}

	/**
	 * match input against date patterns  
	 * @returns adjusted ZonedDateTime with resolved time-components  
	 */
	#parseDate(groups: Internal.StringRecord, dateTime: Temporal.ZonedDateTime) {
		const { mod, cnt = '1', sfx, yy, mm, dd } = groups as Internal.GroupDate;
		if (isEmpty(yy) && isEmpty(mm) && isEmpty(dd))
			return dateTime;																			// return default

		if (!isEmpty(mod) && !isEmpty(sfx)) {
			Tempo.#dbg.warn(`Cannot provide both a modifier '${mod}' and suffix '${sfx}'`);
			return dateTime;
		}

		const date = Object.assign(this.#num({									// set defaults to use if {groups} does not contain all date-components
			yy: yy ?? dateTime.year,															// supplied year, else current year
			mm: mm ?? dateTime.month,															// supplied month, else current month
			dd: dd ?? dateTime.day,																// supplied day, else current day
		})) as { yy: number, mm: number, dd: number };

		/**
		 * change two-digit year into four-digits using 'pivot-year' (defaulted to '75' years) to determine century  
		 * pivot		= (currYear - Tempo.pivot) % 100						// for example: Rem((2024 - 75) / 100) => 49
		 * century	= Int(currYear / 100)												// for example: Int(2024 / 100) => 20
		 * 22				=> 2022																			// 22 is less than pivot, so use {century}
		 * 57				=> 1957																			// 57 is more than pivot, so use {century - 1}
		 */
		if (date.yy.toString().match(Match.twoDigit)) {					// if {yy} match just-two digits
			const pivot = dateTime
				.subtract({ years: this.#getConfig('pivot') })			// pivot cutoff to determine century
				.year % 100																					// remainder 
			const century = Math.trunc(dateTime.year / 100);			// current century
			date.yy += (century - Number(date.yy >= pivot)) * 100;
		}

		// adjust the {year} if a Modifier is present
		const adjust = +cnt;																		// how many years to adjust
		const offset = Number(pad(date.mm) + '.' + pad(date.dd));// the event month.day
		const period = Number(pad(dateTime.month) + '.' + pad(dateTime.day + 1));

		date.yy += this.#parseModifier({ mod: mod ?? sfx, adjust, offset, period });
		Object.assign(groups, date);

		delete groups["mod"];
		delete groups["cnt"];
		delete groups["sfx"];

		// all date-components are now set; check for overflow in case past end-of-month
		return Temporal.PlainDate.from({ year: date.yy, month: date.mm, day: date.dd }, { overflow: 'constrain' })
			.toZonedDateTime(dateTime.timeZoneId)									// adjust to constrained date
			.withPlainTime(dateTime.toPlainTime());								// restore the time
	}

	/**
	 * match input against 'tm' pattern.  
	 * {groups} is expected to contain time-components (like {hh:'3', mi:'30', mer:'pm'}).  
	 * returns an adjusted ZonedDateTime  
	 */
	#parseTime(groups: Internal.StringRecord = {}, dateTime: Temporal.ZonedDateTime) {
		if (isUndefined(groups["hh"]))													// must contain 'time' with at least {hh}
			return dateTime;

		let { hh = 0, mi = 0, ss = 0, ms = 0, us = 0, ns = 0 } = this.#num(groups);
		if (hh >= 24) {
			dateTime = dateTime.add({ days: Math.trunc(hh / 24) })// move the date forward number of days to offset								
			hh %= 24;																							// midnight is '00:00' on the next-day
		}

		if (isDefined(groups["ff"])) {													// {ff} is fractional seconds and overrides {ms|us|ns}
			const ff = groups["ff"].substring(0, 9).padEnd(9, '0');
			ms = +ff.substring(0, 3);
			us = +ff.substring(3, 6);
			ns = +ff.substring(6, 9);
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
		const groups: Internal.StringRecord = {};
		const pats = this.#local.isMonthDay											// first find out if we have a US-format timeZone
			? ['mdy', 'dmy', 'ymd'] as const											// try {mdy} before {dmy} if US-format
			: ['dmy', 'mdy', 'ymd'] as const											// else try {dmy} before {mdy}

		pats.find(pat => {
			const reg = this.#local.parse.pattern?.get(Tempo.getSymbol(pat))
				?? Tempo.#global.parse.pattern.get(Tempo.getSymbol(pat));// get the RegExp for the date-pattern

			if (isUndefined(reg)) {
				Tempo.#dbg.catch(this.#local.config, `Cannot find pattern: "${pat}"`);
			} else {
				Object.assign(groups, this.#parseMatch(reg, evt));
			}

			return !isEmpty(groups);															// return on the first matched pattern
		})

		return groups;																					// overlay the match date-components
	}

	/** look for a match with standard {clock} or {period} patterns */
	#parsePeriod(per: string) {
		const groups: Internal.StringRecord = {};
		const tm = this.#local.parse.pattern?.get(Tempo.getSymbol('tm'))
			?? Tempo.#global.parse.pattern.get(Tempo.getSymbol('tm'));	// get the RegExp for the time-pattern

		if (isUndefined(tm)) {
			Tempo.#dbg.catch(this.#local.config, `Cannot find pattern "tm"`);
			return;
		}

		Object.assign(groups, this.#parseMatch(tm, per));

		return groups;
	}

	/** return a new object, with only numeric values */
	#num = (groups: Record<string, string | number>) => {
		return ownEntries(groups)
			.reduce((acc, [key, val]) => {
				if (isNumeric(val))
					acc[key] = ifNumeric(val) as number;
				return acc;
			}, {} as Record<string, number>)
	}

	/** create new Tempo with {offset} property */
	#add = (arg: Tempo.Add) => {
		const mutate = 'add';
		const zdt = ownEntries(arg)															// loop through each mutation
			.reduce((zdt, [unit, offset]) => {											// apply each mutation to preceding one
				const single = singular(unit);
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
						Tempo.#dbg.catch(this.#local.config, `Unexpected method(${mutate}), unit(${unit}) and offset(${offset})`);
						return zdt;
				}

			}, this.#zdt)

		return new Tempo(zdt, this.#options);
	}

	/** create a new Tempo with {adjust} property */
	#set = (args: (Tempo.Add | Tempo.Set)) => {
		const zdt = ownEntries(args)														// loop through each mutation
			.reduce((zdt, [key, adjust]) => {											// apply each mutation to preceding one
				const { mutate, offset, single } = ((key) => {
					switch (key) {
						case 'start':
						case 'mid':
						case 'end':
							return { mutate: key, offset: 0, single: singular(adjust.toString()) }

						default:
							return { mutate: 'set', offset: adjust, single: singular(key) }
					}
				})(key);																						// IIFE to analyze arguments

				switch (`${mutate}.${single}`) {
					case 'set.period':
					case 'set.time':
					case 'set.date':
					case 'set.event':
					case 'set.dow':																		// set day-of-week by number
					case 'set.wkd':																		// set day-of-week by name
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
						const value = Tempo.ELEMENT[single as Tempo.Element];
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
							.round({ smallestUnit: offset as 'hour' | 'minute' | 'second', roundingMode: 'trunc' });

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
							.round({ smallestUnit: offset as 'day' | 'hour' | 'minute' | 'second', roundingMode: 'ceil' })
							.subtract({ nanoseconds: 1 });

					default:
						Tempo.#dbg.catch(this.#local.config, `Unexpected method(${mutate}), unit(${adjust}) and offset(${single})`);
						return zdt;
				}
			}, this.#zdt)																					// start reduce with the Tempo zonedDateTime

		return new Tempo(zdt, this.#options);
	}

	#format = <K extends Tempo.Formats>(fmt: K): Tempo.Format[K] => {
		if (isNull(this.#tempo))
			return void 0 as unknown as string;										// don't format <null> dates

		switch (true) {
			case fmt === Tempo.FORMAT.yearWeek:
				const offset = this.ww === 1 && this.mm === Tempo.MONTH.Dec;			// if late-Dec, add 1 to yy
				return +`${this.yy + +offset}${pad(this.ww)}`;

			case fmt === Tempo.FORMAT.yearMonth:
				return +`${this.yy}${pad(this.mm)}`;

			case fmt === Tempo.FORMAT.yearMonthDay:
				return +`${this.yy}${pad(this.mm)}${pad(this.dd)}`;

			default:
				const str = asString(fmt);
				const mer = str.includes('HH')											// if 'twelve-hour' (uppercase 'HH') is present in fmtString,
					? this.hh >= 12 ? 'pm' : 'am'											// 	then noon or later is considered 'pm'
					: ''																							//	else no meridiem am/pm suffix needed

				return str
					.replace(/:m{2}/gi, ':mi')												// special: intercept ':mm' which should properly be ':mi'
					.replace(/m{2}:/gi, 'mi:')
					.replace(Match.hhmiss, (match: string) => {				// if 'hhmiss' or 'hhmi' (without separators)
						let res = '';
						res += pad(this.hh);
						res += pad(this.mi);
						res += pad(this.ss);
						return res;
					})
					.replace(/y{4}/g, pad(this.yy))
					// .replace(/y{2}/g, pad(this.yy).substring(2, 4))
					.replace(/y{2}/g, pad(this.yy))										// Note: always four-digit year
					.replace(/m{3}/gi, this.mmm)
					.replace(/m{2}/g, pad(this.mm))
					.replace(/d{3}/gi, this.www)
					.replace(/w{3}/gi, this.www)
					.replace(/d{2}/g, pad(this.dd))
					.replace(/h{2}/g, pad(this.hh))
					.replace(/H{2}$/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh) + mer)
					.replace(/H{2}/g, pad(this.hh >= 13 ? this.hh % 12 : this.hh))
					.replace(/:mi$/gi, ':' + pad(this.mi) + mer)			// append 'am' if ':mi' at end of fmtString and it follows 'HH'
					.replace(/:mi/gi, ':' + pad(this.mi))
					.replace(/^mi/i, pad(this.mi))
					.replace(/:s{2}$/gi, ':' + pad(this.ss) + mer)		// append 'am' if ':ss' at end of fmtString and it follows 'HH'
					.replace(/:s{2}/gi, ':' + pad(this.ss))
					.replace(/^ss/i, pad(this.ss))
					.replace(/ts/g, this.ts.toString())
					.replace(/ms/g, pad(this.ms, 3))
					.replace(/us/g, pad(this.us, 3))
					.replace(/ns/g, pad(this.ns, 3))
					.replace(/f{2}/g, `${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`)
					.replace(/w{2}/g, pad(this.ww))
					.replace(/mon/g, this.mon)
					.replace(/wkd/g, this.wkd)
					.replace(/day/g, this.day.toString())
					.replace(/dow/g, this.dow.toString())
		}
	}

	/** calculate the difference between two Tempos  
	 * (past is positive, future is negative)  
	 * 'since' is a hidden argument used only when invoking #until() via #since()
	 */
	#until(arg?: Tempo.DateTime | Tempo.Until, until = {} as Tempo.Options | Tempo.Until, since = false) {
		let value: Tempo.DateTime, opts: Tempo.Options = {}, unit: Tempo.Unit | undefined = void 0;
		switch (true) {
			case isString(arg) && Tempo.ELEMENT.includes(singular(arg)):
				unit = arg as Tempo.Unit;														// e.g. tempo.until('hours')
				({ value, ...opts } = until as Tempo.Options);
				break;
			case isString(arg):																		// assume 'arg' is a dateTime string
				value = arg;																				// e.g. tempo.until('20-May-1957', {unit: 'years'})
				({ unit, ...opts } = until as Exclude<Tempo.Until, Tempo.Unit>)
				break;
			case isObject(arg) && isString(until):								// assume 'until' is a Unit
				unit = until;																				// e.g. tempo.until({value:'20-May-1957}, 'years'})
				({ value, ...opts } = arg as Tempo.Options);
				break;
			case isObject(arg) && isObject(until):								// assume combination of Tempo.Options and Tempo.Until
				({ value, unit, ...opts } = Object.assign({}, arg, until) as Exclude<Tempo.Until, Tempo.Unit>);
				break;
			case isString(until):
				unit = until;
				value = arg;
				break;
			case isObject(until):
				unit = (until as Exclude<Tempo.Until, Tempo.Unit>).unit;
				value = arg;
				break;
			default:
				value = arg;																				// assume 'arg' is a DateTime
		}

		const offset = new Tempo(value, opts);
		const duration = this.#zdt.until(offset.#zdt, { largestUnit: unit ?? 'years' });

		if (isDefined(unit))
			unit = `${singular(unit)}s` as Tempo.Unit;						// coerce to plural

		if (isUndefined(unit) || since) {												// if no 'unit' provided, or if called via #since()
			return getAccessors(duration)
				.reduce((acc, dur) => Object.assign(acc, { [dur]: duration[dur as keyof Temporal.Duration] }),
					ifDefined({ iso: duration.toString(), unit } as Tempo.Duration))
		}

		return duration.total({ relativeTo: this.#zdt, unit });	// sum-up the duration components
	}

	/** format the elapsed time between two Tempos (to nanosecond) */
	#since(arg?: Tempo.DateTime | Tempo.Until, until = {} as Tempo.Options | Tempo.Until) {
		const dur = this.#until(arg, until, true) as Tempo.Duration;	// get a Tempo.Duration object
		const date = [dur.years, dur.months, dur.days];
		const time = [dur.hours, dur.minutes, dur.seconds];
		const fraction = [dur.milliseconds, dur.microseconds, dur.nanoseconds];

		const rtf = new Intl.RelativeTimeFormat(this.#getConfig('locale'), { style: 'narrow' });

		switch (dur.unit) {
			case void 0:
				return `${date.join('.')}T${time.join(':')}.${fraction}`;
			case 'years':
				return rtf.format(date[0], 'years');
			case 'months':
				return rtf.format(date[1], 'months');
			case 'weeks':
				return rtf.format(date[1], 'weeks')
			case 'days':
				return rtf.format(date[2], 'days');

			case 'hours':
				return rtf.format(time[0], 'hours');
			case 'minutes':
				return rtf.format(time[1], 'minutes');
			case 'seconds':
				return rtf.format(time[2], 'seconds');

			case 'milliseconds':
			case 'microseconds':
			case 'nanoseconds':
				return `${fraction}`;

			default:
				return dur.iso;
		}
	}
	// #endregion Instance private methods
}

// #region Tempo types / interfaces / enums ~~~~~~~~~~~~~~~~
export namespace Tempo {
	/** the value that Tempo will attempt to interpret as a valid ISO date / time */
	export type DateTime = string | number | bigint | Date | Tempo | typeof Temporal | Temporal.ZonedDateTimeLike | undefined | null
	/** the Options object found in a json-file, or passed to a call to Tempo.Init({}) or 'new Tempo({}) */
	export type Options = Partial<{														// allowable settings to override configuration
		/** localStorage key */																	store: string;
		/** additional console.log for tracking */							debug: boolean | undefined;
		/** catch or throw Errors */														catch: boolean | undefined;
		/** Temporal timeZone */																timeZone: string;
		/** Temporal calendar */																calendar: string;
		/** locale (e.g. en-AU) */															locale: string;
		/** pivot year for two-digit years */										pivot: number;
		/** hemisphere for term[@@qtr] or term[@@szn] */				sphere: Tempo.COMPASS;
		/** granularity of timestamps (ms | ns) */							timeStamp: Tempo.TimeStamp;
		/** locale-names that prefer 'mm-dd-yy' date order */		mdyLocales: string | string[];
		/** swap parse-order of layouts */											mdyLayouts: Internal.StringTuple[];
		/** date-time snippets to help compose a Layout */			snippet: Snippet;
		/** patterns to help parse value */											layout: Layout;
		/** custom date aliases (events). */										event: Event;
		/** custom time aliases (periods). */										period: Period;
		/** supplied value to parse */													value: Tempo.DateTime;
		/** semantic version */																	version: string;
	}>

	/** drop the setup-only Options */
	type OptionsKeep = Omit<Options, "value" | "mdyLocales" | "mdyLayouts">
	/**
	 * the Config that Tempo will use to interpret a Tempo.DateTime  
	 * derived from user-supplied options, else json-stored options, else reasonable-default options
	 */
	export interface Config extends Required<OptionsKeep> {
		/** semantic version */																	version: string;
		/** configuration (global | local) */										level: 'global' | 'local',
		/** locales that prefer 'mm-dd-yy' date order */				monthDay: { locale: string; timeZones: string[]; }[];
	}

	/** Timestamp precision */
	export type TimeStamp = 'ss' | 'ms' | 'us' | 'ns'

	/** Configuration to use for #until() and #since() argument */
	export type Unit = Temporal.DateTimeUnit | keyof { [K in Temporal.DateTimeUnit as `${K}s`]: K }
	export type Until = (Tempo.Options & { unit: Tempo.Unit }) | Tempo.Unit
	export type Mutate = 'start' | 'mid' | 'end'
	export type Set = Partial<Record<Tempo.Mutate, Tempo.Unit> &
		Record<'date' | 'time' | 'event' | 'period', string>>
	export type Add = Partial<Record<Tempo.Unit, number>>

	/** pre-configured format strings */
	export interface Format {
		/** www, dd mmm yyyy */[Tempo.FORMAT.display]: string;
		/** www, dd mmm yyyy */display: string;
		/** www, yyyy-mmm-dd */[Tempo.FORMAT.wkdDate]: string;
		/** www, yyyy-mmm-dd */wkdDate: string;
		/** www, yyyy-mmm-dd hh:mi.ss */[Tempo.FORMAT.wkdTime]: string;
		/** www, yyyy-mmm-dd hh:mi.ss */wkdTime: string;
		/** www, yyyy-mmm-dd hh:mi:ss.ff */[Tempo.FORMAT.wkdStamp]: string;
		/** www, yyyy-mmm-dd hh:mi:ss.ff */wkdStamp: string;
		/** dd-mmm */[Tempo.FORMAT.dayMonth]: string;
		/** dd-mmm */dayMonth: string;
		/** dd-mmm-yyyy */[Tempo.FORMAT.dayDate]: string;
		/** dd-mmm-yyyy */dayDate: string;
		/** dd-mmm-yyyy hh:mi:ss */[Tempo.FORMAT.dayTime]: string;
		/** dd-mmm-yyyy hh:mi:ss */dayTime: string;
		/** yyyymmdd.hhmiss.ff */[Tempo.FORMAT.logStamp]: string;
		/** yyyymmdd.hhmiss.ff */logStamp: string;
		/** yyyy-mm-dd hh:mi:ss */[Tempo.FORMAT.sortTime]: string;
		/** yyyy-mm-dd hh:mi:ss */sortTime: string;
		/** yyyyww */[Tempo.FORMAT.yearWeek]: number;
		/** yyyyww */yearWeek: number;
		/** yyyymm */[Tempo.FORMAT.yearMonth]: number;
		/** yyyymm */yearMonth: number;
		/** yyyymmdd */[Tempo.FORMAT.yearMonthDay]: number;
		/** yyyymmdd */yearMonthDay: number;
		/** ww */[Tempo.ELEMENT.ww]: Tempo.WEEKDAY;
		/** www */ weekDay: Tempo.WEEKDAY;
		/** yyyy-mm-dd */[Tempo.FORMAT.date]: string;
		/** yyyy-mm-dd */date: string;
		/** hh:mi:ss */[Tempo.FORMAT.time]: string;
		/** hh:mi:ss */time: string;
		/** generic format */[key: string]: string | number;
	}
	export type Formats = keyof Tempo.Format

	export type Modifier = '=' | '-' | '+' | '<' | '<=' | '-=' | '>' | '>=' | '+=' | 'this' | 'next' | 'prev' | 'last' | 'first' | undefined
	export type Relative = 'ago' | 'hence'

	export type mm = IntRange<0, 12>
	export type hh = IntRange<0, 24>
	export type mi = IntRange<0, 60>
	export type ss = IntRange<0, 60>
	export type ms = IntRange<0, 999>
	export type us = IntRange<0, 999>
	export type ns = IntRange<0, 999>
	export type ww = IntRange<1, 52>

	export type Duration = Required<Temporal.DurationLike> & Record<"iso", string> & Record<"sign", Temporal.Duration["sign"]> & Record<"blank", Temporal.Duration["blank"]> & Record<"unit", string | undefined>

	export type WEEKDAY = enums.WEEKDAY
	export type WEEKDAYS = enums.WEEKDAYS
	export type MONTH = enums.MONTH
	export type MONTHS = enums.MONTHS
	export type DURATION = enums.DURATION
	export type DURATIONS = enums.DURATIONS
	export type COMPASS = enums.COMPASS
	export type ELEMENT = enums.ELEMENT

	export type Weekday = enums.Weekday
	export type Month = enums.Month
	export type Element = enums.Element
}
// #endregion Tempo types / interfaces / enums

// #region Namespace that doesn't need to be shared externally
namespace Internal {
	export type StringPattern = string | RegExp
	export type StringTuple = [string, string];

	export type InputFormat<T> = Record<string, T | T[]> | Record<string, T | T[]>[] | Map<string | symbol, T | T[]>

	// export type Symbol = Record<string, symbol>
	export type Regexp = Record<string, RegExp>

	export type GroupWkd = { wkd?: Tempo.WEEKDAY; mod?: Tempo.Modifier; cnt?: string; sfx?: Tempo.Relative; hh?: string; mi?: string; ss?: string; ms?: string; us?: string; ns?: string; ff?: string; mer?: string; }
	export type GroupDate = { mod?: Tempo.Modifier; cnt?: string; sfx?: Tempo.Relative; yy?: string; mm?: string; dd?: string; }
	export type GroupModifier = { mod?: Tempo.Modifier | Tempo.Relative, adjust: number, offset: number, period: number }

	export interface Shape {																	// 'global' and 'local' variables
		/** current defaults for all Tempo instances */					config: Tempo.Config;
		/** parsing rules */																		parse: Internal.Parse;
		/** is 'mmddyyyy' timeZone for parsing */								isMonthDay: boolean;
	}

	/**
	 * Parsing rules  
	 * Once a Tempo is instantiated, these values are for debug purposes only  
	 */
	export interface Parse {
		/** Locales which prefer 'mm-dd-yyyy' date-order */			mdyLocales: { locale: string, timeZones: string[] }[];
		/** Layout names that are switched to mdy */						mdyLayouts: [string, string][];
		/** Symbol registry */																	token: Token;
		/** Tempo snippets to aid in parsing */									snippet: Snippet;
		/** Tempo layout strings */															layout: Layout;
		/** Map of regex-patterns to match input-string */			pattern: Internal.RegexpMap;
		/** configured Events */																event: Event;
		/** configured Periods */																period: Period;
		/** parsing match result */															result?: Internal.Match;
	}

	/** debug a Tempo instantiation */
	export interface Match {
		/** pattern which matched the input */									match?: string;
		/** the type of the original input */										type: Type;
		/** the value of the original input */									value: any;
	}

	export type StringRecord = Record<string, string>
	export type RegexpMap = Map<symbol, RegExp>
}
// #endregion Namespace

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tempo.init();																								// initialize default global configuration

type Params<T> = {																					// Type for consistency in expected arguments
	(tempo?: Tempo.DateTime, options?: Tempo.Options): T;				// parse Tempo.DateTime, default to Temporal.Instant.now()
	(options: Tempo.Options): T;																// provide just Tempo.Options (use {value:'XXX'} for specific Tempo.DateTime)
}

type Fmt = {																								// used for the fmtTempo() shortcut
	<F extends keyof Tempo.Format>(fmt: F, tempo?: Tempo.DateTime, options?: Tempo.Options): Tempo.Format[F];
	<F extends keyof Tempo.Format>(fmt: F, options: Tempo.Options): Tempo.Format[F];
}

// shortcut functions to common Tempo properties / methods
/** check valid Tempo */			export const isTempo = (tempo?: unknown) => isType<Tempo>(tempo, 'Tempo');
/** current timestamp (ts) */	export const getStamp = ((tempo, options) => new Tempo(tempo, options).ts) as Params<number | bigint>;
/** create new Tempo */				export const getTempo = ((tempo, options) => new Tempo(tempo, options)) as Params<Tempo>;
/** format a Tempo */					export const fmtTempo = ((fmt, tempo, options) => new Tempo(tempo, options).format(fmt)) as Fmt;
