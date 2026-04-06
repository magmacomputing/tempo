import { isObject, isFunction, isDefined, isUndefined, isEmpty, isNumber } from '#library/type.library.js'
import { isNumeric } from '#library/coercion.library.js'
import { instant, normaliseFractionalDurations } from '#library/temporal.library.js'
import { DURATIONS } from '#tempo/tempo.enum.js'
import { markConfig } from '#library/symbol.library.js'
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
 * # Ticker
 * Unified Ticker supporting generators, events, and manual pulsing.
 * Management is handled via the static .active registry.
 */
export class Ticker implements AsyncGenerator<Tempo, any>, AsyncDisposable, Disposable {
	static #active = new Set<Ticker>();

	/** Return a summary of all active tickers */
	static get active() {
		return Array.from(this.#active)
			.map(t => ({ ticker: (t as any).proxy ?? t, ...t.info } as unknown as Tempo.TickerSnapshot));
	}

	#payload: Record<string, any>;
	#current: Tempo;
	#until: Tempo | undefined;
	#limit?: number;
	#ticks = 0;
	#stopped = false;
	#genFirstYielded = false;
	#isForward: boolean;
	#isInstant: boolean;
	#schedId: any;
	#listeners = new Set<Tempo.TickerCallback>();
	#TempoClass: typeof Tempo;

	constructor(TempoClass: typeof Tempo, arg1: any, arg2?: any) {
		this.#TempoClass = TempoClass;
		let rawOptions: any = {};
		let cb: Tempo.TickerCallback | undefined;

		const isOptions = (obj: any) => isObject(obj) && !('epochMilliseconds' in obj);

		// ── Parse overloads ──────────────────────────────────────────────────
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
					if (isNumeric(arg1) && Number.isFinite(num)) {
						rawOptions.seconds = num;
					} else {
						rawOptions.seed = arg1;
					}
				}
				if (isFunction(arg2)) cb = arg2;
				else if (isOptions(arg2)) Object.assign(rawOptions, arg2);
		}

		// Validation: ensure we have a valid interval or seed
		const isSeed = isDefined(rawOptions.seed) && (!isNumber(rawOptions.seed) || (Number.isFinite(rawOptions.seed as number) && !Number.isNaN(rawOptions.seed as number)));
		const isInterval = isDefined(rawOptions.seconds) && Number.isFinite(rawOptions.seconds) && !Number.isNaN(rawOptions.seconds);

		if (isDefined(arg1) && !isInterval && !isSeed) {
			(TempoClass as any).catch(markConfig(rawOptions), `Invalid Ticker interval or seed: ${String(arg1)}`);
		}

		const { limit, until: stopAt, seed: startAt, ...rest } = rawOptions;
		this.#limit = limit;
		this.#until = stopAt ? new TempoClass(isOptions(stopAt) ? undefined : stopAt, isOptions(stopAt) ? { ...rest, ...stopAt } : rest) : undefined;
		if (cb) this.#listeners.add(cb);

		const durationKeys = new Set(Object.keys(DURATIONS));
		this.#payload = {};
		for (const [key, val] of Object.entries(rest))
			if (isDefined(val) && (durationKeys.has(key) || key.startsWith('#')))
				this.#payload[key] = val;

		if (isEmpty(this.#payload)) {
			if (isDefined(startAt) && isUndefined(limit)) this.#limit = 1;
			else this.#payload.seconds = 1;
		}

		normaliseFractionalDurations(this.#payload);

		const probe = new TempoClass();
		const probeShifted = probe.add(this.#payload);
		this.#isForward = TempoClass.compare(probeShifted, probe) >= 0;
		this.#isInstant = probeShifted.epoch.ns === probe.epoch.ns;

		this.#current = new TempoClass(isOptions(startAt) ? undefined : startAt, isOptions(startAt) ? { ...rest, ...startAt } : rest);

		// Register in global registry
		Ticker.#active.add(this);

		// Bootstrap
		if (this.#listeners.size > 0 && !this.#stopped) {
			const delay = this.#delayMs();
			if (delay > 0) {
				this.#schedId = setTimeout(() => {
					if (!this.#stopped) {
						this.pulse();
						this.#scheduleNext();
					}
				}, delay);
			} else {
				this.pulse();
				this.#scheduleNext();
			}
		}
	}

