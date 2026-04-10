import { isObject, isFunction, isDefined, isUndefined, isEmpty, isNumber } from '#library/type.library.js'
import { Pledge } from '#library/pledge.class.js'
import { asArray, isNumeric } from '#library/coercion.library.js'
import { instant, normaliseFractionalDurations } from '#library/temporal.library.js'
import { markConfig } from '#library/symbol.library.js'

import { DURATIONS } from '../../tempo.enum.js'
import { defineExtension } from '../plugin.util.js'
import type { Tempo } from '../../tempo.class.js'

declare module '../../tempo.class.js' {
	namespace Tempo {
		const tickers: Ticker.Snapshot[]
		function ticker(interval?: Ticker.Interval): Ticker.Instance;
		function ticker(options: Ticker.Options): Ticker.Instance;
		function ticker(callback: Ticker.Callback): Ticker.Instance;
		function ticker(interval: Ticker.Interval, callback: Ticker.Callback): Ticker.Instance;
		function ticker(options: Ticker.Options, callback: Ticker.Callback): Ticker.Instance;
		function ticker(options: Ticker.Options, extraOptions: Ticker.Options): Ticker.Instance;
	}
}

/**
 * # Ticker
 * Merged documentation and exported API object.
*/
export const Ticker = {
	get active() {
		return asArray(ACTIVE_TICKERS)
			.map((t): Ticker.Snapshot => {
				const { next, ticks, limit, interval, stopped } = t.info;
				return { ticker: t, next, ticks, limit, interval, stopped };
			});
	}
}

/**
 * # Ticker
 * Unified namespace for Ticker types and public API.
 */
export namespace Ticker {
	/** ticker interval allowed types (interpreted as seconds) */
	export type Interval = number | string | bigint

	/** ticker configuration and stop conditions */
	export type Options = {
		years?: number; months?: number; weeks?: number; days?: number;
		hours?: number; minutes?: number; seconds?: number;
		milliseconds?: number; microseconds?: number; nanoseconds?: number;
		limit?: number;
		until?: Tempo.DateTime | Tempo.Options;
		seed?: Tempo.DateTime | Tempo.Options;
		catch?: boolean;
		[key: `#${string}`]: number | string;
	}

	/** callback function for Tempo.ticker() */
	export type Callback = (t: Tempo, stop: () => void) => void

	/** Internal descriptor for Ticker methods and properties */
	export interface Descriptor extends AsyncGenerator<Tempo, any>, AsyncDisposable, Disposable {
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

	/** Unified Ticker interface supporting generators, events, and manual pulsing (callable as stop()) */
	export interface Instance extends Descriptor {
		(): void
	}

	/** Summary of an active ticker */
	export type Snapshot = Descriptor['info'] & { ticker: Instance }
}

/**
 * ### ACTIVE_TICKERS
 * Internal registry for all active tickers.
 */
const ACTIVE_TICKERS = new Set<Ticker.Instance>();

/**
 * # TickerInstance
 * Stateful class for Tempo.Ticker instances.
 */
class TickerInstance implements Ticker.Descriptor {
	#TempoClass: typeof Tempo;
	#payload: Record<string, any> = {};
	#current: Tempo;
	#until: Tempo | undefined;
	#limit: number | undefined;
	#ticks = 0;
	#stopped = false;
	#genFirstYielded = false;
	#isForward = true;
	#isInstant = false;
	#schedId: any;
	#waiter: Pledge<void> | undefined;
	#listeners = new Set<Ticker.Callback>();
	#catchListeners = new Set<Ticker.Callback>();
	#self!: Ticker.Instance;

