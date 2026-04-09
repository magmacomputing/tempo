import { isObject, isFunction, isDefined, isUndefined, isEmpty, isNumber } from '#library/type.library.js'
import { Pledge } from '#library/pledge.class.js'
import { isNumeric } from '#library/coercion.library.js'
import { instant, normaliseFractionalDurations } from '#library/temporal.library.js'
import { DURATIONS } from '#tempo/tempo.enum.js'
import { markConfig } from '#library/symbol.library.js'
import { definePlugin } from '#tempo/plugins/plugin.util.js'
import type { Tempo } from '#tempo/tempo.class.js'

declare module '#tempo/tempo.class.js' {
	namespace Tempo {
		/** ticker interval allowed types (interpreted as seconds) */
		type TickerInterval = number | string | bigint

		/** ticker configuration and stop conditions */
		type TickerOptions = {
			years?: number; months?: number; weeks?: number; days?: number;
			hours?: number; minutes?: number; seconds?: number;
			milliseconds?: number; microseconds?: number; nanoseconds?: number;
			limit?: number;
			until?: DateTime | Options;
			seed?: DateTime | Options;
			catch?: boolean;
			[key: `#${string}`]: number | string;
		}

		/** callback function for Tempo.ticker() */
		type TickerCallback = (t: Tempo, stop: () => void) => void

		/** Unified Ticker interface supporting generators, events, and manual pulsing */
		interface Ticker extends AsyncGenerator<Tempo, any>, AsyncDisposable, Disposable {
			(): void
			pulse(): Tempo;
			on(event: 'pulse' | 'catch', cb: (t: Tempo, stop: () => void) => void): this;
			stop(): void;
			readonly info: {
				next: Tempo;
				ticks: number;
				limit: number | undefined;
				interval: Record<string, any>;
				stopped: boolean;
			}
		}

		/** Summary of an active ticker */
		type TickerSnapshot = Ticker['info'] & { ticker: Ticker }

		const tickers: TickerSnapshot[]
		function ticker(interval?: TickerInterval): Ticker;
		function ticker(options: TickerOptions): Ticker;
		function ticker(callback: TickerCallback): Ticker;
		function ticker(interval: TickerInterval, callback: TickerCallback): Ticker;
		function ticker(options: TickerOptions, callback: TickerCallback): Ticker;
		function ticker(options: TickerOptions, extraOptions: TickerOptions): Ticker;
	}
}

/**
 * # ACTIVE_TICKERS
 * Internal registry for all active tickers.
 */
const ACTIVE_TICKERS = new Set<Tempo.Ticker>();

/**
 * # createTicker
 * Stateful factory for Tempo.Ticker instances.
 * This function-based approach avoids "Class constructor cannot be invoked without new" errors.
 */