	#delayMs() {
		return Math.max(0, Math.round(this.#current.epoch.ms - instant().epochMilliseconds));
	}

	#scheduleNext() {
		if (this.#stopped || this.#isInstant) return;
		this.#schedId = setTimeout(() => {
			if (!this.#stopped) {
				this.pulse();
				this.#scheduleNext();
			}
		}, this.#delayMs());
	}

	/** Manual pulse — advances state and notifies listeners */
	pulse(): Tempo {
		if (this.#stopped) return this.#current.clone();

		const t = this.#current.clone();
		this.#current = this.#current.add(this.#payload);
		this.#ticks++;

		if (isDefined(this.#limit) && this.#ticks >= this.#limit) this.stop();
		if (isDefined(this.#until)) {
			const cmp = this.#TempoClass.compare(t, this.#until);
			if ((this.#isForward && cmp >= 0) || (!this.#isForward && cmp <= 0)) this.stop();
		}

		this.#listeners.forEach(l => l(t, () => this.stop()));
		return t;
	}

	on(event: 'pulse', cb: Tempo.TickerCallback): this {
		if (event === 'pulse') this.#listeners.add(cb);
		return this;
	}

	stop(): void {
		this.#stopped = true;
		Ticker.#active.delete(this);
		if (this.#schedId) {
			clearTimeout(this.#schedId);
			this.#schedId = undefined;
		}
	}

	get info(): Tempo.Ticker['info'] {
		return {
			next: this.#current.clone(),
			ticks: this.#ticks,
			limit: this.#limit,
			interval: { ...this.#payload },
			stopped: this.#stopped
		};
	}

	async next(): Promise<IteratorResult<Tempo, any>> {
		if (this.#stopped) return { done: true, value: undefined };

		if (!this.#genFirstYielded) {
			this.#genFirstYielded = true;
			const delay = this.#delayMs();
			if (delay > 0) {
				await new Promise<void>(res => { this.#schedId = setTimeout(res, delay) });
				if (this.#stopped) return { done: true, value: undefined };
			}
			return { done: false, value: this.pulse() };
		}

		if (this.#isInstant) return { done: true, value: undefined };

		const delay = this.#delayMs();
		await new Promise<void>(res => { this.#schedId = setTimeout(res, delay) });
		if (this.#stopped) return { done: true, value: undefined };

		return { done: false, value: this.pulse() };
	}

	[Symbol.asyncIterator](): this { return this; }
	async [Symbol.asyncDispose](): Promise<void> { this.stop(); }
	[Symbol.dispose](): void { this.stop(); }

	async return(): Promise<IteratorResult<Tempo>> {
		this.stop();
		return { done: true, value: undefined };
	}

	async throw(e: any): Promise<never> {
		this.stop();
		throw e;
	}
}

/**
 * # TickerPlugin
 * Exposes the .ticker() factory method to the Tempo class.
 * Management is handled via the exported Ticker class.
 */
export const TickerPlugin = definePlugin((_options, TempoClass, _factory) => {
	TempoClass.ticker = function (arg1: any, arg2?: any): Tempo.Ticker {
		const instance = new Ticker(TempoClass, arg1, arg2);

		// Return a proxy that allows the instance to be called as a function (to stop it)
		// while still behaving like a Ticker instance.
		const proxy = new Proxy(() => instance.stop(), {
			get: (_, prop) => {
				const val = (instance as any)[prop];
				return typeof val === 'function' ? val.bind(instance) : val;
			},
			getOwnPropertyDescriptor: (_, prop) => Object.getOwnPropertyDescriptor(instance, prop),
			has: (_, prop) => prop in instance,
			ownKeys: () => Reflect.ownKeys(instance)
		}) as unknown as Tempo.Ticker;

		(instance as any).proxy = proxy;						// store proxy on instance for .active lookup
		return proxy;
	} as typeof Tempo.ticker;
});
