import '#tempo/temporal.polyfill.js';												// side-effect runtime check for Temporal

// #region library modules~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

import { Logify } from '#library/logify.class.js';
import { ifDefined } from '#library/object.library.js';
import { secure } from '#library/utility.library.js';
import { Immutable, Serializable } from '#library/class.library.js';
import { asArray, asNumber, asInteger, isNumeric, ifNumeric } from '#library/coercion.library.js';
import { cleanify, stringify } from '#library/serialize.library.js';
import { getStorage, setStorage } from '#library/storage.library.js';
import { ownKeys, ownEntries, getAccessors, omit } from '#library/reflection.library.js';
import { getProxy } from '#library/proxy.library.js';
import { getContext, CONTEXT } from '#library/utility.library.js';
import { pad, singular, toProperCase, trimAll } from '#library/string.library.js';
import { getType, asType, isType, isEmpty, isNull, isNullish, isDefined, isUndefined, isString, isObject, isRegExp, isRegExpLike, isIntegerLike, isSymbol, isFunction, isArray } from '#library/type.library.js';
import type { IntRange, LooseUnion, NonOptional, Property, Plural, Type } from '#library/type.library.js';

import * as enums from '#tempo/tempo.enum.js';
import registerTerms from '#tempo/terms/term.import.js';

import { Match, Token, Snippet, Layout, Event, Period, Default, TimeZone } from '#tempo/tempo.default.js';

// import '#library/prototype.library.js';									// patch prototypes

// #endregion

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Tempo: { type: 'Tempo', value: Tempo }									// register our 'Tempo' as a TypeValue
	}
}

/** key to use for storage / globalThis Symbol */						export const $Tempo = Symbol.for('$Tempo');
/** current execution context*/															const Context = getContext();

declare global {
	interface globalThis {
		[$Tempo]?: Tempo.Discovery;
	}
}

// #region Const variables
/**
 * # Tempo
 * A powerful wrapper around `Temporal.ZonedDateTime` for flexible parsing and intuitive manipulation of date-time objects.
 * Bridges the gap between raw string/number inputs and the strict requirements of the ECMAScript Temporal API.
 */
@Serializable
@Immutable
export class Tempo {
// #region Static enum properties~~~~~~~~~~~~~~~~~~~~~~~~~
	/** Weekday names (short-form) */													static get WEEKDAY() { return enums.WEEKDAY }
	/** Weekday names (long-form) */													static get WEEKDAYS() { return enums.WEEKDAYS }
	/** Month names (short-form) */														static get MONTH() { return enums.MONTH }
	/** Month names (long-form) */														static get MONTHS() { return enums.MONTHS }
	/** Time durations as seconds (singular) */								static get DURATION() { return enums.DURATION }
	/** Time durations as milliseconds (plural) */						static get DURATIONS() { return enums.DURATIONS }

	/** Quarterly Seasons */																	static get SEASON() { return enums.SEASON }
	/** Compass cardinal points */														static get COMPASS() { return enums.COMPASS }

