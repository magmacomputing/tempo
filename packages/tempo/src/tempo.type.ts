/**
 * Tempo type definitions — exported as flat top-level types.
 *
 * Consumers access these via the `Tempo` namespace which is reconstructed
 * by `tempo.index.ts` using `export * as Tempo from '#tempo/tempo.type.js'`.
 *
 * Inside `tempo.class.ts` these are accessed via `import * as t`.
 */

import * as enums from '#tempo/tempo.enum.js';
import { $Tempo, $Plugins, $Register } from '#tempo/tempo.symbol.js';
import type { Snippet, Layout, Event, Period, Token } from '#tempo/tempo.default.js';
import type { IntRange, NonOptional, Property, Plural, Prettify, TemporalObject, TypeValue } from '#library/type.library.js';

/**
 * Structural forward-reference to the Tempo class.
 * 'import type' is safe for circular ESM references — erased at runtime.
*/
import type { Tempo } from '#tempo/tempo.class.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Tempo: { type: 'Tempo', value: Tempo };
	}
}

declare global {
	interface globalThis {
		[$Tempo]?: Internal.Discovery;
		[$Plugins]?: Internal.Discovery;
		[$Register]?: () => void;
	}
}

/** the value that Tempo will attempt to interpret as a valid ISO date / time */
export type DateTime = string | number | bigint | Date | Tempo | TemporalObject | Temporal.ZonedDateTimeLike | undefined | null

export type Pattern = string | RegExp
export type Logic = string | number | Function
export type Pair = [string, string]
export type Groups = Record<string, string>

export type Options = Prettify<{ [K in keyof Internal.BaseOptions]?: Internal.BaseOptions[K] } & Record<string, any>>;

/**
 * # TermPlugin
 * extend the functionality of the Tempo term-resolution system.
 * Every attempt to resolve an input to a Tempo should always be checked with .isValid before continuing.
 * Otherwise unpredictable behaviour is likely.
 */
export type TermPlugin = {
	key: string; scope?: string;
	description?: string;
	define: (this: Tempo, keyOnly?: boolean) => any;
	ranges?: Range[];
}

/**
 * # Plugin
 * extend the functionality of the Tempo class.
 * Every attempt to resolve an input to a Tempo should always be checked with .isValid before continuing.
 * Otherwise unpredictable behaviour is likely.
 */
export type Plugin = (options: any, TempoClass: typeof Tempo, factory: (val: any) => Tempo) => void;

/** Configuration to use for #until() and #since() argument */
export type DateTimeUnit = Temporal.DateUnit | Temporal.TimeUnit
export type Unit = DateTimeUnit | Plural<DateTimeUnit>
type Units = Temporal.PluralizeUnit<DateTimeUnit>;
type BaseDuration = Record<Units, number>;
export type FlexibleDuration = {
	[K in Units]: Pick<BaseDuration, K> & { [P in keyof Omit<BaseDuration, K>]?: number };
}[Units]
export type Until = (Options & { unit?: Unit }) | Unit

export type Mutate = 'start' | 'mid' | 'end'
type TermOffset = { [K: `#${string}`]: number | string }
type SetFields = {
	[K in Mutate]?: Unit | `#${string}`;
} & {
	[K in 'date' | 'time' | 'event' | 'period']?: string;
}
export type Set = Prettify<SetFields & {
	timeZone?: Temporal.TimeZoneLike;
	calendar?: Temporal.CalendarLike;
} & TermOffset> | DateTime
type AddUnits = { [K in Unit]?: number };
export type Add = Prettify<AddUnits & TermOffset> | DateTime

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

/** pre-configured format strings */
export type OwnFormat = enums.OwnFormat;

/** mapping of format names to instance-resolutions (string | number) */
export type Formats = enums.Formats;

/** Enum registry of format strings */
export type Format = enums.FormatEnum;
export type FormatType<K extends PropertyKey> = enums.FormatType<K>;

/** mapping of terms to their resolved values */
export type Terms = Property<any>;

/** term definition range */
export type Range = Partial<BaseDuration> & {
	key?: string;
	/** categorization marker (e.g. 'western', 'chinese', 'fiscal') */
	group?: string;
	[key: string]: any;
}

/** resolved Term range */
export type ResolvedRange = FlexibleDuration & {
	key: string;
	scope: string;
	label?: string;
	start: Tempo;
	end: Tempo;
	unit?: DateTimeUnit;
	rollover?: DateTimeUnit;
	[str: PropertyKey]: any;
}

export type WEEKDAY = enums.WEEKDAY
export type WEEKDAYS = enums.WEEKDAYS
export type MONTH = enums.MONTH
export type MONTHS = enums.MONTHS
export type DURATION = enums.DURATION
export type DURATIONS = enums.DURATIONS
export type COMPASS = enums.COMPASS
export type SEASON = enums.SEASON
export type ELEMENT = enums.ELEMENT

export type Weekday = enums.Weekday
export type Month = enums.Month
export type Element = enums.Element

/** Type for consistency in expected arguments for helper functions */
export interface Params<T> {
	(tempo?: DateTime, options?: Options): T;									// parse DateTime, default to Temporal.Instance.now()
	(options: Options): T;																		// provide just the Options (use {value:'XXX'} for specific DateTime)
}

