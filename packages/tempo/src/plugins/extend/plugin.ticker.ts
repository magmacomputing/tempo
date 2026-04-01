import { isObject, isFunction, isDefined, isEmpty, isNumber } from '#library/type.library.js'
import { normaliseFractionalDurations } from '#library/temporal.library.js'
import { DURATIONS } from '#tempo/tempo.enum.js'
import { definePlugin } from '#tempo/plugins/tempo.plugin.js'
import type { Tempo } from '#tempo/tempo.class.js'
import type { DateTime, Options } from '#tempo/tempo.type.js'

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
			[key: `#${string}`]: number | string;
		}

		/** callback function for Tempo.ticker() */
		type TickerCallback = (t: Tempo, stop: () => void) => void

		/** Unified Ticker interface supporting generators, events, and manual pulsing */
		interface Ticker extends AsyncGenerator<Tempo, any>, AsyncDisposable, Disposable {
			(): void
			pulse(): Tempo;
			on(event: 'pulse', cb: (t: Tempo, stop: () => void) => void): this;
			stop(): void;
		}

		function ticker(interval?: TickerInterval): Ticker;
		function ticker(options: TickerOptions): Ticker;
		function ticker(callback: TickerCallback): Ticker;
		function ticker(interval: TickerInterval, callback: TickerCallback): Ticker;
		function ticker(options: TickerOptions, callback: TickerCallback): Ticker;
		function ticker(options: TickerOptions, extraOptions: TickerOptions): Ticker;
	}
}

/**
 * # TickerPlugin
 * Callback mode  : self-rescheduling setTimeout loop drives repeating pulses.
 * Generator mode : each next() call awaits its own delay — no background loop.
 * Both modes share a synchronous leading-pulse on construction (Pulse 1).
 */
export const TickerPlugin = definePlugin((_options, TempoClass, _factory) => {
	TempoClass.ticker = function (arg1: any, arg2?: any): Tempo.Ticker {
		let rawOptions: any = {}
		let cb: Tempo.TickerCallback | undefined

		const isOptions = (obj: any) => isObject(obj) && !('epochMilliseconds' in obj)

		// ── Parse overloads ──────────────────────────────────────────────────
		switch (true) {
			case isFunction(arg1):
				cb = arg1;
				break;
			case isOptions(arg1):
				Object.assign(rawOptions, arg1);
				if (isFunction(arg2)) cb = arg2
				else if (isOptions(arg2)) Object.assign(rawOptions, arg2)
				break;
			default:																							// shorthand number|string|bigint — interpreted as seconds
				if (isDefined(arg1) && !Number.isFinite(Number(arg1))) {
					TempoClass.catch(new RangeError(`Ticker: invalid interval '${arg1}'`))
					arg1 = 1;
				}
				rawOptions.seconds = isDefined(arg1) ? Number(arg1) : 1
				if (isFunction(arg2)) cb = arg2
				else if (isOptions(arg2)) Object.assign(rawOptions, arg2)
		}

		// ── Build timing payload ─────────────────────────────────────────────
		const { limit, until: stopAt, seed: startAt, ...rest } = rawOptions;
		const durationKeys = new Set(Object.keys(DURATIONS));
		const payload: Record<string, any> = {};

		for (const [key, val] of Object.entries(rest))
			if (isDefined(val) && (durationKeys.has(key) || key.startsWith('#')))
				payload[key] = val;

		if (isEmpty(payload)) payload.seconds = 1;							// default: 1-second interval

		normaliseFractionalDurations(payload);

		// ── Direction / instant probe ────────────────────────────────────────
		const probe = new TempoClass();
		const probeShifted = probe.add(payload);
		const isForward = TempoClass.compare(probeShifted, probe) >= 0;
		const isInstant = probeShifted.epoch.ns === probe.epoch.ns;

		// ── Shared state ─────────────────────────────────────────────────────
		const until = stopAt ? new TempoClass(stopAt as DateTime) : undefined;
		const hasCallback = cb !== undefined;
		let current = new TempoClass(startAt as DateTime);			// next value to emit
		let ticks = 0;
		let genFirstYielded = false;														// generator: leading pulse yielded?
		let stopped = false;
		let schedId: ReturnType<typeof setTimeout> | undefined;
		const listeners = new Set<Tempo.TickerCallback>();
		if (cb) listeners.add(cb);

		// ── Stop logic (standalone to break circular reference) ─────────────
		const doStop = () => {
			stopped = true;

			if (schedId) {
				clearTimeout(schedId);
				schedId = undefined;
			}
		}

		// ── Core: emit current, advance pointer, check stop ──────────────────
		const firePulse = (): Tempo => {
			const t = current.clone();														// snapshot the value being emitted
			current = current.add(payload);												// advance pointer to next interval
			ticks++;

			if (isDefined(limit) && ticks >= limit) stopped = true;
			if (isDefined(until)) {
				const cmp = TempoClass.compare(t, until);
				if ((isForward && cmp >= 0) || (!isForward && cmp <= 0)) stopped = true;
			}
			if (stopped) doStop();

			listeners.forEach(l => l(t, doStop));
			return t;
		}

		// ms until `current` should fire (≥ 0; virtual/past seeds → 0)
		const delayMs = () =>
			Math.max(0, Math.round(current.epoch.ms - Date.now()));

		// ── Callback-mode scheduler ──────────────────────────────────────────
		const scheduleNext = () => {
			if (stopped || isInstant) return;
			schedId = setTimeout(() => {
				if (!stopped) { firePulse(); scheduleNext() }
			}, delayMs())
		}

		// ── Ticker object ────────────────────────────────────────────────────
		const tickerFn: any = () => doStop()
		const tickerObj = Object.assign(tickerFn, {

			/** Manual pulse — advances state and notifies listeners */
			pulse(): Tempo {
				return (stopped)
					? current.clone()
					: firePulse()
			},

			/** Register a 'pulse' event listener */
			on(event: string, callback: Tempo.TickerCallback) {
				if (event === 'pulse') listeners.add(callback)
				return this
			},

			/** Cancel the ticker */
			stop: doStop,

			[Symbol.dispose](): void { doStop() },
			[Symbol.asyncDispose](): Promise<void> { doStop(); return Promise.resolve() },

			// ── Generator mode ───────────────────────────────────────────────
			// No background loop — each next() awaits its own delay.
			async next(): Promise<IteratorResult<Tempo>> {
				if (stopped) return { done: true, value: undefined }

				if (!genFirstYielded) {
					genFirstYielded = true;
					return { done: false, value: firePulse() }
				}

				if (isInstant) return { done: true, value: undefined }

				const delay = delayMs();
				await new Promise<void>(res => { schedId = setTimeout(res, delay) });
				if (stopped) return { done: true, value: undefined }

				const val = firePulse();
				return { done: false, value: val }
			},

			[Symbol.asyncIterator](): typeof tickerObj { return this; },

			return(): Promise<IteratorResult<Tempo>> {
				doStop();
				return Promise.resolve({ done: true, value: undefined });
			},
			throw(e: any): Promise<never> {
				doStop();
				return Promise.reject(e);
			},
		})

		// ── Bootstrap ────────────────────────────────────────────────────────
		// Callback mode only: start the repeating background schedule and fire seed
		if (listeners.size > 0 && !stopped) {
			firePulse();
			scheduleNext();
		}

		return tickerObj as unknown as Tempo.Ticker
	} as typeof Tempo.ticker
})
