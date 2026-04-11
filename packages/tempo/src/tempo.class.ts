import '#library/temporal.polyfill.js';

import { Logify } from '#library/logify.class.js';
import { secure } from '#library/utility.library.js';
import { Immutable, Serializable } from '#library/class.library.js';
import { asArray, asInteger, isNumeric, ifNumeric } from '#library/coercion.library.js';
import { getStorage, setStorage } from '#library/storage.library.js';
import { proxify, delegate } from '#library/proxy.library.js';
import { $Logify, $Discover, markConfig } from '#library/symbol.library.js';
import { getContext, CONTEXT } from '#library/utility.library.js';
import { enumify } from '#library/enumerate.library.js';
import { ownKeys, ownEntries, getAccessors, omit } from '#library/reflection.library.js';
import { pad, singular, trimAll } from '#library/string.library.js';
import { getType, asType, isEmpty, isNull, isNullish, isDefined, isUndefined, isString, isObject, isRegExp, isRegExpLike, isIntegerLike, isSymbol, isFunction, isClass, isTemporal, isZonedDateTime } from '#library/type.library.js';
import { getHemisphere, getResolvedOptions, canonicalLocale } from '#library/international.library.js';
import { instant } from '#library/temporal.library.js';
import type { Property, TypeValue, Secure } from '#library/type.library.js';

import { compose } from './plugins/module/module.composer.js';
import { prefix, parseWeekday, parseDate, parseTime, parseZone } from './plugins/module/module.lexer.js';
import { REGISTRY, registerPlugin, registerTerm, getRange, getTermRange, resolveTermShift, interpret } from './plugins/plugin.util.js'

import { getSafeFallbackStep } from './tempo.util.js'
import { $Register, $Tempo, $Plugins, $isTempo, isTempo, registerHook, $Interpreter, $logError, $logDebug } from './tempo.symbol.js';
import { Match, Token, Snippet, Layout, Event, Period, Default } from './tempo.default.js';
import enums, { STATE, DISCOVERY, NumericPattern, registryUpdate, registryReset } from './tempo.enum.js';
import * as t from './tempo.type.js';												// namespaced types (Tempo.*)

const Context = getContext();																// current execution context

namespace Internal {
	export type State = t.Internal.State;
	export type Parse = t.Internal.Parse;
	export type Match = t.Internal.Match;
	export type Config = t.Internal.Config;
	export type Discovery = t.Internal.Discovery;
	export type Registry = t.Internal.Registry;
	export type PluginContainer = t.Internal.PluginContainer;


	export type Fmt = {																					// used for the fmtTempo() shortcut
		<F extends string>(fmt: F, tempo?: t.DateTime, options?: t.Options): t.FormatType<F>;
		<F extends string>(fmt: F, options: t.Options): t.FormatType<F>;
	}
}

/**
 * # Tempo
 * A powerful wrapper around `Temporal.ZonedDateTime` for flexible parsing and intuitive manipulation of date-time objects.
 * Bridges the gap between raw string/number inputs and the strict requirements of the ECMAScript Temporal API.
 */

@Serializable
@Immutable
export class Tempo {
	/** Weekday names (short-form) */													static get WEEKDAY() { return enums.WEEKDAY }
	/** Weekday names (long-form) */													static get WEEKDAYS() { return enums.WEEKDAYS }
	/** Month names (short-form) */														static get MONTH() { return enums.MONTH }
	/** Month names (long-form) */														static get MONTHS() { return enums.MONTHS }
	/** Time durations as seconds (singular) */								static get DURATION() { return enums.DURATION }
	/** Time durations as milliseconds (plural) */						static get DURATIONS() { return enums.DURATIONS }

	/** Quarterly Seasons */																	static get SEASON() { return enums.SEASON }
	/** Compass cardinal points */														static get COMPASS() { return enums.COMPASS }

	/** Tempo to Temporal DateTime Units map */								static get ELEMENT() { return enums.ELEMENT }
	/** Pre-configured format {name -> string} pairs */				static get FORMAT() { return enums.FORMAT }
	/** Number names (0-10) */																static get NUMBER() { return enums.NUMBER }
	/** TimeZone aliases */																		static get TIMEZONE() { return enums.TIMEZONE }
	/** initialization strategies */													static get MODE() { return enums.MODE }
	/** some useful Dates */																	static get LIMIT() { return enums.LIMIT }

	/** check if Tempo is currently initializing */						static get isInitializing() { return Tempo.#lifecycle.extendDepth > 0 || !Tempo.#lifecycle.ready }
	/** check if Tempo is currently extending */							static get isExtending() { return Tempo.#lifecycle.extendDepth > 0 }


	static #dbg = new Logify('Tempo', {
		debug: Default?.debug ?? false,
		catch: Default?.catch ?? false
	})

	/** handle internal errors using the global config */
	static [$logError](...msg: any[]) {
		const config = (isObject(msg[0]) && (msg[0] as any)[$Logify] === true) ? msg.shift() : Tempo.#global.config;
		markConfig(config);														// ensure config is marked for Logify
		Tempo.#dbg.error(config, ...msg);
	}

	/** handle internal debug info using the global config */
	static [$logDebug](...msg: any[]) {
		Tempo.#dbg.debug(...msg);
	}

	/** a collection of parse rule-matches */									#matches: Internal.Match[] | undefined;

	/** Tempo state for the global configuration */						static #global = {} as Internal.State
	/** cache for next-available 'usr' Token key */						static #usrCount = 0;
	/** guard against infinite mutation recursion */					static #mutateDepth = 0;
	/** mutable list of registered term plugins */						static #terms: Tempo.TermPlugin[] = REGISTRY.terms;
	/** current parsing depth to manage state isolation */		#parseDepth = 0;
	/** mapping of terms to their resolved values */					static #termMap: Map<string, Tempo.TermPlugin> = new Map();
	/** flag to prevent recursion during init */							static #lifecycle = { bootstrap: true, initialising: false, extendDepth: 0, ready: false };
	/** Master Guard predicate (implements RegExp-like interface) */					static #guard: { test(str: string): boolean } = { test: () => true };
	/** Set of allowed lowercased tokens for the Master Guard */					static #allowedTokens: Set<string> = new Set();

	//** prototype helpers */
	/** return the Prototype parent of an object */						static #proto(obj: object) { return Object.getPrototypeOf(obj) }
	/** test object has own property with the given key */		static #hasOwn(obj: object, key: string) { return Object.hasOwn(obj, key) }
	/** return whether the shape is 'local' or 'global' */		static #isLocal(shape: Internal.State) { return shape.config.scope === 'local' }
	/** create an object based on a prototype */							static #create<T extends object>(obj: object, name: string): T { return Object.create(Tempo.#proto(obj)[name]) }