function createTicker(TempoClass: typeof Tempo, arg1: any, arg2?: any): Tempo.Ticker {
	// ── State ────────────────────────────────────────────────────────────
	let payload: Record<string, any> = {};
	let current: Tempo;
	let until: Tempo | undefined;
	let limit: number | undefined;
	let ticks = 0;
	let stopped = false;
	let genFirstYielded = false;
	let isForward = true;
	let isInstant = false;
	let schedId: any;
	let waiter: Pledge<void> | undefined;
	const listeners = new Set<Tempo.TickerCallback>();
	const catchListeners = new Set<Tempo.TickerCallback>();

	const isOptions = (obj: any) => isObject(obj) && !('epochMilliseconds' in obj);

	// ── Overload Parsing ─────────────────────────────────────────────────
	let rawOptions: any = {};
	let cb: Tempo.TickerCallback | undefined;

	switch (true) {
		case isFunction(arg1):
			cb = arg1;
			break;
		case isOptions(arg1):
			Object.assign(rawOptions, arg1);
			if (isFunction(arg2)) cb = arg2;
			else if (isOptions(arg2)) Object.assign(rawOptions, arg2);
			break;
		default:
			if (isDefined(arg1)) {
				const num = Number(arg1);
				if (isNumeric(arg1) && Number.isFinite(num)) rawOptions.seconds = num;
				else rawOptions.seed = arg1;
			}
			if (isFunction(arg2)) cb = arg2;
			else if (isOptions(arg2)) Object.assign(rawOptions, arg2);
	}

	// ── Initialization ───────────────────────────────────────────────────
	const isSeed = isDefined(rawOptions.seed) && (!isNumber(rawOptions.seed) || (Number.isFinite(rawOptions.seed as number) && !Number.isNaN(rawOptions.seed as number)));
	const isInterval = isDefined(rawOptions.seconds) && Number.isFinite(rawOptions.seconds) && !Number.isNaN(rawOptions.seconds);

	if (isDefined(arg1) && !isInterval && !isSeed && !cb) {
		(TempoClass as any).logError(markConfig(rawOptions), `Invalid Ticker interval or seed: ${String(arg1)}`);
	}

	const { limit: lmt, until: stopAt, seed: startAt, ...rest } = rawOptions;
	limit = lmt;
	until = stopAt ? new TempoClass(isOptions(stopAt) ? undefined : stopAt, isOptions(stopAt) ? { ...rest, ...stopAt } : rest) : undefined;
	if (cb) listeners.add(cb);

	const durationKeys = new Set(Object.keys(DURATIONS));
	for (const [key, val] of Object.entries(rest))
		if (isDefined(val) && (durationKeys.has(key) || key.startsWith('#')))
			payload[key] = val;

	if (isEmpty(payload)) {
		if (isDefined(startAt) && isUndefined(limit)) limit = 1;
		else payload.seconds = 1;
	}

	normaliseFractionalDurations(payload);
	current = new TempoClass(isOptions(startAt) ? undefined : startAt, isOptions(startAt) ? { ...rest, ...startAt } : rest);

	// ── Methods ──────────────────────────────────────────────────────────

	const stop = () => {
		stopped = true;
		ACTIVE_TICKERS.delete(ticker);
		if (schedId) {
			clearTimeout(schedId);
			schedId = undefined;
		}
		if (waiter && waiter.isPending) {
			waiter.resolve();
			waiter = undefined;
		}
	};

	const delayMs = () => Math.max(0, Math.round(current.epoch.ms - instant().epochMilliseconds));

	const scheduleNext = () => {
		if (stopped || isInstant) return;
		schedId = setTimeout(() => {
			if (!stopped) {
				pulse();
				scheduleNext();
			}
		}, delayMs());
	};

	const bootstrap = () => {
		if (listeners.size > 0 && !stopped && !schedId) {
			const delay = delayMs();
			if (delay > 0) {
				schedId = setTimeout(() => {
					if (!stopped) {
						pulse();
						scheduleNext();
					}
				}, delay);
			} else {
				pulse();
				scheduleNext();
			}
		}
	};

	const pulse = (): Tempo => {
		if (stopped) return new (TempoClass as any)(null, current.config);

		const t = current;
		if (!t.isValid) {
			stop();
			catchListeners.forEach(l => l(t, stop));
			return t;
		}

		current = isInstant ? t : t.add(payload);
		ticks++;

		if (isDefined(limit) && ticks >= limit) stop();
		if (isDefined(until)) {
			const cmp = TempoClass.compare(t, until);
			if ((isForward && cmp >= 0) || (!isForward && cmp <= 0)) stop();
		}

		if (stopped && isDefined(limit) && limit === 0) return t;

		listeners.forEach(l => l(t, stop));
		return t;
	};

	// ── Ticker Object ───────────────────────────────────────────────────

	const ticker = (() => stop()) as unknown as Tempo.Ticker;

	Object.defineProperties(ticker, {
		pulse: { value: pulse, enumerable: true },
		on: {
			value: function (event: 'pulse' | 'catch', cb: Tempo.TickerCallback) {
				if (event === 'pulse') {
					listeners.add(cb);
					bootstrap();
				}
				if (event === 'catch') catchListeners.add(cb);
				return this;
			},
			enumerable: true
		},
		stop: { value: stop, enumerable: true },
		info: {
			get: () => ({
				next: current.clone(),
				ticks,
				limit,
				interval: { ...payload },
				stopped
			}),
			enumerable: true
		},
		next: {
			value: async function (): Promise<IteratorResult<Tempo, any>> {
				if (stopped) return { done: true, value: undefined };
				if (!genFirstYielded) {
					genFirstYielded = true;
					const delay = delayMs();
					if (delay > 0) {
						waiter = new Pledge<void>('Ticker.next');
						schedId = setTimeout(() => waiter?.resolve(), delay);
						await waiter;
						waiter = undefined;
						if (stopped) return { done: true, value: undefined };
					}
					const t = pulse();
					if (stopped && isDefined(limit) && limit === 0) return { done: true, value: undefined };
					return { done: false, value: t };
				}
				if (isInstant) return { done: true, value: undefined };
				const delay = delayMs();
				waiter = new Pledge('Ticker.next') as Pledge<void>;
				schedId = setTimeout(() => waiter?.resolve(), delay);
				await waiter;
				waiter = undefined;
				if (stopped) return { done: true, value: undefined };
				const t = pulse();
				if (stopped && isDefined(limit) && limit === 0) return { done: true, value: undefined };
				return { done: false, value: t };
			},
			enumerable: true
		},
		return: {
			value: async function () {
				stop();
				return { done: true, value: undefined };
			},
			enumerable: true
		},
		throw: {
			value: async function (e: any) {
				if (waiter && waiter.isPending) {
					waiter.reject(e);
					waiter = undefined;
				}
				stop();
				throw e;
			},
			enumerable: true
		},
		[Symbol.asyncIterator]: { value: function () { return this; }, enumerable: false },
		[Symbol.asyncDispose]: { value: async function () { stop(); }, enumerable: false },
		[Symbol.dispose]: { value: function () { stop(); }, enumerable: false }
	});

	// ── Validation: Refusal-to-Launch ────────────────────────────
	if (!current.isValid) {
		stop();
		(TempoClass as any).logError(current.config, `Invalid Ticker seed: ${String(startAt)}`);
		return ticker;
	}
	if (until && !until.isValid) {
		stop();
		(TempoClass as any).logError(current.config, `Invalid Ticker boundary: ${String(stopAt)}`);
		return ticker;
	}

	try {
		const firstStep = current.add(payload);
		if (!firstStep.isValid) throw new Error(`Invalid Ticker payload resolution for ${JSON.stringify(payload)}`);
		isForward = TempoClass.compare(firstStep, current) >= 0;
		isInstant = firstStep.epoch.ns === current.epoch.ns;
		if (Object.keys(payload).some(k => k.startsWith('#'))) current = firstStep;
	} catch (e: any) {
		stop();
		(TempoClass as any).logError(current.config, `Invalid Ticker payload resolution for ${JSON.stringify(payload)}`, e);
		queueMicrotask(() => catchListeners.forEach(l => l(current, stop)));
		isForward = true;
		isInstant = false;
	}

	ACTIVE_TICKERS.add(ticker);
	bootstrap();

	return ticker;
}

/**
 * # Public API
 */
export const Ticker = {
	get active() {
		return Array.from(ACTIVE_TICKERS)
			.map(t => ({ ticker: t, ...t.info } as unknown as Tempo.TickerSnapshot));
	}
};

/**
 * # TickerPlugin
 */
export const TickerPlugin = definePlugin((_options, TempoClass, _factory) => {
	TempoClass.ticker = function (this: typeof Tempo, arg1: any, arg2?: any): Tempo.Ticker {
		return createTicker(this, arg1, arg2);
	} as typeof Tempo.ticker;

	// @ts-ignore
	TempoClass.tickers = Ticker.active;
});