export namespace Internal {
	export type Registry = Map<symbol, RegExp>
	export type PatternOptionArray<T> = Array<PatternOption<T>>
	export type PatternOption<T> = T | Record<string | symbol, T> | PatternOptionArray<T>

	/** the Options object found in a config-module, or passed to a call to Tempo.init({}) or 'new Tempo({})' */
	export interface BaseOptions {
		/** localStorage key */																	store: string;
		/** globalThis Discovery Symbol */											discovery: string | symbol;
		/** additional console.log for tracking */							debug: boolean | undefined;
		/** catch or throw Errors */														catch: boolean | undefined;
		/** suppress console output during catch */							silent: boolean | undefined;
		/** Temporal timeZone */																timeZone: Temporal.TimeZoneLike;
		/** Temporal calendar */																calendar: Temporal.CalendarLike;
		/** locale (e.g. en-AU) */															locale: string;
		/** pivot year for two-digit years */										pivot: number;
		/** hemisphere for term.qtr or term.szn */							sphere: enums.COMPASS | undefined;
		/** Precision to measure timestamps (ms | us) */				timeStamp?: TimeStamp;
		/** initialization strategy ('auto'|'strict'|'defer') */mode?: enums.Mode;
		/** locale-names that prefer 'mm-dd-yy' date order */		mdyLocales: string | string[];
		/** swap parse-order of layouts */											mdyLayouts: Pair[];
		/** date-time snippets to help compose a Layout */			snippet: Snippet | PatternOption<Pattern>;
		/** patterns to help parse value */											layout: Layout | PatternOption<Pattern>;
		/** custom date aliases (events). */										event: Event | PatternOption<Logic>;
		/** custom time aliases (periods). */										period: Period | PatternOption<Logic>;
		/** custom format strings to merge in the FORMAT enum */formats: Property<any>;
		/** plugins to be automatically extended */							plugins: Plugin | Plugin[];
		/** supplied value to parse */													value: DateTime;
		/** @internal temporary anchor used during parsing */		anchor: Temporal.ZonedDateTime;
		/** @internal accumulated parse results */							result?: Match[] | undefined;
	}

	/** high-precision precision to measure timestamps (ms | us) */
	export type TimeStamp = 'ss' | 'ms' | 'us' | 'ns'

	/** internal metadata for a plugin to track installation */
	export interface PluginContainer extends Plugin {
		installed?: boolean;
	}

	/** the encapsulated state of a Tempo instance */
	export interface State {																	// 'global' and 'local' variables
		/** current defaults for all Tempo instances */					config: Config;
		/** parsing rules */																		parse: Parse;
	}

	/** Debugging results of a parse operation. See `doc/tempo.api.md`. */
	export interface Parse {
		/** Locales which prefer 'mm-dd-yyyy' date-order */			mdyLocales: { locale: string, timeZones: string[] }[];
		/** Layout names that are switched to mdy */						mdyLayouts: Pair[];
		/** is a timeZone that prefers 'mmddyyyy' date order */	isMonthDay?: boolean;
		/** Symbol registry */																	token: Token;
		/** Tempo snippets to aid in parsing */									snippet: Snippet;
		/** Tempo layout strings */															layout: Layout;
		/** Map of regex-patterns to match input-string */			pattern: Registry;
		/** configured Events */																event: Event;
		/** configured Periods */																period: Period;
		/** pivot year for two-digit years */										pivot?: number;
		/** parsing match result */															result: Match[];
		/** was this a nested/anchored parse? */								isAnchored?: boolean;
		/** initialization strategy ('auto'|'strict'|'defer') */mode: enums.Mode;
		/** @internal is parsing currently deferred? */					lazy: boolean;
		/** @internal lazy delegator for formats */							format?: any;
		/** @internal lazy delegator for terms */								term?: any;
		/** @internal localized Master Guard scanner */					guard?: { test(str: string): boolean };
	}

	/** debug a Tempo instantiation */
	type MatchExtend = { type: 'Event' | 'Period', value: string | number | Function }
	export type Match = {
		/** pattern which matched the input */									match?: string | undefined;
		/** groups from the pattern match */										groups?: Groups;
		/** was this a nested/anchored parse? */								isAnchored?: boolean;
	} & (TypeValue<any> | MatchExtend)

	/** drop the parse-only Options */
	export type OptionsKeep = Omit<BaseOptions, "mdyLocales" | "mdyLayouts" | "pivot" | "snippet" | "layout" | "event" | "period" | "value">

	/** Instance configuration derived from supply, storage, and discovery. */
	export interface Config extends Required<Omit<OptionsKeep, "formats">> {
		/** configuration (global | local) */										scope: 'global' | 'local';
		/** pre-configured format strings */										formats: Format;
		/** index-signature */																	readonly [key: string]: any;
	}

	/** structured configuration for Global Discovery via Symbol.for('$Tempo') */
	export interface Discovery {
		/** pre-defined config options for Tempo.#global */			options?: Options | (() => Options);
		/** aliases to merge in the TimeZone dictionary */			timeZones?: Record<string, string>;
		/** aliases to merge in the Number-Word dictionary */		numbers?: Record<string, number>;
		/** term plugins to be registered via Tempo.addTerm() */terms?: TermPlugin | TermPlugin[];
		/** plugins to be automatically extended via Tempo.extend() */plugins?: Plugin | Plugin[];
		/** custom format strings to merge in the FORMAT dictionary */formats?: Property<any>;
	}
}