	constructor(TempoClass: typeof Tempo, arg1: any, arg2?: any) {
		this.#TempoClass = TempoClass;

		// ── Overload Parsing ─────────────────────────────────────────────────
		let rawOptions: any = {};
		let cb: Ticker.Callback | undefined;

		const isOptions = (obj: any) => isObject(obj) && !('epochMilliseconds' in obj);

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
			(this.#TempoClass as any).logError(markConfig(rawOptions), `Invalid Ticker interval or seed: ${String(arg1)}`);
		}

		const { limit: lmt, until: stopAt, seed: startAt, ...rest } = rawOptions;
		this.#limit = lmt;
		this.#until = stopAt ? new this.#TempoClass(isOptions(stopAt) ? undefined : stopAt, isOptions(stopAt) ? { ...rest, ...stopAt } : rest) : undefined;
		if (cb) this.#listeners.add(cb);

		const durationKeys = new Set(Object.keys(DURATIONS));
		for (const [key, val] of Object.entries(rest))
			if (isDefined(val) && (durationKeys.has(key) || key.startsWith('#')))
				this.#payload[key] = val;

		if (isEmpty(this.#payload)) {
			if (isDefined(startAt) && isUndefined(this.#limit)) this.#limit = 1;
			else this.#payload.seconds = 1;
		}

		normaliseFractionalDurations(this.#payload);
		this.#current = new this.#TempoClass(isOptions(startAt) ? undefined : startAt, isOptions(startAt) ? { ...rest, ...startAt } : rest);
	}

	/** explicitly set the proxy-self (called by factory) */
	bootstrap(proxy: Ticker.Instance) {
		this.#self = proxy;

		// ── Validation ───────────────────────────────────────────────
		if (!this.#current.isValid) {
			this.stop();
			(this.#TempoClass as any).logError(this.#current.config, `Invalid Ticker seed: ${String(this.#current)}`);
		} else if (this.#until && !this.#until.isValid) {
			this.stop();
			(this.#TempoClass as any).logError(this.#current.config, `Invalid Ticker boundary: ${String(this.#until)}`);
		} else {
			try {
				const firstStep = this.#current.add(this.#payload);
				if (!firstStep.isValid) throw new Error(`Invalid Ticker payload resolution for ${JSON.stringify(this.#payload)}`);
				this.#isForward = this.#TempoClass.compare(firstStep, this.#current) >= 0;
				this.#isInstant = firstStep.epoch.ns === this.#current.epoch.ns;
				if (Object.keys(this.#payload).some(k => k.startsWith('#'))) this.#current = firstStep;

				ACTIVE_TICKERS.add(this.#self);
				this.#runBootstrap();
			} catch (e: any) {
				this.stop();
				(this.#TempoClass as any).logError(this.#current.config, `Invalid Ticker payload resolution for ${JSON.stringify(this.#payload)}`, e);
				queueMicrotask(() => this.#catchListeners.forEach(l => l(this.#current, () => this.stop())));
				this.#isForward = true;
				this.#isInstant = false;
			}
		}
		return this.#self;
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

	#runBootstrap() {
		if (this.#listeners.size > 0 && !this.#stopped && !this.#schedId) {
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

	pulse(): Tempo {
		if (this.#stopped) return new (this.#TempoClass as any)(null, this.#current.config);

		const t = this.#current;
		if (!t.isValid) {
			this.stop();
			this.#catchListeners.forEach(l => l(t, () => this.stop()));
			return t;
		}

		this.#current = this.#isInstant ? t : t.add(this.#payload);
		this.#ticks++;

		if (isDefined(this.#limit) && this.#ticks >= this.#limit) this.stop();
		if (isDefined(this.#until)) {
			const cmp = this.#TempoClass.compare(t, this.#until);
			if ((this.#isForward && cmp >= 0) || (!this.#isForward && cmp <= 0)) this.stop();
		}

		if (this.#stopped && isDefined(this.#limit) && this.#limit === 0) return t;

		this.#listeners.forEach(l => l(t, () => this.stop()));
		return t;
	}

	on(event: 'pulse' | 'catch', cb: Ticker.Callback) {
		if (event === 'pulse') {
			this.#listeners.add(cb);
			this.#runBootstrap();
		}
		if (event === 'catch') this.#catchListeners.add(cb);
		return this;
	}

	stop() {
		this.#stopped = true;
		ACTIVE_TICKERS.delete(this.#self);
		if (this.#schedId) {
			clearTimeout(this.#schedId);
			this.#schedId = undefined;
		}
		if (this.#waiter && this.#waiter.isPending) {
			this.#waiter.resolve();
			this.#waiter = undefined;
		}
	}

	get info() {
		return {
			next: this.#current.clone(),
			ticks: this.#ticks,
			limit: this.#limit,
			interval: { ...this.#payload },
			stopped: this.#stopped
		}
	}

	async next(): Promise<IteratorResult<Tempo, any>> {
		if (this.#stopped) return { done: true, value: undefined };
		if (!this.#genFirstYielded) {
			this.#genFirstYielded = true;
			const delay = this.#delayMs();
			if (delay > 0) {
				this.#waiter = new Pledge<void>('Ticker.next');
				this.#schedId = setTimeout(() => this.#waiter?.resolve(), delay);
				await this.#waiter;
				this.#waiter = undefined;
				if (this.#stopped) return { done: true, value: undefined };
			}
			const t = this.pulse();
			if (this.#stopped && isDefined(this.#limit) && this.#limit === 0) return { done: true, value: undefined };
			return { done: false, value: t };
		}
		if (this.#isInstant) return { done: true, value: undefined };
		const delay = this.#delayMs();
		this.#waiter = new Pledge('Ticker.next') as Pledge<void>;
		this.#schedId = setTimeout(() => this.#waiter?.resolve(), delay);
		await this.#waiter;
		this.#waiter = undefined;
		if (this.#stopped) return { done: true, value: undefined };
		const t = this.pulse();
		if (this.#stopped && isDefined(this.#limit) && this.#limit === 0) return { done: true, value: undefined };
		return { done: false, value: t };
	}

	async return(): Promise<IteratorResult<Tempo, any>> {
		this.stop();
		return { done: true, value: undefined };
	}

	async throw(e: any): Promise<IteratorResult<Tempo, any>> {
		if (this.#waiter && this.#waiter.isPending) {
			this.#waiter.reject(e);
			this.#waiter = undefined;
		}
		this.stop();
		throw e;
	}

	[Symbol.asyncIterator]() { return this.#self; }
	async [Symbol.asyncDispose]() { this.stop(); }
	[Symbol.dispose]() { this.stop(); }
}

/**
 * # TickerExtension
 */
export const TickerExtension: Tempo.Extension = defineExtension((_options, TempoClass, _factory) => {
	(TempoClass as any).ticker = function (this: typeof Tempo, arg1: any, arg2?: any): Ticker.Instance {
		const instance = new TickerInstance(this, arg1, arg2);
		const proxy = new Proxy((() => instance.stop()) as any, {
			get: (_, prop) => {
				if (prop === 'pulse') return instance.pulse.bind(instance);
				if (prop === 'on') return instance.on.bind(instance);
				if (prop === 'stop') return instance.stop.bind(instance);
				if (prop === 'info') return instance.info;
				if (prop === 'next') return instance.next.bind(instance);
				if (prop === 'return') return instance.return.bind(instance);
				if (prop === 'throw') return instance.throw.bind(instance);
				if (prop === Symbol.asyncIterator) return () => proxy;
				if (prop === Symbol.asyncDispose) return instance[Symbol.asyncDispose].bind(instance);
				if (prop === Symbol.dispose) return instance[Symbol.dispose].bind(instance);
				return (instance as any)[prop];
			},
			apply: (target) => target()
		}) as unknown as Ticker.Instance;

		return instance.bootstrap(proxy);
	};

	(TempoClass as any).tickers = Ticker.active;
});