	/** Tempo to Temporal DateTime Units map */								static get ELEMENT() { return enums.ELEMENT }
	/** Pre-configured format {name -> string} pairs */				static get FORMAT() { return Tempo.#global.config.formats }
	/** some useful Dates */																	static get LIMIT() { return enums.LIMIT }

	// #endregion

	// #region Static private properties~~~~~~~~~~~~~~~~~~~~~~
	static #dbg = new Logify('Tempo', {
		debug: Default?.debug ?? false,
		catch: Default?.catch ?? false
	})

	/** Tempo state for the global configuration */						static #global = {} as Tempo.State
	/** a collection of parse rule-matches */									static #pending: Tempo.Match[] | undefined;
	/** cache for next-available 'usr' Token key */						static #usrCount = 0;
	/** mutable list of registered term plugins */						static #terms = [] as Tempo.TermPlugin[];

	// #endregion

	// #region Static private methods~~~~~~~~~~~~~~~~~~~~~~~~~

	//** prototype helpers */
	/** return the Prototype parent of an object */						static #proto(obj: object) { return Object.getPrototypeOf(obj) }
	/** test object has own property with the given key */		static #hasOwn(obj: object, key: string) { return Object.hasOwn(obj, key) }
	/** return whether the shape is 'local' or 'global' */		static #isLocal(shape: Tempo.State) { return shape.config.scope === 'local' }
	/** create an object based on a prototype */							static #create<T extends object>(obj: object, name: string): T { return Object.create(Tempo.#proto(obj)[name]) }

	/**
	 * {dt} is a layout that combines date-related {snippets} (e.g. dd, mm -or- evt) into a pattern against which a string can be tested.  
	 * because it will also include a list of events (e.g. 'new_years' | 'xmas'), we need to rebuild {dt} if the user adds a new event
	 */
	// TODO:  check all Layouts which reference "{evt}" and update them
	static #setEvents(shape: Tempo.State) {
		const events = ownEntries(shape.parse.event, true);
		if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.parse, 'event') && !Tempo.#hasOwn(shape.parse, 'isMonthDay'))
			return;																								// no local change needed

		const src = shape.config.scope.substring(0, 1);					// 'g'lobal or 'l'ocal
		const groups = events
			.map(([pat, _], idx) => `(?<${src}evt${idx}>${pat})`)	// assign a number to the pattern
			.join('|')																						// make an 'Or' pattern for the event-keys

		if (groups) {
			const protoEvt = Tempo.#proto(shape.parse.snippet)[Token.evt]?.source;
			if (!Tempo.#isLocal(shape) || groups !== protoEvt) {
				if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.parse, 'snippet'))
					shape.parse.snippet = Tempo.#create(shape.parse, 'snippet');

				Object.defineProperty(shape.parse.snippet, Token.evt, {
					value: new RegExp(groups),
					enumerable: true,
					writable: true,
					configurable: true
				});
			}
		}

		if (shape.parse.isMonthDay) {
			const protoDt = Tempo.#proto(shape.parse.layout)[Token.dt] as string;
			const localDt = '{mm}{sep}?{dd}({sep}?{yy})?|{mod}?({evt})';
			if (!Tempo.#isLocal(shape) || localDt !== protoDt) {
				if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.parse, 'layout'))
					shape.parse.layout = Tempo.#create(shape.parse, 'layout');

				Object.defineProperty(shape.parse.layout, Token.dt, {
					value: localDt,
					enumerable: true,
					writable: true,
					configurable: true
				});
			}
		}
	}

	/**
	 * {tm} is a layout that combines time-related snippets (hh, mi, ss, ff, mer -or- per) into a pattern against which a string can be tested.  
	 * because it will also include a list of periods (e.g. 'midnight' | 'afternoon' ), we need to rebuild {tm} if the user adds a new period
	*/
	// TODO:  check all Layouts which reference "{per}" and update them
	static #setPeriods(shape: Tempo.State) {
		const periods = ownEntries(shape.parse.period, true);
		if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.parse, 'period'))
			return;																								// no local change needed

		const src = shape.config.scope.substring(0, 1);					// 'g'lobal or 'l'ocal
		const groups = periods
			.map(([pat, _], idx) => `(?<${src}per${idx}>${pat})`)	// {pattern} is the 1st element of the tuple
			.join('|')																						// make an 'or' pattern for the period-keys

		if (groups) {
			const protoPer = Tempo.#proto(shape.parse.snippet)[Token.per]?.source;
			if (!Tempo.#isLocal(shape) || groups !== protoPer) {
				if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.parse, 'snippet'))
					shape.parse.snippet = Tempo.#create(shape.parse, 'snippet');

				Object.defineProperty(shape.parse.snippet, Token.per, {
					value: new RegExp(groups),
					enumerable: true,
					writable: true,
					configurable: true
				});
			}
		}
	}

	/** try to infer hemisphere using the timezone's daylight-savings setting */
	static #setSphere = (shape: Tempo.State, options: Tempo.Options) => {
		if (isUndefined(shape.config.timeZone) || Tempo.#hasOwn(options, 'sphere'))
			return shape.config.sphere;														// already specified or no timeZone to calculate from

		// use a fixed date (2024-01-01) to compare offsets for hemisphere detection
		const zdt = new Temporal.ZonedDateTime(BigInt(1_704_067_200) * BigInt(1_000_000_000), shape.config.timeZone as string);
		const jan = zdt.with({ day: 1, month: 1 }).offsetNanoseconds;
		const jun = zdt.with({ day: 1, month: 6 }).offsetNanoseconds;
		const dst = Math.sign(jan - jun);												// timeZone offset difference between Jan and Jun

		switch (dst) {
			case -1:
				return Tempo.COMPASS.North;													// clock moves backward in Northern hemisphere
			case 1:
				return Tempo.COMPASS.South;													// clock moves forward in Southern hemisphere
			case 0:
			default:
				return void 0;																			// timeZone does not observe DST
		}
	}

	/** determine if we have a {timeZone} which prefers {mdy} date-order */
	static #isMonthDay(shape: Tempo.State) {
		const monthDay = [...asArray(Tempo.#global.parse.mdyLocales)];

		if (Tempo.#isLocal(shape) && Tempo.#hasOwn(shape.parse, 'mdyLocales'))
			monthDay.push(...shape.parse.mdyLocales);							// append local mdyLocales (not overwrite global)

		return monthDay.some(mdy => {
			const m = mdy as { locale: string, timeZones: string[] };
			const tzs = m.timeZones ?? (m as Record<string, any>).getTimeZones?.() ?? [];
			return tzs.includes(shape.config.timeZone as string);
		});
	}

	/**
	 * swap parsing-order of layouts to suit different timeZones  
	 * this allows the parser to try to interpret '04012023' as Apr-01-2023 before trying 04-Jan-2023  
	 */
	static #swapLayout(shape: Tempo.State) {
		const layouts = ownEntries(shape.parse.layout);					// get entries of Layout Record
		const swap = shape.parse.mdyLayouts;										// get the swap-tuple
		let chg = false;																				// no need to rebuild, if no change

		swap
			.forEach(([dmy, mdy]) => {														// loop over each swap-tuple
				const idx1 = layouts.findIndex(([key]) => (key as symbol).description === dmy);	// 1st swap element exists in {layouts}
				const idx2 = layouts.findIndex(([key]) => (key as symbol).description === mdy);	// 2nd swap element exists in {layouts}

				if (idx1 === -1 || idx2 === -1)
					return;																						// no pair to swap

				const swap1 = (idx1 < idx2) && shape.parse.isMonthDay;		// we prefer {mdy} and the 1st tuple was found earlier than the 2nd
				const swap2 = (idx1 > idx2) && !shape.parse.isMonthDay;		// we dont prefer {mdy} and the 1st tuple was found later than the 2nd

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
		toProperCase(String(str).substring(0, 3)) as T;

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
			Default.locale ??																			// else default locale
			locale																								// cannot determine locale
	}

	/**
	 * conform input of Snippet / Layout / Event / Period options  
	 * This is needed because we allow the user to flexibly provide detail as {[key]:val} or {[key]:val}[] or [key,val][]  
	 */
	static #setConfig(shape: Tempo.State, ...options: Tempo.Options[]) {

		const mergedOptions: Tempo.Options = Object.assign({}, ...options);
		if (isEmpty(mergedOptions))															// nothing to do
			return;

		if (mergedOptions.store)																// check for local-storage
			Object.assign(mergedOptions, { ...Tempo.readStore(mergedOptions.store), ...mergedOptions });

		/** helper to normalize snippet/layout Options into the target Config */
		const collect = (target: Property<any>, value: any, convert: (v: any) => any) => {
			const itm = asType(value);
			target ??= {}

			switch (itm.type) {
				case 'Object':
					ownEntries(itm.value as Property<any>)
						.forEach(([k, v]) => target[Tempo.getSymbol(k as string)] = convert(v));
					break;
				case 'String':
				case 'RegExp':
					target[Tempo.getSymbol()] = convert(itm.value);
					break;
				case 'Array':
					itm.value.forEach(elm => collect(target, elm, convert));
					break;
			}
		}

		ownEntries(mergedOptions)
			.forEach(([optKey, optVal]) => {
				if (isUndefined(optVal)) return;										// skip undefined values
				const arg = asType(optVal);

				switch (optKey) {
					case 'snippet':
					case 'layout':
					case 'event':
					case 'period':
						// lazy-shadowing: only create local object if it doesn't already exist on local shape
						if (!Tempo.#hasOwn(shape.parse, optKey))
							shape.parse[optKey] = Tempo.#create(shape.parse, optKey);

						const rule = shape.parse[optKey];
						if (['snippet', 'layout'].includes(optKey)) {
							collect(rule, arg.value, v =>
								optKey === 'snippet'
									? isRegExp(v) ? v : new RegExp(v)
									: isRegExp(v) ? v.source : v
							)
						} else {
							asArray(arg.value as Event | Period)
								.forEach(elm => ownEntries(elm).forEach(([key, val]) => (rule as Record<string, any>)[key] = val))
						}
						break;

					case 'mdyLocales':
						shape.parse[optKey] = Tempo.#mdyLocales(arg.value as NonNullable<Tempo.Options[typeof optKey]>);
						break;

					case 'mdyLayouts':																// these are the 'layouts' that need to swap parse-order
						shape.parse[optKey] = asArray(arg.value as NonNullable<Tempo.Options[typeof optKey]>);
						break;

					case 'pivot':
						shape.parse["pivot"] = Number(arg.value);
						break;

					case 'config':
						Tempo.#setConfig(shape, arg.value as Tempo.Options);
						break;

					case 'timeZone':
						const zone = String(arg.value).toLowerCase();
						shape.config.timeZone = TimeZone[zone] ?? arg.value;
						break;

					case 'formats':
						if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.config, 'formats'))
							shape.config.formats = shape.config.formats.extend({}) as Tempo.Format; // shadow parent prototype

						if (isObject(arg.value))
							shape.config.formats = shape.config.formats.extend(arg.value as Property<any>) as Tempo.Format;
						break;

					case 'discovery':
						shape.config.discovery = isSymbol(optVal) ? Symbol.keyFor(optVal) as string : optVal;
						break;

					case 'plugins':
						asArray(optVal).forEach(p => this.extend(p));
						break;

					case 'anchor':
						break;																					// internal anchor used for relativity parsing

					default:																					// else just add to config
						Object.assign(shape.config, { [optKey]: optVal });
						break;
				}
			})

		const isMonthDay = Tempo.#isMonthDay(shape);
		if (isMonthDay !== Tempo.#proto(shape.parse).isMonthDay)// this will always set on 'global', conditionally on 'local'
			shape.parse.isMonthDay = isMonthDay;

		shape.config.sphere = Tempo.#setSphere(shape, mergedOptions);

		if (isDefined(shape.parse.mdyLayouts)) Tempo.#swapLayout(shape);
		if (isDefined(shape.parse.event)) Tempo.#setEvents(shape);
		if (isDefined(shape.parse.period)) Tempo.#setPeriods(shape);

		Tempo.#setPatterns(shape);															// setup Regex DateTime patterns
	}

	/** setup mdy TimeZones, using Intl.Locale */
	// The google-apps-script types package provides its own Intl.Locale interface that doesn't include getTimeZones(),
	// and it takes priority over the ESNext.Intl augmentation in tsconfig.
	// The "(mdy as any).getTimeZones?.()" can be replaced with "mdy.getTimeZones()" after google-apps-script is corrected
	static #mdyLocales(value: Tempo.Options["mdyLocales"]) {
		return asArray(value)
			.map(mdy => new Intl.Locale(mdy))
			.map(mdy => ({ locale: mdy.baseName, timeZones: (mdy as Record<string, any>).getTimeZones?.() ?? [] }))
	}

	/** support "Global Discovery" of user-options */
	static #setDiscovery(shape: Tempo.State, key: string | symbol = shape.config.discovery ?? $Tempo) {
		const sym = isString(key) ? Symbol.for(key) : key;
		const discovery = (globalThis as Record<symbol, any>)[sym] as Tempo.Discovery;
		if (!isObject(discovery)) return {}

		// 1. Process TimeZones (normalize to lowercase for lookup)
		const timeZones = discovery.timeZones ?? {}
		for (const [key, value] of Object.entries(timeZones))
			TimeZone[key.toLowerCase()] = value;

		// 1b. Process Numbers
		const numbers = discovery.numbers ?? {}
		for (const [key, value] of Object.entries(numbers))
			enums.NUMBER[key.toLowerCase()] = value;

		// 2. Process Terms
		if (discovery.terms)
			this.extend(asArray(discovery.terms));

		// 3. Re-calculate {nbr} snippet and dependent snippets, then re-sync patterns
		if (discovery.numbers || discovery.terms) {
			const nbr = new RegExp(`(?<nbr>[0-9]+|${Object.keys(enums.NUMBER).join('|')})`);
			shape.parse.snippet[Token.nbr] = nbr;

			// rebuild snippets that depend on {nbr}
			shape.parse.snippet[Token.mod] = new RegExp(`((?<mod>${Match.modifier.source})?${nbr.source}? *)`);
			shape.parse.snippet[Token.afx] = new RegExp(`((s)? (?<afx>${Match.affix.source}))?${shape.parse.snippet[Token.sep].source}?`);

			Tempo.#setPatterns(shape);
		}

		// 3. Process Formats
		if (discovery.formats)
			shape.config.formats = shape.config.formats.extend(discovery.formats) as Tempo.Format;

		// 4. Process Plugins
		if (discovery.plugins)
			asArray(discovery.plugins).forEach(p => this.extend(p));

		// 4. Process Options
		let opts = discovery.options || {}
		return isFunction(opts) ? opts() : opts;
	}

	/** build RegExp patterns */
	static #setPatterns(shape: Tempo.State) {
		const snippet = shape.parse.snippet;

		// if local and no snippet or layout overrides, we can just use the prototype's patterns
		if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.parse, 'snippet') && !Tempo.#hasOwn(shape.parse, 'layout'))
			return;

		// ensure we have our own Map to mutate (shadow if local)
		if (!Tempo.#hasOwn(shape.parse, 'pattern'))
			shape.parse.pattern = new Map();

		shape.parse.pattern.clear();														// reset {pattern} Map

		for (const [sym, layout] of ownEntries(shape.parse.layout, true))
			shape.parse.pattern.set(sym, Tempo.regexp(layout, snippet));
	}

	// #endregion Static private methods

	// #region Static public methods~~~~~~~~~~~~~~~~~~~~~~~~~~

	/**
	 * Unified loader for library extensions.
	 * 
	 * @param arg - A `Plugin` function, a `TermPlugin` object (or array), or a `Discovery` object.
	 * @param options - Optional configuration for a standard `Plugin`.
	 * @returns The `Tempo` class for chaining.
	 */
	static extend(plugin: Tempo.Plugin | Tempo.Plugin[], options?: any): typeof Tempo;
	static extend(term: Tempo.TermPlugin | Tempo.TermPlugin[]): typeof Tempo;
	static extend(config: Tempo.Discovery | Tempo.Discovery[]): typeof Tempo;
	static extend(arg: any, options?: any) {
		asArray(arg).flat(1).forEach(item => {
			if (isFunction(item)) {
				if (!item.installed) {
					item(options, this, (val: any) => new this(val));	// handle Plugins (Functional extension)
					item.installed = true;
				}
			}

			if (isObject(item) && isString(item.key) && isFunction(item.define)) {
				if (!Tempo.#terms.some(term => term.key === item.key))
					Tempo.#terms.push(item);													// handle TermPlugins (Grammar extension)
			}

			if (isObject(item) && ownKeys(item).some(key => enums.DISCOVERY.has(key as any))) {
				(globalThis as Record<symbol, any>)[$Tempo] = item;	// handle Discovery (Configuration bootstrapping)
				this.init();
			}
		});

		return this;
	}

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
			Tempo.#global.parse = {
				snippet: Object.assign({}, Snippet),
				layout: Object.assign({}, Layout),
				event: Object.assign({}, Event),
				period: Object.assign({}, Period),
				mdyLocales: Tempo.#mdyLocales(Default.mdyLocales as Tempo.Options['mdyLocales']),
				mdyLayouts: asArray(Default.mdyLayouts as Tempo.Options['mdyLayouts']) as Tempo.Pair[],
				pivot: Default.pivot,
			} as Tempo.Parse;

			const { timeZone, calendar } = Intl.DateTimeFormat().resolvedOptions();
			Tempo.#global.config = Object.assign({},
				omit({ ...Default }, ...enums.PARSE.keys()),				// use Default as base, omit parse-related
				{
					calendar,
					timeZone,
					locale: Tempo.#locale(),
					discovery: Symbol.keyFor($Tempo) as string,
					formats: Object.create(enums.FORMAT),
					scope: 'global'
				}
			) as Tempo.Config;

			Tempo.#usrCount = 0;																	// reset user-key counter
			for (const key of Object.keys(Token))									// purge user-allocated Tokens
				if (key.startsWith('usr.'))													// only remove 'usr.' prefixed keys
					delete Token[key];

			this.extend(registerTerms);															// register built-in term plugins

			const storeKey = Symbol.keyFor($Tempo) as string;
			Tempo.#setConfig(Tempo.#global,
				{ store: storeKey, discovery: storeKey, scope: 'global' },
				Tempo.readStore(storeKey),													// allow for storage-values to overwrite
				Tempo.#setDiscovery(Tempo.#global, $Tempo),					// support "Global Discovery" of user-options
			)
		}
		else {
			const discovery = options.discovery ?? Tempo.#global.config.discovery ?? Symbol.keyFor($Tempo);
			Tempo.#setConfig(Tempo.#global, Tempo.#setDiscovery(Tempo.#global, discovery as string), options);
		}

		if (Context.type === CONTEXT.Browser || options.debug === true)
			Tempo.#dbg.info(Tempo.config, 'Tempo:', Tempo.#global.config);

		return Tempo.config;
	}

	/** release global config and reset library to defaults */
	static [Symbol.dispose]() { Tempo.init() }


	/** Reads options from persistent storage (e.g., localStorage). */
	static readStore(key = Tempo.#global.config.store) {
		return getStorage<Tempo.Options>(key, {});
	}

	/** Writes configuration into persistent storage. */
	static writeStore(config?: Tempo.Options, key = Tempo.#global.config.store) {
		return setStorage(key, config);
	}

	/** lookup or registers a new `Symbol` for a given key. */
	static getSymbol(key?: string | symbol) {
		if (isUndefined(key)) {
			const usr = `usr.${++Tempo.#usrCount}`;								// allocate a prefixed 'user' key
			return Token[usr] = Symbol(usr);											// add to Symbol register
		}

		if (isSymbol(key)) return key;

		if (isString(key) && key.includes('.')) {
			const description = key.split('.').pop()!;						// use last segment as description
			return Token[key as keyof typeof Token] ??= Symbol(description);
		}

		return Token[key as keyof typeof Token] ?? Symbol.for(`$Tempo.${key}`);
	}

	/** translates {layout} into an anchored, case-insensitive RegExp. */
	static regexp(layout: string | RegExp, snippet?: Snippet) {
		// helper function to replace {name} placeholders with their corresponding snippets
		function matcher(str: string | RegExp, depth = 0): string {
			if (depth > 12) return isRegExp(str) ? str.source : str;			// depth guard

			let source = isRegExp(str) ? str.source : str;

			if (isRegExpLike(source))															// string that looks like a RegExp
				source = source.substring(1, source.length - 1);		// remove the leading/trailing "/"
			if (source.startsWith('^') && source.endsWith('$'))
				source = source.substring(1, source.length - 1);		// remove the leading/trailing anchors (^ $)

			return source.replace(Match.braces, (match, name) => {// iterate over "{}" pairs in the source string
				const token = Tempo.getSymbol(name);								// get the symbol for this {name}
				const customs = snippet?.[token as keyof Snippet]?.source ?? snippet?.[name as keyof Snippet]?.source;
				const globals = Tempo.#global.parse.snippet[token as keyof Snippet]?.source ?? Tempo.#global.parse.snippet[name as keyof Snippet]?.source;
				const layout = Layout[token as keyof Layout];									// get resolution source (layout)

				let res = customs ?? globals ?? layout;						// get the snippet/layout source

				if (isNullish(res) && name.includes('.')) {				// if no definition found, try fallback
					const prefix = name.split('.')[0];								// get the base token name
					const pToken = Tempo.getSymbol(prefix);
					res = snippet?.[pToken as keyof Snippet]?.source ?? snippet?.[prefix as keyof Snippet]?.source
						?? Snippet[pToken as keyof Snippet]?.source ?? Snippet[prefix as keyof Snippet]?.source
						?? Layout[pToken as keyof Layout];
				}

				if (res && name.includes('.')) {										// wrap dotted extensions for identification
					const safeName = name.replace(/\./g, '_');
					if (!res.startsWith(`(?<${safeName}>`))
						res = `(?<${safeName}>${res})`;
				}

				return (isNullish(res) || res === match)						// if no definition found,
					? match																						// return the original match
					: matcher(res, depth + 1);																// else recurse to see if snippet contains embedded "{}" pairs
			});
		}

		layout = matcher(layout);																// initiate the layout-parse

		return new RegExp(`^(${layout})$`, 'i');								// translate the source into a regex
	}

	/** Compares two `Tempo` instances or date-time values. */
	static compare(tempo1?: Tempo.DateTime | Tempo.Options, tempo2?: Tempo.DateTime | Tempo.Options) {
		const one = new Tempo(tempo1 as Tempo.DateTime), two = new Tempo(tempo2 as Tempo.DateTime);

		return Number((one.nano > two.nano) || -(one.nano < two.nano)) + 0;
	}

	/** global Tempo configuration */
	static get config() {
		return getProxy(omit({ ...Tempo.#global.config }, 'value'));
	}

	/** global discovery configuration */
	static #getConfig(sym: symbol) {
		const discovery = (globalThis as Record<symbol, any>)[sym];
		return getProxy(omit({ ...discovery, scope: 'discovery' }, 'value'));
	}

	/** global discovery configuration */
	static get discovery() {
		const sym = Symbol.for(this.config.discovery);
		return Tempo.#getConfig(sym);
	}

	/**
 * Returns a snapshot of the configuration layers used by Tempo.
 * Useful for debugging how the final configuration is built.
 */
	static get options() {
		const keyFor = this.config.store ?? Symbol.keyFor($Tempo) as string;

		return {
			default: this.default,
			discovery: this.discovery,
			storage: getProxy(Object.assign({ key: keyFor, scope: 'storage' }, omit(Tempo.readStore(keyFor), 'value'))),
			global: this.config,
		}
	}

	/** Creates a new `Tempo` instance. */
	static from(options?: Tempo.Options): Tempo;
	static from(tempo: Tempo.DateTime | undefined, options?: Tempo.Options): Tempo;
	static from(tempo?: Tempo.DateTime | Tempo.Options, options?: Tempo.Options) { return new this(tempo as NonNullable<Tempo.DateTime>, options); }

	static now() { return Temporal.Now.instant().epochNanoseconds; }



	/** static Tempo.terms getter */
	static get terms() {
		return secure(Tempo.#terms
			.map(({ define, ...rest }) => rest));									// omit the 'define' method
	}

	/** static Tempo properties getter */
	static get properties() {
		return secure(getAccessors(Tempo)
			.filter(acc => getType(acc) !== 'Symbol'));						// omit any Symbol properties
	}


	/** Tempo initial default settings */
	static get default() {
		return secure({ ...Default, scope: 'default', timeZone: TimeZone });
	}

	/** 
	 * configuration governing the static 'rules' used when parsing Tempo.DateTime argument
	 */
	static get parse() {
		const parse = Tempo.#global.parse;
		return secure({
			...parse,																							// spread primitives like {pivot}
			snippet: { ...parse.snippet },												// spread nested objects
			layout: { ...parse.layout },
			event: { ...parse.event },
			period: { ...parse.period },
			mdyLocales: [...parse.mdyLocales],
			mdyLayouts: [...parse.mdyLayouts],
		}) as Tempo.Parse;
	}

	/** iterate over Tempo properties */
	static [Symbol.iterator]() {
		return Tempo.properties[Symbol.iterator]();							// static Iterator over array of 'getters'
	}

	// #endregion Static public methods

	// #region Instance symbols~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	/** allow for auto-convert of Tempo to BigInt, Number or String */
	[Symbol.toPrimitive](hint?: 'string' | 'number' | 'default') {
		Tempo.#dbg.info(this.config, getType(this), '.hint: ', hint);
		switch (hint) {
			case 'string': return this.toString();								// ISO 8601 string
			case 'number': return this.epoch.ms;									// Unix epoch (milliseconds)
			default: return this.nano;														// Unix epoch (nanoseconds)
		}
	}

	/** iterate over instance formats */
	[Symbol.iterator]() {
		return ownEntries(this.#fmt)[Symbol.iterator]();				// instance Iterator over tuple of FormatType[]
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
	/** temporary anchor used during parsing */								#anchor?: Temporal.ZonedDateTime | undefined;
	/** prebuilt formats, for convenience */									#fmt = {} as Tempo.Formats;
	/** instance term plugins */															#term = Object.create(null) as Tempo.Terms;
	/** instance values to complement static values */				#local = {
		/** instance configuration */															config: {} as Tempo.Config,
		/** instance parse rules (only populated if provided) */	parse: { result: [] as Tempo.Match[] } as Tempo.Parse
	} as Tempo.State;

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
		[this.#tempo, this.#options] = this.#swap(tempo, options);// swap arguments around, if arg1=Options or Temporal-like
		this.#setLocal(this.#options);													// parse the local options looking for overrides to Tempo.#global.config

		// we now have all the info we need to instantiate a new Tempo
		try {
			this.#anchor = this.#options.anchor;
			this.#zdt = this.#parse(this.#tempo as Tempo.DateTime, this.#anchor);		// attempt to interpret the DateTime arg

			const cal = this.#local.config.calendar;
			if (isString(cal) && ['iso8601', 'gregory'].includes(cal)) {
				for (const key of this.#local.config.formats.keys())
					Object.assign(this.#fmt, { [key]: this.format(key as enums.Format) });
			}

			Tempo.#terms																					// add the plug-in getters for the pre-defined Terms to the instance
				.forEach(({ key, scope, define }) => {							// under 'Tempo.term' getter
					this.#setTerm(this, key, define, true);						// add a getter which returns the key-field only
					this.#setTerm(this, scope, define, false);				// add a getter which returns a range-object
				})

			if (isDefined(Tempo.#pending)) {											// are we mutating with 'set()' ?
				this.#local.parse.result.unshift(...Tempo.#pending);// prepend collected parse-matches
				Tempo.#pending = void 0;														// and reset mutating-flag
			}

			secure(this.#fmt);																		// prevent mutations
			secure(this.#term);																		// secure the initial object with getters
			secure(this.#local.config);
			secure(this.#local.parse);
		} catch (err) {
			console.error('Tempo Constructor Error:', err);
			Tempo.#dbg.catch(this.config, `Cannot create Tempo: ${(err as Error).message}\n${(err as Error).stack}`);
			throw err;																									// throw error
		}
	}

	// This function has be defined within the Tempo class (and not imported from another module) because it references a private-variable
	/** this will add a getter on the instance #term private field */
	#setTerm(self: Tempo, name: PropertyKey | undefined, define: (this: Tempo, key?: boolean) => any, isKeyOnly: boolean) {
		if (isDefined(name) && isDefined(define)) {
			Object.defineProperty(self.#term, name, {
				configurable: false,
				enumerable: false,
				get: function () {
					const value = define.call(self, isKeyOnly);				// evaluate the term range-lookup
					self.#term = secure(Object.create(self.#term, {		// prototype-shadow the getter with a frozen value
						[name]: {
							value,
							configurable: false,
							writable: false,
							enumerable: true
						}
					}))
					return secure(value);
				}
			})
		}
	}

	// #endregion Constructor

	// #region Instance public accessors~~~~~~~~~~~~~~~~~~~~~~
	/** 4-digit year (e.g., 2024) */													get yy() { return this.toDateTime().year }
	/** 4-digit ISO week-numbering year */										get wy() { return this.ww === 1 && this.mm === Tempo.MONTH.Dec ? this.yy + 1 : (this.ww >= 52 && this.mm === Tempo.MONTH.Jan ? this.yy - 1 : this.yy) }
	/** Month number: Jan=1, Dec=12 */												get mm() { return this.toDateTime().month as Tempo.mm }
	/** ISO week number of the year */												get ww() { return this.toDateTime().weekOfYear as Tempo.ww }
	/** Day of the month (1-31) */														get dd() { return this.toDateTime().day }
	/** Day of the month (alias for `dd`) */									get day() { return this.toDateTime().day }
	/** Hour of the day (0-23) */															get hh() { return this.toDateTime().hour as Tempo.hh }
	/** Minutes of the hour (0-59) */													get mi() { return this.toDateTime().minute as Tempo.mi }
	/** Seconds of the minute (0-59) */												get ss() { return this.toDateTime().second as Tempo.ss }
	/** Milliseconds of the second (0-999) */									get ms() { return this.toDateTime().millisecond as Tempo.ms }
	/** Microseconds of the millisecond (0-999) */						get us() { return this.toDateTime().microsecond as Tempo.us }
	/** Nanoseconds of the microsecond (0-999) */							get ns() { return this.toDateTime().nanosecond as Tempo.ns }
	/** Fractional seconds (e.g., 0.123456789) */							get ff() { return +(`0.${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`) }
	/** IANA Time Zone ID (e.g., 'Australia/Sydney') */				get tz() { return this.toDateTime().timeZoneId }
	/** Unix timestamp (defaults to milliseconds) */					get ts() { return this.epoch[this.#local.config.timeStamp] }
	/** Short month name (e.g., 'Jan') */											get mmm() { return Tempo.MONTH.keyOf(this.#zdt.month as Tempo.Month) }
	/** Full month name (e.g., 'January') */									get mon() { return Tempo.MONTHS.keyOf(this.#zdt.month as Tempo.Month) }
	/** Short weekday name (e.g., 'Mon') */										get www() { return Tempo.WEEKDAY.keyOf(this.#zdt.dayOfWeek as Tempo.Weekday) }
	/** Full weekday name (e.g., 'Monday') */									get wkd() { return Tempo.WEEKDAYS.keyOf(this.toDateTime().dayOfWeek as Tempo.Weekday) }
	/** ISO weekday number: Mon=1, Sun=7 */										get dow() { return this.toDateTime().dayOfWeek as Tempo.Weekday }
	/** Nanoseconds since Unix epoch (BigInt) */							get nano() { return this.toDateTime().epochNanoseconds }
	/** current Tempo configuration */
	get config() {
		return getProxy(omit({ ...this.#local.config }, 'scope', 'value', 'anchor'));
	}
	/** Instance-specific parse rules (merged with global) */	get parse() { return this.#local.parse }
	/** Object containing results from all term plugins */		get term() { return getProxy(this.#term) }
	/** Formatted results for all pre-defined format codes */	get fmt() { return this.#fmt }
	/** units since epoch */																	get epoch() {
		return secure({
			/** seconds since epoch */														ss: Math.trunc(this.toDateTime().epochMilliseconds / 1_000),
			/** milliseconds since epoch */												ms: this.toDateTime().epochMilliseconds,
			/** microseconds since epoch */												us: Number(this.toDateTime().epochNanoseconds / BigInt(1_000)),
			/** nanoseconds since epoch */												ns: this.toDateTime().epochNanoseconds,
		})
	}
	// #endregion Instance public accessors
	// #region Instance private accessors

	/**
	 * @Immutable class decorators wrap the class but leave internal lexical bindings pointing to the original, undecorated class.  
	 * To ensure new instances returned by instance methods are properly frozen,  
	 * we must instantiate internally from the decorated wrapper (which is bound to `this.constructor`)  
	 * rather than using `new Tempo(..)`.  
	 */
	get #Tempo() { return this.constructor as typeof Tempo; }

	// #endregion Instance private accessors

	// #region Instance public methods~~~~~~~~~~~~~~~~~~~~~~~~
	/** time duration until (with unit, returns number) */		until(until: Tempo.Until, opts?: Tempo.Options): number;
	/** time duration until another date-time (with unit) */	until(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, until: Tempo.Until): number;
	/** time duration until (returns Duration) */							until(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): Tempo.Duration;
	/** time duration until another date-time */							until(optsOrDate?: Tempo.DateTime | Tempo.Until | Tempo.Options, optsOrUntil?: Tempo.Options | Tempo.Until): number | Tempo.Duration { return this.#until(optsOrDate, optsOrUntil) }

	/** time elapsed since (with unit) */											since(until: Tempo.Until, opts?: Tempo.Options): string;
	/** time elapsed since another date-time (with unit) */		since(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, until: Tempo.Until): string;
	/** time elapsed since (without unit) */									since(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): string;
	/** time elapsed since another date-time */								since(optsOrDate?: Tempo.DateTime | Tempo.Until | Tempo.Options, optsOrUntil?: Tempo.Options | Tempo.Until): string { return this.#since(optsOrDate, optsOrUntil) }

	/** applies a format to the instance. See `doc/tempo.md`. */	format<K extends enums.Format>(fmt: K) { return this.#format(fmt) }
	/** returns a new `Tempo` with specific duration added. */add(tempo?: Tempo.DateTime | Tempo.Options, options?: Tempo.Options) { return this.#add(tempo as Tempo.Add, options); }
	/** returns a new `Tempo` with specific offsets. */				set(tempo?: Tempo.DateTime | Tempo.Options, options?: Tempo.Options) { return this.#set(tempo as Tempo.Set, options); }
	/** returns a clone of the current `Tempo` instance. */		clone() { return new this.#Tempo(this, this.config) }

	/** returns the underlying Temporal.ZonedDateTime */			toDateTime() { return this.#zdt ?? this.#anchor ?? this.#now.toZonedDateTimeISO(this.#local.config.timeZone) }
	/** returns a Temporal.PlainDate representation */				toPlainDate() { return this.toDateTime().toPlainDate() }
	/** returns a Temporal.PlainTime representation */				toPlainTime() { return this.toDateTime().toPlainTime() }
	/** returns a Temporal.PlainDateTime representation */		toPlainDateTime() { return this.toDateTime().toPlainDateTime() }
	/** returns the underlying Temporal.Instant */						toInstant() { return this.toDateTime().toInstant() }

	/** the date-time as a standard `Date` object. */					toDate() { return new Date(this.toDateTime().round({ smallestUnit: enums.ELEMENT.ms }).epochMilliseconds) }
	/** the ISO8601 string representation of the date-time. */toString() { return this.toPlainDateTime().toString({ calendarName: 'never' }) }
	/** Custom JSON serialization for `JSON.stringify`. */		toJSON() { return omit({ ...this.#local.config, value: this.toString() }, 'scope', 'store') }
	/** `true` if the underlying date-time is valid. */				isValid() { return !isEmpty(this) }

	// #endregion Instance public methods

	// #region Instance private methods~~~~~~~~~~~~~~~~~~~~~~~

	/** setup local 'config' and 'parse' rules (prototype-linked to global) */
	#setLocal(options: Tempo.Options) {
		// setup local config (prototype-linked to global config)
		this.#local.config = Object.create(Tempo.#global.config);
		Object.assign(this.#local.config, { scope: 'local' });

		// setup local parse rules (prototype-linked to global parse)
		this.#local.parse = Object.create(Tempo.#global.parse);
		this.#local.parse.result = [];

		Tempo.#setConfig(this.#local, options);									// set #local config
	}

	/** parse DateTime input */
	#parse(tempo?: Tempo.DateTime, dateTime?: Temporal.ZonedDateTime) {
		const today = (dateTime ?? this.#now.toZonedDateTimeISO(this.#local.config.timeZone))
			.withTimeZone(this.#local.config.timeZone);
		const { type, value } = this.#conform(tempo, today, isDefined(dateTime));

		// evaluate latest timezone / calendar (after #conform which might have updated them)
		const { timeZone, calendar } = this.#local.config;
		const tz = isString(timeZone) ? timeZone : (timeZone as unknown as { id: string }).id ?? (timeZone as any).timeZoneId;
		const cal = isString(calendar) ? calendar : (calendar as unknown as { id: string }).id ?? (calendar as any).calendarId;

		if (isEmpty(this.#local.parse.result) && isUndefined(Tempo.#pending))		// #conform() didn't find any matches
			this.#local.parse.result = [{ type, value }];
		Tempo.#dbg.info(this.#local.config, 'parse', `{type: ${type}, value: ${value}}`); // show what we're parsing

		switch (type) {
			case 'Null':
			case 'Void':
			case 'Empty':
			case 'Undefined':
				return today;

			case 'String':																				// String which didn't conform to a Tempo.pattern
				try {
					const str = value.replace(/Z$/, '');												// requested Z-stripping for adoption
					const zdt = Temporal.ZonedDateTime.from(str.includes('[') ? str : `${str}[${tz}]`);
					if (this.#local) this.#local.config.timeZone = zdt.timeZoneId;
					return zdt;
				} catch (err) {																						// else see if Date.parse can parse value
					this.#result({ type: 'String', value }, { match: 'Date.parse' });
					Tempo.#dbg.warn(this.#local.config, 'Cannot detect DateTime; fallback to Date.parse');

					if (Match.date.test(value)) {
						try {
							return Temporal.PlainDate.from(value).toZonedDateTime(tz).withCalendar(cal);
						} catch { /* ignore and fallback */ }
					}

					try {
						return Temporal.PlainDateTime.from(value).toZonedDateTime(tz).withCalendar(cal);
					} catch { /* ignore and fallback to Date.parse */ }

					const date = new Date(value.toString());
					if (isNaN(date.getTime()))
						return Tempo.#dbg.catch(this.#local.config, `Cannot parse Date: "${value}"`);

					return Temporal.ZonedDateTime											// adopt instance timezone
						.from(`${date.toISOString().substring(0, 23)}[${tz}]`)
						.withCalendar(cal)
				}

			case 'Temporal.ZonedDateTime':												// ZonedDateTime object: convert to instance timezone
				return (value.timeZoneId === tz && value.calendarId === cal)
					? value
					: value.withTimeZone(tz).withCalendar(cal);

			case 'Temporal.PlainDate':
			case 'Temporal.PlainDateTime':
				return value
					.toZonedDateTime(tz)
					.withCalendar(cal);

			case 'Temporal.PlainTime':
				return today.withPlainTime(value);

			case 'Temporal.PlainYearMonth':												// assume current day, else end-of-month
				return value
					.toPlainDate({ day: Math.min(today.day, value.daysInMonth) })
					.toZonedDateTime(tz)
					.withCalendar(cal)

			case 'Temporal.PlainMonthDay':												// assume current year
				return value
					.toPlainDate({ year: today.year })
					.toZonedDateTime(tz)
					.withCalendar(cal)

			case 'Temporal.Instant':
				return value
					.toZonedDateTimeISO(tz)
					.withCalendar(cal)

			case 'Tempo':
				return value
					.toDateTime()
					.withTimeZone(tz)
					.withCalendar(cal);																// apply instance timezone to cloned Tempo

			case 'Date':
				return Temporal.Instant.fromEpochMilliseconds(value.getTime())
					.toZonedDateTimeISO(tz)
					.withCalendar(cal);

			case 'Number':																				// Number which didn't conform to a Tempo.pattern
				const [seconds = BigInt(0), suffix = BigInt(0)] = value.toString().split('.').map(BigInt);
				const nano = BigInt(suffix.toString().substring(0, 9).padEnd(9, '0'));

				return Temporal.Instant.fromEpochNanoseconds(seconds * BigInt(1_000_000_000) + nano)
					.toZonedDateTimeISO(tz)
					.withCalendar(cal);

			case 'BigInt':																				// BigInt is not conformed against a Tempo.pattern
				return Temporal.Instant.fromEpochNanoseconds(value)
					.toZonedDateTimeISO(tz)
					.withCalendar(cal);

			default:
				Tempo.#dbg.catch(this.#local.config, `Unexpected Tempo parameter type: ${type}, ${String(value)}`);
				return today;
		}
	}

	/** resolve constructor / method arguments */
	#swap(tempo?: Tempo.DateTime | Tempo.Options, options: Tempo.Options = {}): [Tempo.DateTime | undefined, Tempo.Options] {
		return this.#isOptions(tempo)
			? [tempo.value, { ...tempo }]
			: [tempo, { ...options }];
	}

	/** check if we've been given a Tempo Options object */
	#isOptions(arg: any): arg is Tempo.Options {
		if (!isObject(arg) || arg.constructor !== Object) return false;

		const keys = ownKeys(arg);															// if it contains any 'mutation' keys, then it's not (just) an options object
		if (keys.some(key => enums.MUTATION.has(key)))
			return false;

		return keys
			.some(key => enums.OPTION.has(key));
	}

	/** check if we've been given a ZonedDateTimeLike object */
	#isZonedDateTimeLike(tempo: Tempo.DateTime | Tempo.Options | undefined): tempo is Temporal.ZonedDateTimeLike & { value?: any } {
		if (!isObject(tempo) || isEmpty(tempo))
			return false;

		// if it contains any 'options' keys, it's not a ZonedDateTime
		const keys = ownKeys(tempo);
		if (keys.some(key => enums.OPTION.has(key) && key !== 'value'))
			return false;

		// we include {value} to allow for Tempo instances
		return keys
			.filter(isString)
			.every((key: string) => enums.ZONED_DATE_TIME.has(key))
	}

	#result(...rest: Partial<Tempo.Match>[]) {
		const match = Object.assign({}, ...rest) as Tempo.Match;// collect all object arguments

		if (!isEmpty(match.groups)) {
			if (isDefined(this.#anchor) && !match.isAnchored)
				match.isAnchored = true;
			(Tempo.#pending ?? this.#local.parse.result).push(match);
		}
	}

	/** evaluate 'string | number' input against known patterns */
	#conform(tempo: Tempo.DateTime | undefined, dateTime: Temporal.ZonedDateTime, isAnchored = false): Tempo.Match {
		const arg = asType(tempo);
		const { type, value } = arg;

		if (this.#isZonedDateTimeLike(tempo)) {									// tempo is ZonedDateTime-ish object (throw away 'value' property)
			const { timeZone, calendar, value, ...options } = tempo as Tempo.Options;
			let zdt = !isEmpty(options)
				? dateTime.with(options as Temporal.ZonedDateTimeLikeObject)
				: dateTime;

			if (timeZone)
				zdt = zdt.withTimeZone(timeZone);										// optionally set timeZone
			if (calendar)
				zdt = zdt.withCalendar(calendar);										// optionally set calendar

			this.#result({ type: 'Temporal.ZonedDateTimeLike', value: zdt, match: 'Temporal.ZonedDateTimeLike' });

			return Object.assign(arg, {
				type: 'Temporal.ZonedDateTime',											// override {arg.type}
				value: zdt,
			})
		}

		if (type !== 'String' && type !== 'Number') {
			this.#result(arg, { match: type });
			return arg;
		}

		if (isFunction(value)) {
			const res = (value as Function).call(this);
			return this.#conform(res, dateTime, isAnchored);
		}

		const trim = trimAll(value);

		if (type === 'String') {																// if original value is String
			if (isEmpty(trim)) {																	// don't conform empty string
				this.#result(arg, { match: 'Empty' });
				return Object.assign(arg, { type: 'Empty' });
			}
			if (isIntegerLike(trim)) {														// if string representation of BigInt literal
				this.#result(arg, { match: 'BigInt' });
				return Object.assign(arg, { type: 'BigInt', value: asInteger(trim) });
			}
		}
		else {																									// else it is a Number
			if (trim.length <= 7) {         											// cannot reliably interpret small numbers:  might be {ss} or {yymmdd} or {dmmyyyy}
				Tempo.#dbg.catch(this.#local.config, 'Cannot safely interpret number with less than 8-digits: use string instead');
				return arg;
			}
		}

		// const isSimpleIsoOrNumeric = typeof value === 'string' && (Match.date.test(value) || /^\d+$/.test(value));

		const map = this.#local.parse.pattern;
		for (const [sym, pat] of map) {
			const groups = this.#parseMatch(pat, trim);						// determine pattern-match groups
			if (isEmpty(groups)) continue;												// no match, so skip this iteration

			this.#result(arg, { match: sym.description, groups: cleanify(groups) });	// stash the {key} of the pattern that was matched

			dateTime = this.#parseZone(groups, dateTime);					// resolve timezone early so events can use it
			dateTime = this.#parseGroups(groups, dateTime);				// mutate the {groups} object (resolves events/periods)

			dateTime = this.#parseWeekday(groups, dateTime);			// if {weekDay} pattern, calculate a calendar value
			dateTime = this.#parseDate(groups, dateTime);					// if {calendar}|{event} pattern, translate to date value
			dateTime = this.#parseTime(groups, dateTime);					// if {clock}|{period} pattern, translate to a time value

			/**
			 * finished analyzing a matched pattern.  
			 * rebuild {arg.value} into a ZonedDateTime
			 */
			// if no time-components were matched, strip time to midnight baseline
			if (!isAnchored && !['hh', 'mi', 'ss', 'ff', 'mer', 'per'].some(key => isDefined(groups[key])))
				dateTime = dateTime.withPlainTime('00:00:00');

			Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime });

			Tempo.#dbg.info(this.#local.config, 'groups', groups);	// show the resolved date-time elements
			Tempo.#dbg.info(this.#local.config, 'pattern', sym.description); // show the pattern that was matched

			break;																								// stop checking patterns
		}

		return arg;
	}

	/** apply a regex-match against a value, and clean the result */
	#parseMatch(pat: RegExp, value: string | number | (() => string)) {
		const groups = value.toString().match(pat)?.groups || {}

		ownEntries(groups)																			// remove undefined, NaN, null and empty values
			.forEach(([key, val]: [string, any]) => isEmpty(val) && delete groups[key]);

		return groups;
	}

	/** resolve {event} | {period} to their date | time values (mutates groups) */
	#parseGroups(groups: Tempo.Groups, dateTime: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
		this.#anchor = dateTime;																// temporarily anchor the instance so events resolve relative to current state

		try {
			for (const key of ownKeys(groups) as string[]) {
				const isEvent = Match.event.test(key);
				const isPeriod = Match.period.test(key);
				if (!isEvent && !isPeriod) continue;

				const idx = +key.substring(4);
				const src = key.startsWith('g') ? (isEvent ? Tempo.#global.parse.event : Tempo.#global.parse.period) : (isEvent ? this.#local.parse.event : this.#local.parse.period);
				const entry = ownEntries(src, true)[idx];
				if (!entry) continue;

				const definition = entry[1];
				const res = isFunction(definition) ? definition.call(this).toString() as string : definition;
				const resGroups = isEvent ? this.#parseEvent(res) : this.#parsePeriod(res);

				Object.assign(groups, resGroups);

				delete groups[key];
			}
		} finally {
			this.#anchor = undefined;													// reset anchor
		}

		// resolve month-names into month-numbers (some browsers do not allow month-names when parsing a Date)
		if (isDefined(groups["mm"]) && !isNumeric(groups["mm"])) {
			const mm = Tempo.#prefix(groups["mm"] as Tempo.MONTH); // conform month-name
			groups["mm"] = Tempo.MONTH.keys().findIndex((el: Tempo.MONTH) => el === mm).toString().padStart(2, '0');
		}

		// Apply mutated groups to dateTime
		if (isDefined(groups.yy) || isDefined(groups.mm) || isDefined(groups.dd))
			dateTime = this.#parseDate(groups, dateTime);
		if (isDefined(groups.hh) || isDefined(groups.mi) || isDefined(groups.ss) || isDefined(groups.ff) || isDefined(groups.mer))
			dateTime = this.#parseTime(groups, dateTime);

		return dateTime;
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
			case '-=':
				return (period < offset)
					? -adjust
					: -(adjust - 1)
			case '>':																							// period strictly after base-date
			case 'hence':
			case 'from now':
				return (period >= offset)
					? adjust
					: (adjust - 1)
			case '>=':																						// period after or including base-date
			case '+=':
				return (period > offset)
					? adjust
					: (adjust - 1)
			default:																							// unexpected modifier
				return 0;
		}
	}

	/**
	 * if named-group 'wkd' detected (with optional 'mod', 'nbr', 'sfx' or time-units), then calc relative weekday offset  
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
	#parseWeekday(groups: Tempo.Groups, dateTime: Temporal.ZonedDateTime) {
		const { wkd, mod, nbr = '1', sfx, afx, ...rest } = groups as Internal.GroupWkd;
		if (isUndefined(wkd))																		// this is not a true {weekDay} pattern match
			return dateTime;

		/**
		 * the {weekDay} pattern should only have keys of {wkd}, {mod}, {nbr}, {sfx} (and optionally time-units)  
		 * for example: {wkd: 'Wed', mod: '>', hh: '10', mer: 'pm'}  
		 * we early-exit if we find anything other than time-units  
		*/
		const time = ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'] as const;
		if (!ownKeys(rest)
			.every(key => (time as ReadonlyArray<string>).includes(key as string)))										// non 'time-unit' keys detected
			return dateTime;																			// this is not a true {weekDay} pattern, so early-exit

		if (!isEmpty(mod) && !isEmpty(sfx)) {
			Tempo.#dbg.warn(this.#local.config, `Cannot provide both a modifier '${mod}' and suffix '${sfx}'`);
			return dateTime;																			// cannot provide both 'modifier' and 'suffix'
		}

		const weekday = Tempo.#prefix(wkd);											// conform weekday-name
		const { nbr: adjust = 1 } = this.#num({ nbr });					// how many weeks to adjust
		const offset = Tempo.WEEKDAY.keys()											// how far weekday is from today
			.findIndex((el: Tempo.WEEKDAY) => el === weekday);

		const days = offset - dateTime.dayOfWeek								// number of days to offset from dateTime
			+ (this.#parseModifier({ mod: mod ?? sfx ?? afx, adjust, offset, period: dateTime.dayOfWeek }) * dateTime.daysInWeek);
		delete groups["wkd"];
		delete groups["mod"];
		delete groups["nbr"];
		delete groups["sfx"];

		return dateTime
			.add({ days });																				// set new {day}
	}

	/**
	 * match input against date patterns  
	 * @returns adjusted ZonedDateTime with resolved time-components  
	 */
	#parseDate(groups: Tempo.Groups, dateTime: Temporal.ZonedDateTime) {
		const { mod, nbr = '1', afx, unt, yy, mm, dd } = groups as Internal.GroupDate;
		if (isEmpty(yy) && isEmpty(mm) && isEmpty(dd) && isUndefined(unt))
			return dateTime;																			// return default

		if (!isEmpty(mod) && !isEmpty(afx)) {
			Tempo.#dbg.warn(this.#local.config, `Cannot provide both a modifier '${mod}' and suffix '${afx}'`);
			return dateTime;
		}

		let { year, month, day } = this.#num({									// set defaults to use if {groups} does not contain all date-components
			year: yy ?? dateTime.year,														// supplied year, else current year
			month: mm ?? dateTime.month,													// supplied month, else current month
			day: dd ?? dateTime.day,															// supplied day, else current day
		} as const);

		// handle {unt} relative offset (e.g. '2 days ago')
		if (unt) {
			const { nbr: adjust = 1 } = this.#num({ nbr });
			const direction = (mod === '<' || mod === '-' || afx === 'ago') ? -1 : 1;
			const plural = singular(unt) + 's';
			dateTime = dateTime.add({ [plural]: adjust * direction });

			delete groups["unt"];
			delete groups["nbr"];
			delete groups["afx"];
			delete groups["mod"];

			return dateTime;
		}

		// convert 2-digit year to 4-digits using 'pivot-year' (relative to current century)
		if (year.toString().match(Match.twoDigit)) {						// if {year} match just-two digits
			const pivot = dateTime
				.subtract({ years: this.#local.parse["pivot"] })		// pivot cutoff to determine century
				.year % 100																					// remainder 
			const century = Math.trunc(dateTime.year / 100);			// current century
			year += (century - Number(year >= pivot)) * 100;			// now a four-digit year
		}

		// adjust the {year} if a Modifier is present
		const { nbr: adjust = 1 } = this.#num({ nbr });					// how many years to adjust
		const offset = Number(pad(month) + '.' + pad(day));			// the event month.day
		const period = Number(pad(dateTime.month) + '.' + pad(dateTime.day + 1));

		year += this.#parseModifier({ mod: mod ?? afx, adjust, offset, period });
		Object.assign(groups, { yy: year, mm: month, dd: day });

		delete groups["mod"];
		delete groups["nbr"];
		delete groups["afx"];

		// all date-components are now set; check for overflow in case past end-of-month
		return Temporal.PlainDate.from({ year, month, day }, { overflow: 'constrain' })
			.toZonedDateTime(dateTime.timeZoneId)									// adjust to constrained date
			.withPlainTime(dateTime.toPlainTime());								// restore the time
	}

	/** match input against 'tm' pattern (returns adjusted ZonedDateTime) */
	#parseTime(groups: Tempo.Groups = {}, dateTime: Temporal.ZonedDateTime) {
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

	/**
	 * apply a timezone or calendar bracket to the current ZonedDateTime  
	 * normalization is applied to ensure 'Z' is treated as 'UTC'
	 */
	#parseZone(groups: Tempo.Groups, dateTime: Temporal.ZonedDateTime) {
		const tzd = groups["tzd"]?.replace(Match.zed, 'UTC');	// normalize timezone/offset
		const brk = groups["brk"]?.replace(Match.zed, 'UTC');	// handle bracketed timezone
		const zone = brk || tzd;

		if (zone && zone !== dateTime.timeZoneId && !zone.startsWith('u-ca=')) {
			if (this.#local) this.#local.config.timeZone = zone;	// update local config if exists
			dateTime = dateTime.toPlainDateTime().toZonedDateTime(zone);	// adopt timezone override (stable)
		}

		const cal = groups["cal"];
		if (cal && cal !== dateTime.calendarId) {
			const calendar = cal.startsWith('u-ca=') ? cal.substring(5) : cal;
			this.#local.config.calendar = calendar;
			dateTime = dateTime.withCalendar(calendar);
		}

		delete groups["brk"];
		delete groups["cal"];
		delete groups["tzd"];

		return dateTime;
	}

	/** match an {event} string against a date pattern */
	#parseEvent(evt: string): Tempo.Groups {
		const groups: Tempo.Groups = {}
		const pats = this.#local.parse.isMonthDay								// first find out if we have a US-format timeZone
			? ['mdy', 'dmy', 'ymd'] as const											// if so, try {mdy} before {dmy}
			: ['dmy', 'mdy', 'ymd'] as const											// else try {dmy} before {mdy}

		for (const pat of pats) {
			const reg = this.#getPattern(pat);

			if (isDefined(reg)) {
				const match = this.#parseMatch(reg, evt);

				if (!isEmpty(match)) {
					this.#result({ type: 'Event', value: evt, match: pat, groups: cleanify(match) });
					Object.assign(groups, match);
				}
			}

			if (!isEmpty(groups)) break;													// return on the first matched pattern
		}

		return groups;																					// overlay the match date-components
	}

	/** match a {period} string against the time pattern */
	#parsePeriod(per: string): Tempo.Groups {
		const groups: Tempo.Groups = {}
		const tm = this.#getPattern('tm');													// get the RegExp for the time-pattern

		if (isDefined(tm)) {
			const match = this.#parseMatch(tm, per);
			if (!isEmpty(match)) {
				this.#result({ type: 'Period', value: per, match: 'tm', groups: cleanify(match) });
				Object.assign(groups, match);
			}
		}

		return groups;
	}

	/** lookup the RegExp for a given pattern name */
	#getPattern(pat: string) {
		const reg = this.#local.parse.pattern.get(Tempo.getSymbol(pat));

		if (isUndefined(reg))
			Tempo.#dbg.catch(this.#local.config, `Cannot find pattern: "${pat}"`);

		return reg;
	}

	/** return a new object, with only numeric values */
	#num = (groups: Record<string, string | number>) => {
		return ownEntries(groups)
			.reduce((acc: Record<string, number>, [key, val]: [string, any]) => {
				const low = isString(val) ? val.toLowerCase() : '';
				if (isNumeric(val))
					acc[key] = asNumber(val);
				else if (low in enums.NUMBER)
					acc[key] = enums.NUMBER[low];
				return acc;
			}, {} as Record<string, number>);
	}
	/** mutate the date-time by adding a duration */
	#add = (args?: any, options: Tempo.Options = {}) => {
		const tz = options.timeZone ?? this.tz;
		let zdt = this.#zdt.withTimeZone(tz);
		const overrides = {
			timeZone: tz,
			calendar: this.#zdt.calendarId
		} as Tempo.Options;

		Tempo.#pending ??= [...this.#local.parse.result];			// collected parse-results so-far

		if (isDefined(args)) {
			if (isObject(args) && args.constructor === Object) {
				const mutate = 'add';
				zdt = Object.entries(args ?? {})										// loop through each mutation
					.reduce((zdt, [unit, offset]) => {								// apply each mutation to preceding one
						if (unit === 'timeZone' || unit === 'calendar') return zdt;
						const single = singular(unit as string);
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
					}, zdt)
			}
			else {
				return new this.#Tempo(args, { ...this.#options, ...overrides, ...options, anchor: zdt });
			}
		}

		return new this.#Tempo(zdt, { ...this.#options, ...overrides, ...options, anchor: zdt });
	}
	/** mutate the date-time by setting specific offsets */
	#set = (args?: any, options: Tempo.Options = {}) => {
		const tz = options.timeZone ?? this.tz;
		let zdt = this.#zdt.withTimeZone(tz);
		const overrides = {
			timeZone: tz,
			calendar: this.#zdt.calendarId
		} as Tempo.Options;

		Tempo.#pending ??= [...this.#local.parse.result];			// collected parse-results so-far

		if (isDefined(args)) {
			if (isObject(args) && args.constructor === Object) {

				if ((args as Temporal.ZonedDateTimeLikeObject).timeZone) overrides.timeZone = (args as Temporal.ZonedDateTimeLikeObject).timeZone;
				if ((args as Temporal.ZonedDateTimeLikeObject).calendar) overrides.calendar = (args as Temporal.ZonedDateTimeLikeObject).calendar;

				zdt = Object.entries(args ?? {})										// loop through each mutation
					.reduce((zdt, [key, adjust]) => {								// apply each mutation to preceding one
						if (key === 'timeZone' || key === 'calendar') return zdt;

						const { mutate, offset, single } = ((key) => {
							switch (key) {
								case 'start':
								case 'mid':
								case 'end':
									return { mutate: key, offset: 0, single: singular(adjust?.toString() ?? '') }

								default:
									return { mutate: 'set', offset: adjust, single: singular(key as string) }
							}
						})(key);																							// IIFE to analyze arguments

						switch (`${mutate}.${single}`) {
							case 'set.timeZone':
								return zdt.withTimeZone(offset as Temporal.TimeZoneLike);
							case 'set.calendar':
								return zdt.withCalendar(offset as Temporal.CalendarLike);

							case 'set.period':
							case 'set.time':
							case 'set.date':
							case 'set.event':
							case 'set.dow':																		// set day-of-week by number
							case 'set.wkd':																		// set day-of-week by name
								return this.#parse(offset as any, zdt);

							case 'set.year':
							case 'set.month':
							// case 'set.week':																				// not defined
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
							// case 'set.ww':																					// not defined
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

							case 'start.term':																		// TODO
								return zdt;

							case 'start.month':
								return zdt
									.with({ day: 1 })
									.startOfDay();

							case 'start.week':
								return zdt
									.add({ days: -(this.dow - Tempo.WEEKDAY.Mon) })
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

							case 'mid.term':																			// TODO: relevant?
								return zdt;

							case 'mid.month':
								return zdt
									.with({ day: Math.trunc(zdt.daysInMonth / 2) })
									.startOfDay();

							case 'mid.week':
								return zdt
									.add({ days: -(this.dow - Tempo.WEEKDAY.Thu) })
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

							case 'end.term':																			// TODO
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
									.add({ days: (Tempo.WEEKDAY.Sun - this.dow) + 1 })
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
					}, zdt)																											// start reduce with the shifted zonedDateTime
			}
			else {
				return new this.#Tempo(args, { ...this.#options, ...overrides, ...options, anchor: zdt });
			}
		}

		return new this.#Tempo(zdt, { ...this.#options, ...overrides, ...options, anchor: zdt });
	}

	#format = <K extends string>(fmt: K): enums.FormatType<K> => {
		if (isNull(this.#tempo))
			return undefined as unknown as enums.FormatType<K>;		// don't format <null> dates

		const obj = this.#local.config.formats;
		let template = (isString(fmt) && obj.has(fmt))
			? (obj as Record<string, string>)[fmt]
			: String(fmt);

		// auto-meridiem: if {HH} is present and {mer} is absent, append it after the last time component
		if (template.includes('{HH}') && !template.includes('{mer}') && !template.includes('{MER}')) {
			const index = Math.max(template.lastIndexOf('{HH}'), template.lastIndexOf('{mi}'), template.lastIndexOf('{ss}'));
			if (index !== -1) {
				const end = template.indexOf('}', index) + 1;
				template = template.slice(0, end) + '{mer}' + template.slice(end);
			}
		}

		const result = template.replace(Match.braces, (_match: string, token: string) => {
			switch (token) {
				case 'wy': return pad(this.wy, 4);
				case 'yyww': return pad(this.wy, 4) + pad(this.ww);
				case 'yyyy': return pad(this.yy, 4);
				case 'yy': return pad(this.yy % 100);
				case 'mon': return this.mon;
				case 'mmm': return this.mmm;
				case 'mm': return pad(this.mm);
				case 'dd': return pad(this.dd);
				case 'day': return this.day.toString();
				case 'dow': return this.dow.toString();
				case 'wkd': return this.wkd;
				case 'www': return this.www;
				case 'ww': return pad(this.ww);
				case 'hh': return pad(this.hh);
				case 'HH': return pad(this.hh > 12 ? this.hh % 12 : this.hh || 12);
				case 'mer': return this.hh >= 12 ? 'pm' : 'am';
				case 'MER': return this.hh >= 12 ? 'PM' : 'AM';
				case 'mi': return pad(this.mi);
				case 'ss': return pad(this.ss);
				case 'ms': return pad(this.ms, 3);
				case 'us': return pad(this.us, 3);
				case 'ns': return pad(this.ns, 3);
				case 'ff': return `${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`;
				case 'hhmiss': return `${pad(this.hh)}${pad(this.mi)}${pad(this.ss)}`;
				case 'ts': return this.ts.toString();
				case 'nano': return this.nano.toString();
				case 'tz': return this.tz;
				default: {
					return token.startsWith('term.')
						? stringify(this.term[token.slice(5)])
						: `{${token}}`;																	// unknown format-code, return as-is
				}
			}
		});

		const isExplicitlyNumeric = ['{yyyy}{ww}', '{yyyy}{mm}', '{yyyy}{mm}{dd}', '{yyww}', '{wy}{ww}', '{wy}'].includes(template);
		return (isExplicitlyNumeric ? ifNumeric(result) : result) as enums.FormatType<K>;
	}

	/** calculate the difference between two Tempos  
	 * if the 'until' argument is a unit, then the result is a number, otherwise it is a Tempo.Duration object  
	 * if the offset Tempo is in a different time zone, then the result is in hours
	 * if the offset Tempo is in the past, the result is negative; if it is in the future, the result is positive
	 */
	// Note: 'since' is a hidden argument used only when invoking #until() via #since()
	#until(arg?: Tempo.DateTime | Tempo.Until | Tempo.Options, until?: Tempo.Options | Tempo.Until, since?: false): number
	#until(arg?: Tempo.DateTime | Tempo.Until | Tempo.Options, until?: Tempo.Options | Tempo.Until, since?: true): Tempo.Duration
	#until(arg?: Tempo.DateTime | Tempo.Until | Tempo.Options, until = {} as Tempo.Options | Tempo.Until, since = false) {
		let value, opts: Tempo.Options = {}, unit: Tempo.Unit | undefined;
		switch (true) {
			case isString(arg) && Tempo.ELEMENT.includes(singular(arg)):
				unit = arg as Tempo.Unit;														// e.g. tempo.until('hours')
				({ value, ...opts } = until as Tempo.Options);
				break;
			case isString(arg):																		// assume 'arg' is a dateTime string
				value = arg;																				// e.g. tempo.until('20-May-1957', {unit: 'years'})
				if (isObject(until))
					({ unit, ...opts } = until as Exclude<Tempo.Until, Tempo.Unit>)
				else unit = until as Tempo.Unit;										// assume the 'until' arg is a 'unit' string
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
				value = arg as Tempo.DateTime;
				break;
			case isObject(until):
				unit = (until as Exclude<Tempo.Until, Tempo.Unit>).unit;
				value = arg as Tempo.DateTime;
				break;
			default:
				value = arg as Tempo.DateTime;											// assume 'arg' is a DateTime
		}

		const offset = new this.#Tempo(value, opts);						// create the offset Tempo
		const diffZone = this.#zdt.timeZoneId !== offset.#zdt.timeZoneId;
		// Temporal restricts cross-timezone math to absolute units ('hours') to avoid DST ambiguity
		const duration = this.#zdt.until(offset.#zdt.withCalendar(this.#zdt.calendarId), { largestUnit: diffZone ? 'hours' : (unit ?? 'years') });

		if (isDefined(unit))
			unit = `${singular(unit)}s` as Tempo.Unit;						// coerce to plural

		if (isUndefined(unit) || since) {
			return getAccessors(duration)
				.reduce((acc, dur) => Object.assign(acc, ifDefined({ [dur]: (duration as any)[dur] })),
					{ iso: duration.toString(), unit } as Record<string, any>);
		}

		return duration.total({ relativeTo: this.#zdt, unit });
	}

	/** format the elapsed time between two Tempos (to nanosecond) */
	#since(arg?: Tempo.DateTime | Tempo.Until, until = {} as Tempo.Until) {
		const dur = this.#until(arg, until, true);							// get a Tempo.Duration object
		const date = [dur.years, dur.months, dur.days] as const;
		const time = [dur.hours, dur.minutes, dur.seconds] as const;
		const fraction = [dur.milliseconds, dur.microseconds, dur.nanoseconds]
			.map(Math.abs)
			.map(nbr => nbr.toString().padStart(3, '0'))
			.join('')

		const rtf = new Intl.RelativeTimeFormat(this.#local.config['locale'], { style: 'narrow' });

		switch (dur.unit) {
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

	export type Pattern = string | RegExp
	export type Logic = string | number | Function
	export type Pair = [string, string]
	export type Groups = Record<string, string>
	export type Registry = Map<symbol, RegExp>
	export type PatternOption<T> = T | Record<string | symbol, T> | PatternOption<T>[]

	/** the Options object found in a config-module, or passed to a call to Tempo.init({}) or 'new Tempo({})' */
	export interface BaseOptions {
		/** localStorage key */																	store: string;
		/** globalThis Discovery Symbol */											discovery: string;
		/** additional console.log for tracking */							debug: boolean | undefined;
		/** catch or throw Errors */														catch: boolean | undefined;
		/** Temporal timeZone */																timeZone: Temporal.TimeZoneLike;
		/** Temporal calendar */																calendar: Temporal.CalendarLike;
		/** locale (e.g. en-AU) */															locale: string;
		/** pivot year for two-digit years */										pivot: number;
		/** hemisphere for term.qtr or term.szn */							sphere: Tempo.COMPASS | undefined;
		/** granularity of timestamps (ms | ns) */							timeStamp: Tempo.TimeStamp;
		/** locale-names that prefer 'mm-dd-yy' date order */		mdyLocales: string | string[];
		/** swap parse-order of layouts */											mdyLayouts: Tempo.Pair[];
		/** date-time snippets to help compose a Layout */			snippet: Snippet | Tempo.PatternOption<Tempo.Pattern>;
		/** patterns to help parse value */											layout: Layout | Tempo.PatternOption<Tempo.Pattern>;
		/** custom date aliases (events). */										event: Event | Tempo.PatternOption<Tempo.Logic>;
		/** custom time aliases (periods). */										period: Period | Tempo.PatternOption<Tempo.Logic>;
		/** custom format strings to merge in the FORMAT enum */formats: Property<any>;
		/** plugins to be automatically Extended via Tempo.extend() */plugins: Plugin | Plugin[];
		/** supplied value to parse */													value: Tempo.DateTime;
		/** @internal temporary anchor used during parsing */		anchor: Temporal.ZonedDateTime;
	}

	export type Options = Partial<BaseOptions> & Record<string, any>;

	/** define a new term plugin */
	export type TermPlugin = {
		key: string; scope?: string;
		description: string;
		define: (this: Tempo, keyOnly?: boolean) => any
	}

	/** plugin function that can extend the Tempo prototype or static space */
	export type Plugin = (options: any, TempoClass: typeof Tempo, factory: (val: any) => Tempo) => void;

	/** internal metadata for a plugin to track installation */
	export interface PluginContainer extends Plugin {
		installed?: boolean;
	}

	/** the encapsulated state of a Tempo instance */
	export interface State {																	// 'global' and 'local' variables
		/** current defaults for all Tempo instances */					config: Tempo.Config;
		/** parsing rules */																		parse: Tempo.Parse;
	}

	/** Debugging results of a parse operation. See `doc/tempo.api.md`. */
	export interface Parse {
		/** Locales which prefer 'mm-dd-yyyy' date-order */			mdyLocales: { locale: string, timeZones: string[] }[];
		/** Layout names that are switched to mdy */						mdyLayouts: Tempo.Pair[];
		/** is a timeZone that prefers 'mmddyyyy' date order */	isMonthDay?: boolean;
		/** Symbol registry */																	token: Token;
		/** Tempo snippets to aid in parsing */									snippet: Snippet;
		/** Tempo layout strings */															layout: Layout;
		/** Map of regex-patterns to match input-string */			pattern: Tempo.Registry;
		/** configured Events */																event: Event;
		/** configured Periods */																period: Period;
		/** pivot year for two-digit years */										pivot?: number;
		/** parsing match result */															result: Tempo.Match[];
	}

	/** debug a Tempo instantiation */
	export interface Match {
		/** pattern which matched the input */									match?: string | undefined;
		/** groups from the pattern match */										groups?: Tempo.Groups;
		/** the type of the original input */										type: LooseUnion<Type>;
		/** the value of the original input */									value: any;
		/** was this a nested/anchored parse? */								isAnchored?: boolean;
	}

	/** drop the parse-only Options */
	type OptionsKeep = Omit<BaseOptions, "mdyLocales" | "mdyLayouts" | "pivot" | "snippet" | "layout" | "event" | "period" | "value">

	/** Instance configuration derived from supply, storage, and discovery. */
	export interface Config extends Required<Omit<OptionsKeep, "formats">> {
		/** configuration (global | local) */										scope: 'global' | 'local';
		/** pre-configured format strings */										formats: Format;
		[key: string]: any;
	}

	/** Timestamp precision */
	export type TimeStamp = 'ss' | 'ms' | 'us' | 'ns'

	/** structured configuration for Global Discovery via Symbol.for('$Tempo') */
	export interface Discovery {
		/** pre-defined config options for Tempo.#global */			options?: Options | (() => Options);
		/** aliases to merge in the TimeZone dictionary */			timeZones?: Record<string, string>;
		/** aliases to merge in the Number-Word dictionary */		numbers?: Record<string, number>;
		/** term plugins to be registered via Tempo.addTerm() */terms?: TermPlugin | TermPlugin[];
		/** plugins to be automatically extended via Tempo.extend() */plugins?: Plugin | Plugin[];
		/** custom format strings to merge in the FORMAT dictionary */formats?: Property<any>;
	}

	/** Configuration to use for #until() and #since() argument */
	export type Unit = Temporal.DateUnit | Temporal.TimeUnit | Plural<Temporal.DateUnit | Temporal.TimeUnit>
	export type Until = (Tempo.Options & { unit?: Tempo.Unit }) | Tempo.Unit
	export type Mutate = 'start' | 'mid' | 'end'
	export type Set = Partial<Record<Mutate, Unit> &
		Record<'date' | 'time' | 'event' | 'period', string> &
	{ timeZone?: Temporal.TimeZoneLike; calendar?: Temporal.CalendarLike }>
	export type Add = Partial<Record<Tempo.Unit, number>>

	/** pre-configured format strings */
	export type OwnFormat = enums.OwnFormat;

	/** mapping of format names to instance-resolutions (string | number) */
	export type Formats = enums.Formats;

	/** Enum registry of format strings */
	export type Format = enums.FormatEnum;
	export type FormatType<K extends PropertyKey> = enums.FormatType<K>;

	/** mapping of terms to their resolved values */
	export type Terms = Property<any>;

	export type Modifier = '=' | '-' | '+' | '<' | '<=' | '-=' | '>' | '>=' | '+=' | 'this' | 'next' | 'prev' | 'last' | 'first' | undefined
	export type Relative = 'ago' | 'hence' | 'prior' | 'from now'

	export type mm = IntRange<0, 12>
	export type hh = IntRange<0, 24>
	export type mi = IntRange<0, 60>
	export type ss = IntRange<0, 60>
	export type ms = IntRange<0, 999>
	export type us = IntRange<0, 999>
	export type ns = IntRange<0, 999>
	export type ww = IntRange<1, 53>

	export type Duration = NonOptional<Temporal.DurationLikeObject> & Record<"iso", string> & Record<"sign", number> & Record<"blank", boolean> & Record<"unit", string | undefined>

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
	/** Type for consistency in expected arguments for helper functions */
	export type Params<T> = {
		(tempo?: Tempo.DateTime, options?: Tempo.Options): T;		// parse Tempo.DateTime, default to Temporal.Instance.now()
		(options: Tempo.Options): T;														// provide just the Tempo.Options (use {value:'XXX'} for specific Tempo.DateTime)
	}
}
// #endregion Tempo types / interfaces / enums

// #region Namespace that doesn't need to be shared externally
namespace Internal {
	export type GroupWkd = { wkd?: Tempo.WEEKDAY; mod?: Tempo.Modifier; nbr?: string; sfx?: Tempo.Relative; afx?: Tempo.Relative; hh?: string; mi?: string; ss?: string; ms?: string; us?: string; ns?: string; ff?: string; mer?: string; }
	export type GroupDate = { mod?: Tempo.Modifier; nbr?: string; afx?: Tempo.Relative; unt?: string; yy?: string; mm?: string; dd?: string; }
	export type GroupModifier = { mod?: Tempo.Modifier | Tempo.Relative, adjust: number, offset: number, period: number }
}

// #endregion Namespace

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tempo.init();																								// initialize default global configuration

type Fmt = {																								// used for the fmtTempo() shortcut
	<F extends string>(fmt: F, tempo?: Tempo.DateTime, options?: Tempo.Options): enums.FormatType<F>;
	<F extends string>(fmt: F, options: Tempo.Options): enums.FormatType<F>;
}

// shortcut functions to common Tempo properties / methods
/** check valid Tempo */			export const isTempo = (tempo?: unknown) => isType<Tempo>(tempo, 'Tempo');
/** current timestamp (ts) */	export const getStamp = ((tempo, options) => new Tempo(tempo, options).ts) as Tempo.Params<number | bigint>;
/** create new Tempo */				export const getTempo = ((tempo, options) => new Tempo(tempo, options)) as Tempo.Params<Tempo>;
/** format a Tempo */					export const fmtTempo = ((fmt, tempo, options) => new Tempo(tempo, options).format(fmt)) as Fmt;
