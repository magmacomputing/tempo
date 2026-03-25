import { isObject, isFunction, isDefined, isEmpty } from '#library/type.library.js';
import { ifDefined } from '#library/object.library.js';
import { DURATIONS } from '#tempo/tempo.enum.js';
import type { Tempo } from '#tempo/tempo.class.js';

declare module '#tempo/tempo.class.js' {
	namespace Tempo {
		/** ticker interval allowed types */										type TickerInterval = number | string | bigint;
		/** ticker stop condition options */										type TickerOptions = Partial<Temporal.DurationLike> & {
		interval?: TickerInterval;
		limit?: number;
		until?: Tempo.DateTime | Tempo.Options;
		seed?: Tempo.DateTime | Tempo.Options;
	}

		/** callback function for Tempo.ticker() */							type TickerCallback = (t: Tempo, stop: () => void) => void;
		/** AsyncGenerator return type for Tempo.ticker() */		type TickerGenerator = AsyncGenerator<Tempo> & AsyncDisposable;
		/** stop() function return type for Tempo.ticker() */		type TickerStop = (() => void) & Disposable;
		/** combined return type for Tempo.ticker() */					type TickerResult = TickerGenerator | TickerStop;
		function ticker(): TickerGenerator;
		function ticker(interval: TickerInterval): TickerGenerator;
		function ticker(options: TickerOptions): TickerGenerator;
		function ticker(callback: TickerCallback): TickerStop;
		function ticker(interval: TickerInterval, callback: TickerCallback): TickerStop;
		function ticker(options: TickerOptions, callback: TickerCallback): TickerStop;
	}
}

/**
 * # TickerPlugin
 * Implementation of Tempo.ticker as an optional plugin.
 * Extends the Tempo class with pulse-based date-time generators.  
 * Supports callbacks (Pattern 1) and Async Generators (Pattern 2).  
 * 
 * ## Enhancements:
 * - **Duration Intervals**: Use `{ seconds: 1 }` or `{ months: 1 }` for semantic, variable-length pulses.
 * - **Stop Conditions**: Set `limit` (tick count) or `until` (virtual deadline) via `TickerOptions`.
 * - **Flattened Options**: Direct support for duration keys (e.g. `{ seconds: 5, seed: 'now' }`).
 * - **Smart Defaults**: Defaults to a 1-second pulse if no interval is specified.
 */
export const TickerPlugin: Tempo.Plugin = (_options, TempoClass, _factory) => {
	const ticker = function (arg1: any, arg2?: any): Tempo.TickerResult {
		let options: Tempo.TickerOptions = {};
		let cb: Tempo.TickerCallback | undefined;

		if (isFunction(arg1)) {
			cb = arg1;
		} else if (isObject(arg1) && !('epochMilliseconds' in arg1)) {
			options = Object.assign({}, arg1);
			cb = arg2;
		} else {
			options.interval = arg1;
			cb = arg2;
		}

		const { interval, limit, until: stopAt, seed, ...rest } = options;

		// 1. Extract valid Duration fields from the options (flattened duration pattern)
		const duration = DURATIONS.keys().reduce((acc, dur) =>
			Object.assign(acc, ifDefined({ [dur]: rest[dur] })), {} as any);

		// 2. Create a plain object payload and a Temporal.Duration for logic
		const payload = !isEmpty(duration)
			? duration
			: { milliseconds: Math.round(Number(interval ?? 1) * 1000) };

		const elapse = Temporal.Duration.from(payload as any);
		const isForward = elapse.sign >= 0;
		const isInstant = elapse.blank;

		const until = stopAt ? new TempoClass(stopAt as Tempo.DateTime) : undefined;
		const now = () => Temporal.Now.instant().epochMilliseconds;
		let current = new TempoClass(seed as Tempo.DateTime);

		// Helper to check if we should stop
		const shouldStop = (ticks: number) => {
			if (isDefined(limit) && ticks >= limit) return true;
			if (isDefined(until)) {
				const comparison = TempoClass.compare(current, until);
				if (isForward && comparison >= 0) return true;
				if (!isForward && comparison <= 0) return true;
			}
			return false;
		}

		// Pattern 1 ~ Callbacks
		if (isFunction(cb)) {
			let id: ReturnType<typeof setTimeout> | undefined, stopped = isInstant;
			let ticks = 0;

			const stop = Object.assign(() => {
				stopped = true;
				clearTimeout(id);
			}, { [Symbol.dispose]: () => stop() }) as Tempo.TickerStop;

			(function tick() {
				cb!(current.clone(), stop);													// unified emission
				ticks++;

				if (!stopped && !shouldStop(ticks)) {
					const next = current.add(payload);
					const delay = Math.max(0, (next.epoch.ms as number) - now());

					id = setTimeout(() => {
						current = next;																	// advance virtual clock
						tick();																					// recurse
					}, delay);
				}
			})();																									// immediately-invoke tick()

			return stop;
		}

		// Pattern 2 ~ Async Generators
		const generator = (async function* () {
			let ticks = 0;

			while (true) {
				yield current.clone();															// emit immediately
				ticks++;

				if (isInstant || shouldStop(ticks)) break;

				const next = current.add(payload);
				const delay = Math.max(0, (next.epoch.ms as number) - now());

				await new Promise(resolve => setTimeout(resolve, delay));
				current = next;																			// advance virtual clock
			}
		})() as Tempo.TickerGenerator;

		return Object.assign(generator, {
			[Symbol.asyncDispose]: async () => { await generator.return(undefined) }
		});
	} as typeof Tempo.ticker;

	TempoClass.ticker = ticker;
}