	/**
	 * {dt} is a layout that combines date-related {snippets} (e.g. dd, mm -or- evt) into a pattern against which a string can be tested.  
	 * because it will also include a list of events (e.g. 'new_years' | 'xmas'), we need to rebuild {dt} if the user adds a new event
	 */
	// TODO:  check all Layouts which reference "{evt}" and update them
	static #setEvents(shape: Internal.State) {
		const events = ownEntries(shape.parse.event, true);
		if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.parse, 'event') && !Tempo.#hasOwn(shape.parse, 'isMonthDay'))
			return;																					// no local change needed

		const src = shape.config.scope.substring(0, 1);							// 'g'lobal or 'l'ocal
		const groups = events
			.map(([pat, _], idx) => `(?<${src}evt${idx}>${pat})`)	// assign a number to the pattern
			.join('|')																				// make an 'Or' pattern for the event-keys

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
	static #setPeriods(shape: Internal.State) {
		const periods = ownEntries(shape.parse.period, true);
		if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.parse, 'period'))
			return;																							// no local change needed

		const src = (shape.config.scope ?? "global").substring(0, 1);				// 'g'lobal or 'l'ocal
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
	static #setSphere = (shape: Internal.State, options: Tempo.Options) => {
		if (isUndefined(shape.config.timeZone) || Tempo.#hasOwn(options, 'sphere'))
			return shape.config.sphere;													// already specified or no timeZone to calculate from

		const tz = shape.config.timeZone as string;
		const sphere = getHemisphere(tz);
		if (tz.toLowerCase() === 'utc' || !sphere) return undefined;

		return isDefined(options.timeZone) ? (sphere ?? 'north') : (sphere ?? shape.config.sphere ?? 'north');
	}

	/** determine if we have a {timeZone} which prefers {mdy} date-order */
	static #isMonthDay(shape: Internal.State) {
		const monthDay = [...asArray(Tempo.#global.parse.mdyLocales)];

		if (Tempo.#isLocal(shape) && Tempo.#hasOwn(shape.parse, 'mdyLocales'))
			monthDay.push(...shape.parse.mdyLocales);						// append local mdyLocales (not overwrite global)

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
	static #swapLayout(shape: Internal.State) {
		const layouts = ownEntries(shape.parse.layout);				// get entries of Layout Record
		const swap = shape.parse.mdyLayouts;										// get the swap-tuple
		let chg = false;																				// no need to rebuild, if no change

		swap
			.forEach(([dmy, mdy]) => {														// loop over each swap-tuple
				const idx1 = layouts.findIndex(([key]) => (key as symbol).description === dmy);	// 1st swap element exists in {layouts}
				const idx2 = layouts.findIndex(([key]) => (key as symbol).description === mdy);	// 2nd swap element exists in {layouts}

				if (idx1 === -1 || idx2 === -1)
					return;																					// no pair to swap

				const swap1 = (idx1 < idx2) && shape.parse.isMonthDay;	// we prefer {mdy} and the 1st tuple was found earlier than the 2nd
				const swap2 = (idx1 > idx2) && !shape.parse.isMonthDay;	// we dont prefer {mdy} and the 1st tuple was found later than the 2nd

				if (swap1 || swap2) {															// since {layouts} is an array, ok to swap by-reference
					[layouts[idx1], layouts[idx2]] = [layouts[idx2], layouts[idx1]];
					chg = true;
				}
			})

		if (chg)
			shape.parse.layout = Object.fromEntries(layouts) as Layout;	// rebuild Layout in new parse order
	}

	// Modular parsing helpers moved to #tempo/plugins/module/lexer.ts

	/** get first Canonical name of a supplied locale */
	static #locale = (locale?: string) => {
		let language: string | undefined;

		try {																									// lookup locale
			language = canonicalLocale(locale!);
		} catch (error) { }																		// catch unknown locale

		const global = Context.global;

		return language ??
			global?.navigator?.languages?.[0] ??									// fallback to current first navigator.languages[]
			global?.navigator?.language ??												// else navigator.language
			Default.locale ??																		// else default locale
			locale																								// cannot determine locale
	}

	/**
	 * conform input of Snippet / Layout / Event / Period options  
	 * This is needed because we allow the user to flexibly provide detail as {[key]:val} or {[key]:val}[] or [key,val][]  
	 */
	static #setConfig(shape: Internal.State, ...options: Tempo.Options[]) {

		const mergedOptions: Tempo.Options = Object.assign({}, ...options);

		if (shape === Tempo.#global)																// sanitize global configuration
			omit(mergedOptions, 'value', 'anchor', 'result');

		if (isEmpty(mergedOptions))																	// nothing to do
			return;

		if (mergedOptions.store)																		// check for local-storage
			Object.assign(mergedOptions, { ...Tempo.readStore(mergedOptions.store), ...mergedOptions });

		/** helper to normalize snippet/layout Options into the target Config */
		const collect = (target: Property<any>, value: any, convert: (v: any) => any) => {
			const itm = asType(value);
			target ??= {}

			switch (itm.type) {
				case 'Object':
					ownEntries(itm.value as Property<any>)
						.forEach(([k, v]) => target[Tempo.getSymbol(k)] = convert(v));
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

					case 'timeZone': {
						const zone = String(arg.value).toLowerCase() as t.TIMEZONE;
						Object.defineProperty(shape.config, 'timeZone', { value: enums.TIMEZONE[zone] ?? arg.value, writable: true, configurable: true, enumerable: true });
						break;
					}

					case 'formats':
						if (Tempo.#isLocal(shape) && !Tempo.#hasOwn(shape.config, 'formats'))
							shape.config.formats = shape.config.formats.extend({}) as Tempo.FormatRegistry;	// shadow parent prototype

						if (isObject(arg.value))
							shape.config.formats = shape.config.formats.extend(arg.value as Property<any>) as Tempo.FormatRegistry;
						break;

					case 'discovery':
						Object.defineProperty(shape.config, 'discovery', { value: isSymbol(optVal) ? Symbol.keyFor(optVal) as string : optVal, writable: true, configurable: true, enumerable: true });
						break;

					case 'plugins':
						asArray(optVal).forEach(p => this.extend(p));
						break;

					case 'mode':
						shape.parse.mode = optVal as any;
						shape.parse.lazy = (optVal === Tempo.MODE.Defer);	// if defer, set lazy true. if strict, set lazy false. if auto, constructor will decide.
						break;

					case 'anchor':
						break;																					// internal anchor used for relativity parsing

					default:																					// else just add to config
						Object.defineProperty(shape.config, optKey, { value: optVal, writable: true, configurable: true, enumerable: true });
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
	static #setDiscovery(shape: Internal.State, key: string | symbol = shape.config.discovery ?? $Tempo) {
		const sym = isString(key) ? Symbol.for(key) : key;
		const discovery = (globalThis as Record<symbol, any>)[sym] as Internal.Discovery;
		if (!isObject(discovery)) return {}

		markConfig(discovery);																// auto-mark the discovery object

		// 1. Process TimeZones (normalize to lowercase for lookup)
		if (discovery.timeZones) {
			const tzs = Object.fromEntries(
				ownEntries(discovery.timeZones, true).map(([k, v]) => [String(k).toLowerCase(), v])
			);
			registryUpdate('TIMEZONE', tzs);
		}

		// 1b. Process Numbers
		if (discovery.numbers)
			registryUpdate('NUMBER', discovery.numbers);

		// 2. Process Terms
		if (discovery.terms)
			this.extend(asArray(discovery.terms));

		// 3. Process Formats
		if (discovery.formats) {
			shape.config.formats = shape.config.formats.extend(discovery.formats) as Tempo.FormatRegistry;
			registryUpdate('FORMAT', discovery.formats);
		}

		// 4. Process Plugins
		if (discovery.plugins)
			asArray(discovery.plugins).forEach(p => this.extend(p));

		// 4. Process Options
		let opts = discovery.options || {}
		return isFunction(opts) ? opts() : opts;
	}

	/** build RegExp patterns */
	static #setPatterns(shape: Internal.State) {
		const snippet = shape.parse.snippet;

		// 1. ensure numeric snippets are current
		const keys = Object.keys(enums.NUMBER).map(w => Match.escape(w));			// escape each key
		const nbr = new RegExp(`(?<nbr>[0-9]+|${keys.sort((a, b) => b.length - a.length).join('|')})`);
		snippet[Token.nbr] = nbr;
		snippet[Token.mod] = new RegExp(`((?<mod>${Match.modifier.source})?${nbr.source}? *)`);
		snippet[Token.afx] = new RegExp(`((s)? (?<afx>${Match.affix.source}))?${snippet[Token.sep].source}?`);

		// ensure we have our own Map to mutate (shadow if local)
		if (!Tempo.#hasOwn(shape.parse, 'pattern'))
			shape.parse.pattern = new Map(shape.parse.pattern);							// preserve inherited entries while shadowing

		const layouts = { ...shape.parse.layout };										// shallow-copy to include inherited properties
		for (const [sym, layout] of ownEntries(layouts, true)) {
			const reg = Tempo.regexp(layout, snippet);
			shape.parse.pattern.set(sym, reg);											// merge/update compiled RegExp
		}

		if (shape === Tempo.#global)
			Tempo.#buildGuard();															// build the high-performance 'Master Guard' ONLY for global changes
	}

	static #buildGuard() {
		// Tempo.#dbg.error(Tempo.#global.config, 'Building Guard...');
		const wordsList = [
			...ownKeys(enums.NUMBER),
			...ownKeys(enums.WEEKDAY),
			...ownKeys(enums.WEEKDAYS),
			...ownKeys(enums.MONTH),
			...ownKeys(enums.MONTHS),
			...ownKeys(enums.DURATION),
			...ownKeys(enums.DURATIONS),
			...ownKeys(enums.TIMEZONE),
			...ownKeys(Tempo.#global.parse.event),
			...ownKeys(Tempo.#global.parse.period),
			...ownKeys(Tempo.#global.parse.snippet),
			...ownKeys(Tempo.#global.parse.layout),
			...Tempo.#terms.map(t => t.key),
			...Tempo.#terms.map(t => t.scope),
			'am', 'pm', 'ago', 'hence', 'this', 'next', 'prev', 'last', 'from', 'now', 'today', 'yesterday', 'tomorrow', 'start', 'mid', 'end',
			'year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond',
			'years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds',
			'mondays', 'tuesdays', 'wednesdays', 'thursdays', 'fridays', 'saturdays', 'sundays'
		].filter(w => isString(w) || isSymbol(w))
			.map(w => (isSymbol(w) ? w.description : (w as string))!.toLowerCase())
			.filter(Boolean);

		Tempo.#allowedTokens = new Set(wordsList);

		let maxT = 0;
		for (const w of wordsList) if (w.length > maxT) maxT = w.length;
		const maxTokenLength = maxT;

		// Define the custom guard logic (Scan-and-Consume)
		Tempo.#guard = {
			test(input: string): boolean {
				if (!input || typeof input !== 'string') return false;

				let i = 0;
				const len = input.length;

				while (i < len) {
					const char = input[i];

					// 1. Skip spaces
					if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
						i++;
						continue;
					}

					// 2. Try Bracket match (starts with [)
					if (char === '[') {
						const sub = input.substring(i);
						const match = sub.match(Match.bracket);
						if (match && match.index === 0) {
							i += match[0].length;
							continue;
						}
					}

					// 3. Try Longest Token match from Set
					let matched = false;
					const searchLen = Math.min(maxTokenLength, len - i);
					const slice = input.substring(i, i + searchLen).toLowerCase();

					for (let l = searchLen; l > 0; l--) {
						if (Tempo.#allowedTokens.has(slice.substring(0, l))) {
							i += l;
							matched = true;
							break;
						}
					}
					if (matched) continue;

					// 4. Try Fallback char (Match.guard)
					if (Match.guard.test(char)) {
						i++;
						continue;
					}

					return false; // No valid match at current position
				}

				return true;
			}
		}
	}

	/**
	 * Unified loader for library extensions.
	 * 
	 * @param arg - A `Plugin` function, a `TermPlugin` object (or array), or a `Discovery` object.
	 * @param options - Optional configuration for a standard `Plugin`.
	 * @returns The `Tempo` class for chaining.
	 */
	static extend(plugin: t.Plugin | t.Plugin[], options?: any): typeof Tempo
	static extend(term: t.TermPlugin | t.TermPlugin[], discovery?: symbol): typeof Tempo
	static extend(config: t.Internal.Discovery | t.Internal.Discovery[], discovery?: symbol): typeof Tempo
	static extend(arg: any, options?: any) {
		const items = asArray(arg).flat(1);
		if (isEmpty(items)) return this;

		Tempo.#lifecycle.extendDepth++;													// increment the re-entrant nesting counter
		try {
			items.forEach(item => {
				const arg = item as any;
				if (isFunction(arg)) {		// Standard Plugin registration
					if ((arg as any).installed) return;
					(arg as any).installed = true;										// mark as installed (BEFORE side-effects)

					registerPlugin(arg);
					try {
						(arg as any)(options, this, (val: any) => new this(val));
					} catch (e: any) {
						const msg = (e?.message ?? '').toLowerCase();
						if (msg.includes('constructor') || msg.includes('class') || (e instanceof TypeError) || isClass(arg)) {
							Tempo.#dbg.warn(Tempo.#global.config, `Misidentified class in plugin registration: ${(arg as any).name}`, e.stack ?? e);
						} else {
							throw e;
						}
					}
				}
				else if (isObject(item)) {
					// 1. handle TermPlugin
					if (isString((item as any).key) && isFunction((item as any).define)) {
						const config = item as Tempo.TermPlugin;
						if (Tempo.#termMap.has(config.key)) return;

						Tempo.#terms.push(config);											// update registry (BEFORE side-effects)
						Tempo.#termMap.set(config.key, config);
						if (config.scope) Tempo.#termMap.set(config.scope, config);

						registerTerm(config);

						// 3. sync with parser registries
						if (config.scope && config.ranges) {
							const target = config.scope === 'period' ? Tempo.#global.parse.period : (config.scope === 'event' ? Tempo.#global.parse.event : undefined);
							if (target) {
								config.ranges.forEach(r => {
									if (r.key && !target[r.key]) {
										const val = isDefined(r.hour) ? `${r.hour}:${pad(r.minute ?? 0)}` : (r.month ? `${pad(r.day ?? 1)} ${Tempo.MONTH.keys()[r.month - 1]}` : undefined);
										if (val) target[r.key] = val;
									}
								});
								if (config.scope === 'period') Tempo.#setPeriods(Tempo.#global);
								if (config.scope === 'event') Tempo.#setEvents(Tempo.#global);
							}
						}
					}
					// 2. handle Discovery object (container)
					else {
						const discovery = item as any
						if (discovery.options) Tempo.#setConfig(Tempo.#global, discovery.options)
						if (discovery.plugins) this.extend(discovery.plugins, discovery.options)
						if (discovery.terms) this.extend(discovery.terms)

						// handle other discovery keys directly
						if (discovery.numbers) registryUpdate('NUMBER', discovery.numbers)
						if (discovery.timeZones) {
							const tzs = Object.fromEntries(ownEntries(discovery.timeZones).map(([k, v]) => [k.toString().toLowerCase(), v]));
							registryUpdate('TIMEZONE', tzs)
						}
						if (discovery.formats) {
							Tempo.#global.config.formats = Tempo.#global.config.formats.extend(discovery.formats) as Tempo.FormatRegistry;
							registryUpdate('FORMAT', discovery.formats)
						}

						// only trigger init if we're assigning a new discovery object to a symbol
						if (ownKeys(item).some(key => DISCOVERY.has(key as any))) {
							const discoverySymbol = (typeof options === 'symbol' ? options : options?.discovery) ?? $Tempo
							if ((globalThis as Record<symbol, any>)[discoverySymbol] !== item) {
								; (globalThis as Record<symbol, any>)[discoverySymbol] = item
								Tempo.#setConfig(Tempo.#global, { discovery: discoverySymbol })
							}
						}
					}
				}
			})
		} finally {
			Tempo.#lifecycle.extendDepth--;												// decrement the re-entrant nesting counter
		}

		if (Tempo.#lifecycle.extendDepth === 0) {
			Tempo.#setPatterns(Tempo.#global);										// rebuild the global patterns
		}

		return this;
	}

	/** Reset Tempo to its default, built-in registration state */
	static init(options: Tempo.Options = {}): typeof Tempo {
		if (Tempo.#lifecycle.initialising) return this;
		Tempo.#lifecycle.initialising = true;

		try {
			const { timeZone, calendar } = getResolvedOptions();

			// 1. Establish the base parsing state
			Tempo.#global.parse = markConfig({
				snippet: Object.assign({}, Snippet),
				layout: Object.assign({}, Layout),
				event: Object.assign({}, Event),
				period: Object.assign({}, Period),
				mdyLocales: Tempo.#mdyLocales(Default.mdyLocales as Tempo.Options['mdyLocales']),
				mdyLayouts: asArray(Default.mdyLayouts as Tempo.Options['mdyLayouts']) as Tempo.Pair[],
				pivot: Default.pivot,
				mode: Default.mode as any,
				lazy: false,
			}) as Internal.Parse;

			// 2. Establish the base configuration options
			Tempo.#global.config = markConfig(Object.create(Default));
			Object.defineProperties(Tempo.#global.config, {
				calendar: { value: calendar, enumerable: true, writable: true, configurable: true },
				timeZone: { value: timeZone, enumerable: true, writable: true, configurable: true },
				locale: { value: Tempo.#locale(), enumerable: true, writable: true, configurable: true },
				discovery: { value: Symbol.keyFor($Tempo) as string, enumerable: true, writable: true, configurable: true },
				formats: { value: enumify(STATE.FORMAT, false), enumerable: true, writable: true, configurable: true },
				sphere: { value: undefined, enumerable: true, writable: true, configurable: true },
				get: { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true },
				scope: { value: 'global', enumerable: true, writable: true, configurable: true },
				catch: { value: options.catch ?? false, enumerable: true, writable: true, configurable: true }
			});

			Tempo.#usrCount = 0;																	// reset user-key counter
			for (const key of Object.keys(Token))									// purge user-allocated Tokens
				if (key.startsWith('usr.'))													// only remove 'usr.' prefixed keys
					delete Token[key];

			Tempo.#terms = [];																		// clear registered terms
			Tempo.#termMap.clear();																// clear term lookup map
			registryReset();																			// purge formats and numbers

			const discoveryKey = options.discovery ?? Symbol.keyFor($Tempo) as string;
			const storeKey = Symbol.keyFor($Tempo) as string;

			Tempo.#setConfig(Tempo.#global,
				{ store: storeKey, discovery: storeKey, scope: 'global' },
				Tempo.readStore(storeKey),													// allow for storage-values to overwrite
				Tempo.#setDiscovery(Tempo.#global, $Plugins),				// persistent library extensions
				Tempo.#setDiscovery(Tempo.#global, discoveryKey),		// user Discovery (Configuration bootstrapping)
				options,																						// explicit options from the call
			)

			if (options.plugins) this.extend(options.plugins);		// ensure init-plugins are processed before 'ready'

			if (Context.type === CONTEXT.Browser || options.debug === true)
				Tempo.#dbg.info(Tempo.config, 'Tempo:', Tempo.#global.config);

			Tempo.#lifecycle.ready = true;
			Tempo.#setPatterns(Tempo.#global);										// rebuild the global patterns (Master Guard etc)

		} finally {
			Tempo.#lifecycle.initialising = false;
			Tempo.#lifecycle.bootstrap = false;
		}

		return this
	}

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
			const usr = `usr.${++Tempo.#usrCount}`;							// allocate a prefixed 'user' key
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
			if (depth > 12) return isRegExp(str) ? str.source : str;	// depth guard

			let source = isRegExp(str) ? str.source : str;

			if (isRegExpLike(source))														// string that looks like a RegExp
				source = source.substring(1, source.length - 1);		// remove the leading/trailing "/"
			if (source.startsWith('^') && source.endsWith('$'))
				source = source.substring(1, source.length - 1);		// remove the leading/trailing anchors (^ $)

			return source.replaceAll(new RegExp(Match.braces), (match, name) => {	// iterate over "{}" pairs in the source string
				const token = Tempo.getSymbol(name);								// get the symbol for this {name}
				const customs = snippet?.[token as keyof Snippet]?.source ?? snippet?.[name as keyof Snippet]?.source;
				const globals = Tempo.#global.parse.snippet[token as keyof Snippet]?.source ?? Tempo.#global.parse.snippet[name as keyof Snippet]?.source;
				const layout = Layout[token as keyof Layout];			// get resolution source (layout)

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
					: matcher(res, depth + 1);												// else recurse to see if snippet contains embedded "{}" pairs
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
		const out = Object.create(Default);
		const descriptors = omit(Object.getOwnPropertyDescriptors(Tempo.#global.config), 'value', 'anchor');

		Object.defineProperties(out, descriptors);
		Object.defineProperty(out, 'toJSON',										// bare-bones: only show global overrides
			{
				value: () => Object.fromEntries(
					Object.entries(out)),															// proxify sees own toJSON, skips allObject
				enumerable: false, configurable: true
			});
		return proxify(out);
	}

	/** global discovery configuration */
	static #getConfig(sym: symbol) {
		const discovery = (globalThis as Record<symbol, any>)[sym];
		return proxify(omit({ ...discovery, scope: 'discovery' }, 'value'));
	}

	/** global discovery configuration */
	static get discovery() {
		const discovery = this.config.discovery;
		const sym = isString(discovery) ? Symbol.for(discovery) : discovery;
		return Tempo.#getConfig(sym);
	}

	static get options() {
		const keyFor = this.config.store ?? Symbol.keyFor($Tempo) as string;
		const storage = proxify(Object.assign({ key: keyFor, scope: 'storage' }, omit(Tempo.readStore(keyFor), 'value')));
		return Object.assign({}, this.default, storage, this.discovery, this.config);
	}

	/** Creates a new `Tempo` instance. */
	static from(options?: Tempo.Options): Tempo;
	static from(tempo: Tempo.DateTime | undefined, options?: Tempo.Options): Tempo;
	static from(tempo?: Tempo.DateTime | Tempo.Options, options?: Tempo.Options) { return new this(tempo as NonNullable<Tempo.DateTime>, options); }

	static now() { return instant().epochNanoseconds; }
	/** get the current system Instant */
	static get instant() { return Temporal.Instant.fromEpochNanoseconds(this.now()) }

	/** static Tempo.terms (registry) */
	static get terms(): Secure<Omit<Tempo.TermPlugin, 'define'>[]> {
		return secure(Tempo.#terms
			.map(({ define, ...rest }) => rest));								// omit the 'define' method
	}

	/** static Tempo.formats (registry) */
	static get formats() {
		return Tempo.config.formats;
	}

	/** static Tempo properties getter */
	static get properties(): Secure<string[]> {
		return secure(getAccessors(Tempo)
			.filter(acc => getType(acc) !== 'Symbol') as string[]);	// omit any Symbol properties
	}

	/** Tempo initial default settings */
	static get default() {
		return Object.freeze({ ...Default, scope: 'default', timeZone: Default.timeZone || enums.TIMEZONE.utc });
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
		}) as Internal.Parse;
	}

	/** iterate over Tempo properties */
	static [Symbol.iterator]() {
		return Tempo.properties[Symbol.iterator]();							// static Iterator over array of 'getters'
	}

	/** release global config and reset library to defaults */
	static [Symbol.dispose]() { Tempo.init() }

	/** allow instanceof to work across module boundaries via the local brand symbol */
	static [$isTempo] = true;
	static [Symbol.hasInstance](instance: any) {
		return !!(instance?.[$isTempo])
	}

	/** allow for auto-convert of Tempo to BigInt, Number or String */
	[Symbol.toPrimitive](hint?: 'string' | 'number' | 'default') {
		// Tempo.#dbg.info(this.config, getType(this), '.hint: ', hint);
		switch (hint) {
			case 'string': return this.toString();								// ISO 8601 string
			case 'number': return this.epoch.ms;									// Unix epoch (milliseconds)
			default: return this.nano;														// Unix epoch (nanoseconds)
		}
	}

	/** iterate over instance formats */
	[Symbol.iterator]() {
		return ownEntries(this.#fmt, true)[Symbol.iterator]();	// instance Iterator over tuple of FormatType[]
	}

	get [Symbol.toStringTag]() {															// default string description
		return 'Tempo';																					// hard-coded to avoid minification mangling
	}

	get [$isTempo]() { return true }

	/** constructor tempo */																	#tempo?: Tempo.DateTime;
	/** constructor options */																#options = {} as Tempo.Options;
	/** instantiation Temporal Instant */											#now: Temporal.Instant;
	/** underlying Temporal ZonedDateTime */									#zdt!: Temporal.ZonedDateTime;
	/** indicator that the instance failed to parse */				#errored = false;
	/** temporary anchor used during parsing */								#anchor?: Temporal.ZonedDateTime | undefined;
	/** prebuilt formats, for convenience */									#fmt!: any;
	/** mapping of terms to their resolved values */					#term!: any;
	/** instance values to complement static values */				#local = {
		/** instance configuration */															config: { [$Logify]: true } as unknown as Internal.Config,
		/** instance parse rules (only populated if provided) */	parse: { result: [] as Internal.Match[] } as Internal.Parse
	} as Internal.State;

	/** Static initialization block to sequence the bootstrap phase */
	static {
		// Define the reactive register hook
		registerHook($Register, (plugin: Tempo.Plugin | Tempo.Plugin[]) => { if (!Tempo.isExtending) Tempo.extend(plugin) });

		Tempo.init();																					// synchronously initialize the library
	}

	/**
	 * Instantiates a new `Tempo` object.
	 * 
	 * @param tempo - The date-time value to parse. Can be a string, number, BigInt, Date, or another Tempo/Temporal object.
	 * @param options - Configuration options for this specific instance.
	 */
	constructor(options?: Tempo.Options);
	constructor(tempo: Tempo.DateTime, options?: Tempo.Options);
	constructor(tempo?: Tempo.DateTime | Tempo.Options, options: Tempo.Options = {}) {
		this.#now = instant();																	// stash current Instant
		[this.#tempo, this.#options] = this.#swap(tempo, options);	// swap arguments around
		this.#setLocal(this.#options);													// parse local options

		const { mode } = this.#local.parse;
		const input = String(this.#tempo ?? '');

		// 🏛️ Initialization Strategy ('auto' | 'strict' | 'defer')
		if (mode === Tempo.MODE.Defer) this.#local.parse.lazy = true;
		else if (mode === Tempo.MODE.Strict) this.#local.parse.lazy = false;
		else if (!isEmpty(input) && Tempo.#guard.test(trimAll(input))) {
			this.#local.parse.lazy = true;												// auto-switch to lazy-mode for valid strings
		}

		this.#fmt = this.#setDelegator('fmt');									// initialize the format-delegator
		this.#term = this.#setDelegator('term');								// initialize the term-delegator
		this.#anchor = this.#options.anchor;

		if (!this.#local.parse.lazy) this.#ensureParsed();			// attempt to interpret immediately (if not lazy)
	}

	/** Ensure the instance has been parsed (for deferred execution) */
	#ensureParsed() {
		if (this.#zdt) return;
		try {
			this.#zdt = this.#parse(this.#tempo as Tempo.DateTime, this.#anchor);
			secure(this.#local.config);
			const skip = [this.#local.parse.format, this.#local.parse.term].filter(v => v !== undefined);
			secure(this.#local.parse, new WeakSet(skip as any));
		} catch (err) {
			const msg = `Cannot create Tempo: ${(err as Error).message}\n${(err as Error).stack}`;
			if (this.#local.config.catch === true) {
				Tempo.#dbg.warn(this.#local.config, msg);					// log as warning if in catch-mode
			} else {
				Tempo.#dbg.error(this.#local.config, err, msg);		// log as error then re-throw
				throw err;
			}
		}
	}

	#setLazy(target: any, name: PropertyKey | undefined, define: (keyOnly: boolean) => any, isKeyOnly = false) {
		if (isDefined(name) && isDefined(define)) {
			const desc = Object.getOwnPropertyDescriptor(target, name);
			if (desc) return ('value' in desc) ? () => desc.value : desc.get;
			let guard = false;
			let memo: any;
			let set = false;

			const get = () => {
				if (guard) return undefined;												// recursion guard
				guard = true;
				try {
					if (!set) {
						try {
							memo = define.call(this, isKeyOnly);				// evaluate the property
						} catch (e: any) {
							const msg = (e?.message ?? '').toLowerCase();
							if (msg.includes('constructor') || msg.includes('class') || (e instanceof TypeError) || isClass(define)) {
								Tempo.#dbg.warn(this.#local.config, `Misidentified class in delegator evaluate: ${String(define)}`, e.stack ?? e);
								memo = define;
							} else {
								throw e;
							}
						}
						set = true;
						// Promote to own property on target for subsequent calls (memoization) if extensible
						if (Reflect.isExtensible(target))
							Object.defineProperty(target, name, { value: memo, enumerable: true, configurable: true, writable: false });
					}
					return memo;
				}
				finally { guard = false; }
			}

			// shadowing chain (only if extensible)
			if (Reflect.isExtensible(target))
				Object.defineProperty(target, name, { get, enumerable: true, configurable: true });
			// if (Reflect.isExtensible(target)) {
			// 	const shadow = Object.create(Object.getPrototypeOf(target));
			// 	Object.defineProperty(shadow, name, { get, enumerable: true, configurable: true });
			// 	Object.setPrototypeOf(target, shadow);
			// }

			return get;																						// return getter closure
		}
		return undefined;
	}

	/** create a Proxy-based delegator that registers lazy properties on-demand */
	#setDelegator(host: 'term' | 'fmt') {
		const target = Object.create(null);
		const proxy = delegate(target, (key) => {
			if (key === $Discover) return this.#discover(host, target);
			if (!isString(key)) return;

			// discovery phase
			if (host === 'fmt') {
				if (isDefined(this.#local.config.formats[key])) {
					return this.#setLazy(target, key, () => this.format(key as t.Format))?.();
				}
			} else {
				const term = Tempo.#termMap.get(key);
				if (term) {
					const isKeyOnly = term.key === key;
					const define = (keyOnly: boolean) => {
						try {
							const result = term.define.call(this, keyOnly);
							const res = Array.isArray(result) ? getTermRange(this, result, keyOnly) : result;
							return (typeof res === 'object' && res !== null) ? secure(res) : res;
						} catch (err: any) {
							if (err.message.includes('Class constructor')) {
								Tempo.#dbg.warn(this.#local.config, `Misidentified class in term definition: ${key}`, err.stack ?? err);
							} else {
								throw err;
							}
						}
						return undefined;
					};
					return this.#setLazy(target, key, define, isKeyOnly)?.();
				}
			}
		}, true);

		// Eager support during construction
		if (!this.#local.parse.lazy) this.#discover(host, target);

		return proxy;
	}

	#discover(host: 'term' | 'fmt', target: any) {
		if (!Tempo.#lifecycle.ready) return;
		if (host === 'fmt') {
			ownKeys(this.#local.config.formats).forEach(key => {
				if (isString(key)) this.#setLazy(target, key, () => this.format(key as t.Format));
			});
		} else {
			Tempo.#terms.forEach(term => {
				const define = (keyOnly: boolean, anchor?: any) => {
					try {
						const res = term.resolve ? term.resolve.call(this, anchor) : term.define.call(this, keyOnly, anchor);
						const out = (getTermRange(this, (Array.isArray(res) ? (res as any) : [res]), keyOnly, anchor) as any);
						return (typeof out === 'object' && out !== null) ? secure(out) : out;
					} catch (err: any) {
						if (err.message.includes('Class constructor')) {
							Tempo.#dbg.warn(this.#local.config, `Misidentified class in term discovery: ${term.key}`, err.stack ?? err);
						} else {
							throw err;
						}
					}
				};
				this.#setLazy(target, term.key, (isKey: boolean) => define(isKey, this.toDateTime()), true);
				if (term.scope) this.#setLazy(target, term.scope, (isKey: boolean) => define(isKey, this.toDateTime()), false);
			});
		}
	}

	/** 4-digit year (e.g., 2024) */													get yy() { return this.toDateTime().year }
	/** 4-digit ISO week-numbering year */										get yw() { return this.toDateTime().yearOfWeek }
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
	/** Temporal Calendar ID (e.g., 'iso8601' | 'gregory') */	get cal() { return this.toDateTime().calendarId }
	/** Unix timestamp (defaults to milliseconds) */					get ts() { return this.epoch[this.#local.config.timeStamp] }
	/** Short month name (e.g., 'Jan') */											get mmm() { return Tempo.MONTH.keyOf(this.toDateTime().month as Tempo.Month) }
	/** Full month name (e.g., 'January') */									get mon() { return Tempo.MONTHS.keyOf(this.toDateTime().month as Tempo.Month) }
	/** Short weekday name (e.g., 'Mon') */										get www() { return Tempo.WEEKDAY.keyOf(this.toDateTime().dayOfWeek as Tempo.Weekday) }
	/** Full weekday name (e.g., 'Monday') */									get wkd() { return Tempo.WEEKDAYS.keyOf(this.toDateTime().dayOfWeek as Tempo.Weekday) }
	/** ISO weekday number: Mon=1, Sun=7 */										get dow() { return this.toDateTime().dayOfWeek as Tempo.Weekday }
	/** Nanoseconds since Unix epoch (BigInt) */							get nano() { return this.toDateTime().epochNanoseconds }
	/** `true` if the underlying date-time is valid. */				get isValid() { this.#ensureParsed(); return isDefined(this.#zdt) && !this.#errored }
	/** current Tempo configuration */
	get config() {
		const base = Object.create(Default);										// Default → global overrides
		const gDesc = omit(Object.getOwnPropertyDescriptors(Tempo.#global.config), 'value');
		Object.defineProperties(base, gDesc);

		const out = Object.create(base);												// global → local overrides
		const lDesc = omit(Object.getOwnPropertyDescriptors(this.#local.config), 'value', 'anchor', 'mode', 'lazy');
		Object.defineProperties(out, lDesc);

		Object.defineProperties(out, {
			mode: { value: this.#local.parse.mode, enumerable: true, writable: true, configurable: true },
			lazy: { value: this.#local.parse.lazy, enumerable: true, writable: true, configurable: true },
			toJSON: {
				value: () => Object.fromEntries(										// bare-bones: only show local overrides
					Object.entries(out)),															// proxify sees own toJSON, skips allObject
				enumerable: false, configurable: true
			},
		});

		return proxify(out) as t.Internal.Config;
	}

	/** Instance-specific parse rules (merged with global) */
	get parse() {
		this.#ensureParsed();
		return this.#local.parse;
	}

	/** Object containing results from all term plugins */		get term() { return this.#term }
	/** Formatted results for all pre-defined format codes */	get fmt() { return this.#fmt }
	/** units since epoch */																	get epoch() {
		return secure({
			/** seconds since epoch */														ss: Math.trunc(this.toDateTime().epochMilliseconds / 1_000),
			/** milliseconds since epoch */												ms: this.toDateTime().epochMilliseconds,
			/** microseconds since epoch */												us: Number(this.toDateTime().epochNanoseconds / BigInt(1_000)),
			/** nanoseconds since epoch */												ns: this.toDateTime().epochNanoseconds,
		})
	}

	/**
	 * @Immutable class decorators wrap the class but leave internal lexical bindings pointing to the original, undecorated class.  
	 * To ensure new instances returned by instance methods are properly frozen,  
	 * we must instantiate internally from the decorated wrapper (which is bound to `this.constructor`)  
	 * rather than using `new Tempo(..)`.  
	 */
	/** @internal */																					get #Tempo() { return this.constructor as typeof Tempo; }

	format<K extends t.Format>(fmt: K) {
		this.#ensureParsed();
		return interpret(this, 'format', () => `{${String(fmt)}}`, fmt);
	}


	/** time duration until another date-time */							until(...args: any[]): any {
		this.#ensureParsed();
		return interpret(this, 'duration', undefined, 'until', ...args);
	}

	/** time elapsed since another date-time */								since(...args: any[]): any {
		this.#ensureParsed();
		return interpret(this, 'duration', undefined, 'since', ...args);
	}

	/** returns a new `Tempo` with specific duration added. */add(tempo?: Tempo.Add, options?: Tempo.Options) { this.#ensureParsed(); return this.#add(tempo, options); }
	/** returns a new `Tempo` with specific offsets. */				set(tempo?: Tempo.Set, options?: Tempo.Options) { this.#ensureParsed(); return this.#set(tempo, options); }
	/** returns a clone of the current `Tempo` instance. */		clone() { return new this.#Tempo(this, this.config) }

	/** returns the underlying Temporal.ZonedDateTime */
	toDateTime() {
		try {
			this.#ensureParsed();
			return this.#zdt ?? this.#now.toZonedDateTimeISO('UTC');
		} catch (err) {
			if (this.#local.config.catch === true) return this.#now.toZonedDateTimeISO('UTC');
			throw err;
		}
	}
	/** returns a Temporal.PlainDate representation */				toPlainDate() { return this.toDateTime().toPlainDate() }
	/** returns a Temporal.PlainTime representation */				toPlainTime() { return this.toDateTime().toPlainTime() }
	/** returns a Temporal.PlainDateTime representation */		toPlainDateTime() { return this.toDateTime().toPlainDateTime() }
	/** returns the underlying Temporal.Instant */						toInstant() { return this.toDateTime().toInstant() }

	/** the current system time localized to this instance. */toNow() { return this.#Tempo.instant.toZonedDateTimeISO(this.tz).withCalendar(this.cal) }
	/** the date-time as a standard `Date` object. */					toDate() { return new Date(this.toDateTime().round({ smallestUnit: enums.ELEMENT.ms }).epochMilliseconds) }
	/**ISO8601 string representation of the date-time. */
	toString() {
		return (this.isValid && !this.#errored)
			? this.toPlainDateTime().toString({ calendarName: 'never' })
			: String(this.#tempo ?? '');
	}

	/** Custom JSON serialization for `JSON.stringify`. */
	toJSON() { return { ...this.#local.config, value: this.toString() } }


	/** setup local 'config' and 'parse' rules (prototype-linked to global) */
	#setLocal(options: Tempo.Options = {}) {
		this.#local.config = markConfig(Object.create(Tempo.#global.config));
		Object.assign(this.#local.config, { scope: 'local' });

		this.#local.parse = markConfig(Object.create(Tempo.#global.parse));
		Object.defineProperty(this.#local.parse, 'result', {
			value: [...(options.result ?? [])],
			writable: true,
			enumerable: true,
			configurable: true
		});

		Tempo.#setConfig(this.#local, options);									// set #local config
	}

	/** parse DateTime input */
	#parse(tempo: Tempo.DateTime, dateTime?: Temporal.ZonedDateTime, term?: string): Temporal.ZonedDateTime {
		if (isNull(tempo)) {																		// fail-early
			this.#errored = true;
			return undefined as any;
		}

		this.#parseDepth++;
		const isRoot = this.#parseDepth === 1;
		if (isRoot) this.#matches = [];													// initialize match accumulator
		let today: Temporal.ZonedDateTime;

		try {
			const { config } = this.#local;
			const val = dateTime ?? this.#anchor ?? (isTempo(tempo) ? tempo.toDateTime() : (isZonedDateTime(tempo) ? tempo : undefined));
			const basis = isDefined(val) ? val : instant().toZonedDateTimeISO(config.timeZone);

			const tz = isTempo(basis) ? basis.tz : (isZonedDateTime(basis) ? basis.timeZoneId : config.timeZone);
			const cal = isTempo(basis) ? basis.cal : (isZonedDateTime(basis) ? basis.calendarId : config.calendar);

			today = isZonedDateTime(basis) ? basis : (isTempo(basis) ? (basis as any).toDateTime() : instant().toZonedDateTimeISO(tz).withCalendar(cal));

			if (term) {
				const ident = term.startsWith('#') ? term.slice(1) : term;
				const termObj = Tempo.#terms.find(t => t.key === ident || t.scope === ident);
				if (!termObj) throw new Error(`Unknown Term identifier: ${term}`);

				// 1. if input is numeric, resolve by index
				if (isNumeric(tempo as any)) {
					const list = getRange(termObj, this, today);
					const current = (getTermRange(this, list, false, today) as any);
					const isMultiCycle = isDefined(termObj.resolve) && list.some(r => r.year !== undefined);
					const itemsPerCycle = isMultiCycle ? list.length / 3 : list.length;
					const currentIdx = list.findIndex(r => r.key === current.key && (isMultiCycle ? r.year === current.year : true));

					const cycleOffset = isMultiCycle ? Math.floor(currentIdx / itemsPerCycle) * itemsPerCycle : 0;
					const targetIdx = cycleOffset + (Number(tempo) - 1);
					const item = list[targetIdx];

					if (item) {
						const range = (getTermRange(this, [item], false, today) as any);
						if (range?.start) return range.start.toDateTime().withTimeZone(tz).withCalendar(cal);
					}
					throw new RangeError(`Term index out of range: ${tempo} for ${term}`);
				}

				// 2. if input is the term identifier itself, resolve current range
				if (tempo === term) {
					const range = termObj.define.call(this, false, today);
					const list = isUndefined(range) ? [] : asArray(range as unknown) as t.Range[];
					const current = (getTermRange(this, list, false, today) as any);
					if (current?.start) return current.start.toDateTime().withTimeZone(tz).withCalendar(cal);
				}
			}

			try {
				// anchor successfully determined
			} catch (err) {
				Tempo.#dbg.error(this.#local.config, err, 'Anchor determination failed');
				return this.toNow();																// fallback to absolute now
			}

			const isAnchored = isDefined(dateTime) || isDefined(this.#anchor);
			const resolvingKeys = new Set<string>();
			const res = this.#conform(tempo, today, isAnchored, resolvingKeys);

			// re-fetch zone/cal as they may have been updated by brackets during #conform
			const { timeZone: tz2, calendar: cal2 } = this.#local.config;
			const targetTz = isString(tz2) ? tz2 : (tz2 as any).id ?? (tz2 as any).timeZoneId;
			const targetCal = isString(cal2) ? cal2 : (cal2 as any).id ?? (cal2 as any).calendarId;

			// results are now handled at the end of #parse via #matches
			if (!['Undefined', 'Void', 'Empty'].includes(res.type as string))
				Tempo.#dbg.debug(this.#local.config, 'parse', `{type: ${res.type}, value: ${res.value}}`);	// show what we're parsing


			const { dateTime: dt, timeZone } = compose(res, today, tz, targetTz, targetCal);
			dateTime = dt;
			if (timeZone && this.#local) this.#local.config.timeZone = timeZone;

			// Final adjustment to normalize timezone and calendar across all types
			if (dateTime && !this.#errored)
				dateTime = dateTime.withTimeZone(targetTz).withCalendar(targetCal);

			if (isRoot) {
				// results already handled above

				if (Reflect.isExtensible(this.#local.parse)) {
					// ensure 'result' array is present and append our discovered matches
					if (isUndefined(this.#local.parse.result)) {
						Object.defineProperty(this.#local.parse, 'result', {
							value: [...(this.#matches ?? [])],
							writable: true,
							enumerable: true,
							configurable: true
						});
					} else {
						this.#local.parse.result.push(...(this.#matches ?? []));
					}
				}
			}
		} finally {
			if (isRoot) this.#matches = undefined;
			this.#parseDepth--;
		}

		return dateTime;
	}

	/** resolve constructor / method arguments */
	#swap(tempo?: Tempo.DateTime | Tempo.Options, options: Tempo.Options = {}): [Tempo.DateTime | undefined, Tempo.Options] {
		if (isTempo(tempo)) {
			// preserve parse result history when creating new instance from an existing one
			return [tempo, { result: [...tempo.parse.result], ...options }];
		}
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

	#result(...rest: Partial<Internal.Match>[]) {
		const match = Object.assign({}, ...rest) as Internal.Match;	// collect all object arguments

		if (isDefined(this.#anchor) && !match.isAnchored)
			match.isAnchored = true;

		const res = this.#matches ?? this.#local.parse.result;
		if (isDefined(res) && !Object.isFrozen(res)) {
			if (!res.includes(match)) res.push(match);
		}
	}

	/** conform input to a Temporal.ZonedDateTime */
	#conform(tempo: Tempo.DateTime, dateTime: Temporal.ZonedDateTime, isAnchored = false, resolvingKeys = new Set<string>()): TypeValue<any> {
		const arg = asType(tempo);
		const { type, value } = arg;

		if (!isTemporal(dateTime)) {
			Tempo.#dbg.error(this.#local.config, new TypeError(`Sacred Anchor corrupted: ${String(value)}`));
			return arg;
		}

		let zdt = dateTime as any;


		if (this.#isZonedDateTimeLike(tempo)) {									// tempo is ZonedDateTime-ish object (throw away 'value' property)
			const { timeZone, calendar, value: _, ...options } = tempo as Tempo.Options;
			if (!isEmpty(options)) zdt = zdt.with(options as Temporal.ZonedDateTimeLikeObject);

			if (timeZone)
				if (isTemporal(zdt)) zdt = zdt.withTimeZone(timeZone);// optionally set timeZone
			if (calendar)
				zdt = zdt.withCalendar(calendar);										// optionally set calendar

			this.#result({ type: 'Temporal.ZonedDateTimeLike', value: zdt, match: 'Temporal.ZonedDateTimeLike' });

			return Object.assign(arg, {
				type: 'Temporal.ZonedDateTime',											// override {arg.type}
				value: zdt,
			})
		}

		if (type !== 'String' && type !== 'Number' && type !== 'Function' && type !== 'AsyncFunction') {
			this.#result(arg, { match: type });										// log the 'type' detected and return
			return arg;
		}

		if (isTempo(value)) {
			const res = (value as Tempo).toDateTime();
			this.#local.config.timeZone = res.timeZoneId;
			this.#local.config.calendar = res.calendarId;
			return Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: res });
		}

		if (isString(value)) {
			const trim = (value as string).trim();
			const guard = Tempo.#guard.test(trim);

			if (!guard) {
				const local = [...ownKeys(this.#local.parse.event), ...ownKeys(this.#local.parse.period)];
				const bypass = local.some(key => trim.toLowerCase().includes(String(key).toLowerCase()));
				if (!bypass) return arg;
			}
		}

		return this.#parseLayout(value as string | number, dateTime, isAnchored, resolvingKeys);
	}

	/** match a string or number against known layouts */
	#parseLayout(value: string | number, dateTime: Temporal.ZonedDateTime, isAnchored = false, resolvingKeys = new Set<string>()): TypeValue<any> {
		const arg = asType(value);
		const { type } = arg;
		const trim = (type === 'String') ? (value as string).trim() : value.toString();
		const resolving = new Set(resolvingKeys);

		if (resolving.size >= 100) {
			Tempo.#dbg.error(this.#local.config, new RangeError(`Infinite recursion detected in layout resolution for: ${String(value)}`));
			return arg;
		}

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
			if (Number.isNaN(value) || !Number.isFinite(value)) return arg;				// ignore NaN/Infinity
			if (trim.length <= 7) {																// cannot reliably interpret small numbers:  might be {ss} or {yymmdd} or {dmmyyyy}
				const msg = 'Cannot safely interpret number with less than 8-digits: use string instead';
				Tempo.#dbg.error(this.#local.config, new TypeError(msg));
				return arg;
			}
		}

		if (!isZonedDateTime(dateTime)) return arg;									// safety-check: cannot parse against a corrupted anchor

		let zdt = dateTime as any;
		const anchorTime = zdt.toPlainTime();
		const map = this.#local.parse.pattern;
		for (const [sym, pat] of map) {
			const groups = this.#parseMatch(pat, trim);						// determine pattern-match groups
			if (isEmpty(groups)) continue;												// no match, so skip this iteration

			const hasAlias = Object.keys(groups).some(k => k.includes('evt') || k.includes('per'));
			const isRootMatch = Object.keys(groups).some(k => k === 'dt' || k === 'tm');
			const hadEventOrPeriod = hasAlias || isRootMatch;

			this.#result(arg, { match: sym.description, groups: { ...groups } });	// stash the {key} of the pattern that was matched

			dateTime = parseZone(groups, dateTime, this.#local.config);
			dateTime = this.#parseGroups(groups, dateTime, isAnchored, resolvingKeys);

			/**
			 * finished analyzing a matched pattern.  
			 * rebuild {arg.value} into a ZonedDateTime
			 */
			dateTime = parseWeekday(groups, dateTime, Tempo.#dbg, this.#local.config);
			dateTime = parseDate(groups, dateTime, Tempo.#dbg, this.#local.config, this.#local.parse["pivot"]);
			dateTime = parseTime(groups, dateTime);

			// if no time-components were matched, strip time to midnight baseline
			const hasTime = Object.keys(groups).some(key => ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'].includes(key) || Match.period.test(key))
				|| hadEventOrPeriod
				|| !dateTime.toPlainTime().equals(anchorTime);

			if (!isAnchored && !hasTime)
				dateTime = dateTime.withPlainTime('00:00:00');

			if (isZonedDateTime(dateTime)) {
				Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime, match: sym.description, groups });
			}

			Tempo.#dbg.debug(this.#local.config, 'groups', groups);	// show resolved date-time elements
			Tempo.#dbg.debug(this.#local.config, 'pattern', sym.description);	// show the matched pattern

			break;																								// stop checking patterns
		}

		return arg;
	}

	/** apply a regex-match against a value, and clean the result */
	#parseMatch(pat: RegExp, value: string | number | (() => string)) {
		const groups = value.toString().match(pat)?.groups || {}

		ownEntries(groups)																			// remove undefined, NaN, null and empty values
			.forEach(([key, val]: [string, any]) => isEmpty(val) && delete groups[key]);

		return groups as Tempo.Groups;
	}

	/** resolve {event} | {period} to their date | time values (mutates groups) */
	#parseGroups(groups: Tempo.Groups, dateTime: Temporal.ZonedDateTime, isAnchored: boolean, resolvingKeys: Set<string>): Temporal.ZonedDateTime {
		if (!isZonedDateTime(dateTime)) return dateTime;

		const prevAnchor = this.#anchor;
		const prevZdt = this.#zdt;

		this.#anchor = dateTime;																// temporarily anchor the instance so events resolve relative to current state
		this.#zdt = dateTime;																	// temporarily prime the instance to avoid recursion during event resolution

		this.#parseDepth++;
		const isRoot = this.#parseDepth === 1;
		if (isRoot) this.#matches = [];

		try {
			const resolved = new Set<string>();											// track keys resolved in this pass
			let pending: string[];

			while ((pending = ownKeys(groups).filter(k => (Match.event.test(k) || Match.period.test(k)) && !resolved.has(k))).length > 0) {
				const key = pending[0];

				const isEvent = Match.event.test(key);
				const isPeriod = Match.period.test(key);
				const isGlobal = key.startsWith('g');
				const isLocal = key.startsWith('l');
				const idx = +key.substring((isGlobal || isLocal) ? 4 : 3);					// gevt0/lper0 (4) or evt0 (3)
				const src = isGlobal ? (isEvent ? Tempo.#global.parse.event : Tempo.#global.parse.period) : (isEvent ? this.#local.parse.event : this.#local.parse.period);
				const entry = ownEntries(src, true)[idx];

				if (!entry) {
					resolved.add(key);
					continue;
				}

				const aliasKey = `${key}:${entry[0]}`;							// unique per-entry cycle guard key (e.g. gert0:tomorrow)
				if (resolvingKeys.size > 50 || resolvingKeys.has(aliasKey)) {
					const msg = `Infinite recursion detected in Tempo resolution for: ${aliasKey}`;
					this.#errored = true;															// mark as errored for graceful fallback
					Tempo.#dbg.error(this.#local.config, new RangeError(msg));
					resolved.add(key);
					continue;
				}

				resolvingKeys.add(aliasKey);
				resolved.add(key);

				const definition = entry[1];
				let res: string = '';
				if (typeof definition === 'function') {
					try {
						this.#anchor = dateTime;																// update anchor baseline for relative functional resolvers
						this.#zdt = dateTime;																		// sync instance state before call
						const result = (definition as Function).call(this);
						if (isTempo(result)) dateTime = result.toDateTime();		// capture shifted date from new instance
						else if (isZonedDateTime(result)) dateTime = result as Temporal.ZonedDateTime;					// capture shifted date from Temporal object
						else dateTime = isZonedDateTime(this.#zdt) ? (this.#zdt as any) : dateTime;																// capture any mutations back to loop
						res = String(result);
					} catch (e: any) {
						if (e.message.includes('Temporal')) {								// handle cases where 'this' is used in a Temporal-strict way
							res = (definition as any).toString();
						} else {
							throw e;
						}
					}
				} else {
					res = (definition as string);
				}

				if (isEvent && !isAnchored && isZonedDateTime(dateTime)) dateTime = (dateTime as any).startOfDay();

				Tempo.#dbg.debug(this.#local.config, 'event', `resolved "${key}" to "${res}" against ${(dateTime as any).toString?.() ?? String(dateTime)}`);

				try {
					// restore Event/Period match reporting for this alias resolution pass
					const type = isEvent ? 'Event' : 'Period';
					const val = entry![0];
					const pat = (isEvent ? 'dt' : 'tm');
					const resolveVal = isFunction(definition) ? res : definition;
					this.#result({ type, value: val, match: pat, groups: { [key]: resolveVal as string } });

					const resolving = new Set(resolvingKeys);
					resolving.add(aliasKey);
					const resMatch = this.#parseLayout(res, dateTime, isAnchored, resolving);

					if (resMatch.type === 'Temporal.ZonedDateTime')
						dateTime = resMatch.value;
				} finally {
					resolved.add(key);
				}

				delete groups[key];
			}
		} finally {
			this.#anchor = prevAnchor;														// restore anchor baseline
			if (this.#parseDepth === 1) {
				this.#zdt = prevZdt;																// restore instance state only if root
				this.#matches = undefined;
			} else {
				if (isZonedDateTime(dateTime)) this.#zdt = dateTime;			// only propagate valid Temporal state to parent level
			}
			this.#parseDepth--;
		}

		// resolve month-names into month-numbers (some browsers do not allow month-names when parsing a Date)
		if (isDefined(groups["mm"]) && !isNumeric(groups["mm"])) {
			const mm = prefix(groups["mm"] as Tempo.MONTH);				// conform month-name
			groups["mm"] = Tempo.MONTH[mm as Tempo.MONTH]!.toString().padStart(2, "0");
		}

		return dateTime;
	}

	#add = (args?: any, options: Tempo.Options = {}) => {
		if (!isTemporal(this.#zdt)) return this;

		const tz = options.timeZone ?? this.tz;
		let zdt = (this.#zdt as any).withTimeZone(tz);
		this.#parseDepth++;
		const isRoot = this.#parseDepth === 1;
		if (isRoot) this.#matches = [];

		const overrides = {
			timeZone: tz,
			calendar: (this.#zdt as any).calendarId,
		} as Tempo.Options;

		try {
			if (isDefined(args)) {
				if (isObject(args) && args.constructor === Object) {
					const mutate = 'add';
					zdt = Object.entries(args ?? {})										// loop through each mutation
						.reduce<Temporal.ZonedDateTime>((zdt, [unit, offset]) => {	// apply each mutation to preceding one
							if (++Tempo.#mutateDepth > 100) {						// Safety-Valve: recursion guard
								Tempo.#dbg.error(this.#local.config, `Infinite recursion detected in mutation engine for ${unit}`);
								this.#errored = true;
								return zdt;
							}
							try {
								if (unit === 'timeZone' || unit === 'calendar') return zdt;

								if (unit.startsWith('#')) {
									if (isString(offset)) {
										const term = unit.slice(1);
										const termObj = Tempo.#terms.find(t => t.scope === term || t.key === term);

										let jump = zdt;
										let next = new this.#Tempo(jump, { ...this.config, mode: enums.MODE.Strict }).set({ [unit]: offset }).toDateTime();

										let iterations = 0;
										while (next.epochNanoseconds <= zdt.epochNanoseconds) {
											if (++iterations > 20) {													// lower safety threshold significantly
												Tempo.#dbg.warn(this.#local.config, `Term resolution stalling for "${unit}" (offset: "${offset}"). Jumping range.`);
												let range;
												try {
													range = termObj?.define.call(new this.#Tempo(jump, { ...this.config, mode: enums.MODE.Strict }), false);
												} catch (err: any) {
													if (err.message.includes('Class constructor')) {
														Tempo.#dbg.warn(this.#local.config, `Misidentified class in term recovery: ${unit}`, err.stack ?? err);
													} else {
														throw err;
													}
												}
												const step = getSafeFallbackStep(range as any, (termObj as any)?.scope ?? (unit === '#period' ? 'period' : undefined));
												jump = jump.add(step);
												next = new this.#Tempo(jump, { ...this.config, mode: enums.MODE.Strict }).set({ [unit]: offset }).toDateTime();
												break;
											}

											let range;
											try {
												range = termObj?.define.call(new this.#Tempo(jump, { ...this.config, mode: enums.MODE.Strict }), false);
											} catch (err: any) {
												if (err.message.includes('Class constructor')) {
													Tempo.#dbg.warn(this.#local.config, `Misidentified class in term resolution: ${unit}`, err.stack ?? err);
												} else {
													throw err;
												}
											}

											if (isObject(range) && (range as any).end) {
												jump = (range as any).end.toDateTime();
											} else {
												const step = (unit === '#period' || (termObj as any)?.scope === 'period') ? { days: 1 } : { years: 1 };
												jump = jump.add(step);
											}
											next = new this.#Tempo(jump, { ...this.config, mode: enums.MODE.Strict }).set({ [unit]: offset }).toDateTime();
										}
										return next;
									}
									const res = resolveTermShift(new this.#Tempo(zdt, this.config), Tempo.#terms, unit, offset as number);
									if (isDefined(res)) {
										return res;
									}
								}

								const single = singular((enums.ELEMENT[unit as t.Element] ?? unit) as string);
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
										return zdt.add({ [plural]: offset });

									default:
										Tempo.#dbg.error(this.#local.config, `Unexpected method(${mutate}), unit(${unit}) and offset(${offset})`);
										this.#errored = true;
										return zdt;
								}
							} finally {
								Tempo.#mutateDepth--;
							}
						}, zdt);
				}
				else {
					return new this.#Tempo(args, { ...this.#options, ...overrides, ...options, result: this.#matches, anchor: zdt });
				}
			}

			if (this.#errored)
				return new this.#Tempo(null, { ...this.#options, ...overrides, ...options, result: this.#matches });

			return new this.#Tempo(zdt, { ...this.#options, ...overrides, ...options, result: this.#matches, anchor: zdt });

		} finally {
			if (isRoot) this.#matches = undefined;
			this.#parseDepth--;
		}
	}

	/** mutate the date-time by setting specific offsets */
	#set = (args?: any, options: Tempo.Options = {}) => {
		if (!isTemporal(this.#zdt)) return this;

		const tz = options.timeZone ?? this.tz;
		const cal = options.calendar ?? (this.#zdt as any).calendarId;

		// Shift the current instance to the target timezone first to ensure
		// that any relative keywords (like 'tomorrow') are resolved correctly.
		let zdt = (this.#zdt as any).withTimeZone(tz).withCalendar(cal);
		this.#parseDepth++;
		const isRoot = this.#parseDepth === 1;
		if (isRoot) this.#matches = [];

		const overrides = {
			timeZone: tz,
			calendar: zdt.calendarId,
		} as Tempo.Options;

		try {
			if (isDefined(args)) {
				if (isObject(args) && args.constructor === Object) {

					const { timeZone, calendar } = args as Temporal.ZonedDateTimeLikeObject;
					if (timeZone) overrides.timeZone = timeZone;
					if (calendar) overrides.calendar = calendar;

					zdt = Object.entries(args ?? {})									// loop through each mutation
						.reduce<Temporal.ZonedDateTime>((zdt, [key, adjust]) => {	// apply each mutation to preceding one
							if (key === 'timeZone' || key === 'calendar') return zdt;

							const { mutate, offset, single, term } = ((key) => {
								switch (key) {
									case 'start':
									case 'mid':
									case 'end':
										{
											const val = adjust?.toString() ?? '';
											const isTerm = val.startsWith('#');
											const single = isTerm ? 'term' : singular(val);
											return { mutate: key as Tempo.Mutate, offset: val, single, term: isTerm ? val : undefined }
										}
									default:
										{
											const isTerm = key.startsWith('#');
											const name = isTerm ? key.slice(1) : key;
											const single = isTerm ? 'term' : singular(name as string);
											return { mutate: 'set', offset: adjust, single, term: isTerm ? (key as string) : undefined }
										}
								}
							})(key);																			// IIFE to analyze arguments

							switch (`${mutate}.${single}`) {
								case 'start.term':
								case 'mid.term':
								case 'end.term':
									{
										const ident = term!.startsWith('#') ? term!.slice(1) : term!;
										const termObj = Tempo.#terms.find(t => t.key === ident || t.scope === ident);
										if (!termObj) throw new Error(`Unknown Term identifier: ${term}`);

										const list = getRange(termObj, this, zdt);
										const range = (getTermRange(this, list, false, zdt) as any);
										if (!range) throw new Error(`Cannot resolve range for Term: ${term}`);

										switch (mutate) {
											case 'start': return range.start.toDateTime().withTimeZone(tz).withCalendar(cal);
											case 'mid': {
												const startNs = range.start.toDateTime().epochNanoseconds as bigint;
												const endNs = range.end.toDateTime().epochNanoseconds as bigint;
												const midNs = startNs + (endNs - startNs) / BigInt(2);
												return Temporal.Instant.fromEpochNanoseconds(midNs).toZonedDateTimeISO(tz).withCalendar(cal);
											}
											case 'end': return range.end.toDateTime().subtract({ nanoseconds: 1 }).withTimeZone(tz).withCalendar(cal);
										}
									}

								case 'set.timeZone':
									return zdt.withTimeZone(offset as Temporal.TimeZoneLike);
								case 'set.calendar':
									return zdt.withCalendar(offset as Temporal.CalendarLike);

								case 'set.term':
								case 'set.period':
								case 'set.time':
								case 'set.date':
								case 'set.event':
								case 'set.dow':															// set day-of-week by number
								case 'set.wkd':															// set day-of-week by name
									return this.#parse(offset as any, zdt, term);

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
									Tempo.#dbg.error(this.#local.config, `Unexpected method(${mutate}), unit(${adjust}) and offset(${single})`);
									return zdt;
							}
						}, zdt)																					// start reduce with the shifted zonedDateTime
				}
				else {
					return new this.#Tempo(args, { ...this.#options, ...overrides, ...options, result: this.#matches, anchor: zdt });
				}
			}

			return new this.#Tempo(zdt, { ...this.#options, ...overrides, ...options, result: this.#matches, anchor: zdt });
		} finally {
			if (isRoot) this.#matches = undefined;
			this.#parseDepth--;
		}
	}

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// shortcut functions to common Tempo properties / methods
/** check valid Tempo */
/** current timestamp (ts) */	export const getStamp = ((tempo: Tempo.DateTime, options: Tempo.Options) => new Tempo(tempo, options).ts) as Tempo.Params<number | bigint>;
/** create new Tempo */				export const getTempo = ((tempo: Tempo.DateTime, options: Tempo.Options) => new Tempo(tempo, options)) as Tempo.Params<Tempo>;
/** format a Tempo */					export const fmtTempo = ((fmt: string, tempo: Tempo.DateTime, options: Tempo.Options) => new Tempo(tempo, options).format(fmt as any)) as Internal.Fmt;

export namespace Tempo {
	export type DateTime = t.DateTime;
	export type Pattern = t.Pattern;
	export type Logic = t.Logic;
	export type Pair = t.Pair;
	export type Groups = t.Groups;

	export type PatternOptionArray<T> = t.Internal.PatternOptionArray<T>;
	export type PatternOption<T> = t.Internal.PatternOption<T>;

	export interface BaseOptions extends t.Internal.BaseOptions { }
	export type Options = t.Options;

	export type TermPlugin = t.TermPlugin;
	export type Plugin = t.Plugin;
	export type Module = t.Module;
	export type Extension = t.Extension;

	/** Configuration to use for #until() and #since() argument */
	export type Unit = t.Unit;
	export type Until = t.Until;
	export type Mutate = t.Mutate;
	export type Set = t.Set;
	export type Add = t.Add;

	export type OwnFormat = t.OwnFormat;
	export type Formats = t.Formats;
	export type Format = t.Format;
	export type FormatRegistry = t.FormatRegistry;
	export type FormatType<K extends PropertyKey> = t.FormatType<K>;

	export type Terms = t.Terms;

	export type Modifier = t.Modifier;
	export type Relative = t.Relative;

	export type mm = t.mm;
	export type hh = t.hh;
	export type mi = t.mi;
	export type ss = t.ss;
	export type ms = t.ms;
	export type us = t.us;
	export type ns = t.ns;
	export type ww = t.ww;

	export type Duration = t.Duration;

	export type WEEKDAY = t.WEEKDAY;
	export type WEEKDAYS = t.WEEKDAYS;
	export type MONTH = t.MONTH;
	export type MONTHS = t.MONTHS;
	export type DURATION = t.DURATION;
	export type DURATIONS = t.DURATIONS;
	export type COMPASS = t.COMPASS;
	export type SEASON = t.SEASON;
	export type ELEMENT = t.ELEMENT;

	export type Weekday = t.Weekday;
	export type Month = t.Month;
	export type Element = t.Element;

	export interface Params<T> extends t.Params<T> { }
}
