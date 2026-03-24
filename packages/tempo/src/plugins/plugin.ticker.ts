import { asNumber, isNumeric } from '#library/coercion.library.js';
import { isNumber, isObject, isFunction } from '#library/type.library.js';
import type { Tempo } from '#tempo/tempo.class.js';

declare module '#tempo/tempo.class.js' {
	namespace Tempo {
		/** ticker interval allowed types */										type TickerInterval = number | string | bigint | Temporal.DurationLike;
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
		function ticker(callback: TickerCallback): TickerStop;
		function ticker(interval: TickerInterval): TickerGenerator;
		function ticker(options: TickerOptions): TickerGenerator;
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
	const ticker = function (intervalOrOptionsOrCallback: any, callback?: any): Tempo.TickerResult {
		const isFn = isFunction(intervalOrOptionsOrCallback);
		const options = (isObject(intervalOrOptionsOrCallback) && !isFn && !('epochMilliseconds' in intervalOrOptionsOrCallback))
			? intervalOrOptionsOrCallback as Tempo.TickerOptions
			: { interval: isFn ? undefined : intervalOrOptionsOrCallback as Tempo.TickerInterval };

		const cb = isFn ? intervalOrOptionsOrCallback as Tempo.TickerCallback : callback;
		let { interval, limit, until: stopAt, seed, ...duration } = options as any;

		// Default to 1s interval if none provided, or use flattened duration keys
		if (interval === undefined) {
			if (Object.keys(duration).length > 0) interval = duration;
			else interval = 1;
		}

		const isDuration = isObject(interval) && !isNumeric(interval);
		const intervalMs = !isDuration ? asNumber(interval as any) * 1000 : 0;

		if (!isDuration && !isNumber(intervalMs))
			throw new RangeError('Tempo.ticker: interval must be a numeric value (seconds) or a Duration object');

		const until = stopAt ? new TempoClass(stopAt as Tempo.DateTime) : undefined;
		const now = () => Temporal.Now.instant().epochMilliseconds;
		let current = new TempoClass(seed as Tempo.DateTime);

		// Helper to check if we should stop
		const shouldStop = (ticks: number) => {
			if (limit !== undefined && ticks >= limit) return true;
			if (until !== undefined) {
				const comparison = TempoClass.compare(current, until);
				const isForward = isDuration ? (Temporal.Duration.from(interval as any).sign >= 0) : (intervalMs >= 0);
				if (isForward && comparison >= 0) return true;
				if (!isForward && comparison <= 0) return true;
			}
			return false;
		};

		const payload = isDuration ? (interval as any) : { milliseconds: intervalMs };

		// Pattern 1 ~ Callbacks
		if (isFunction(cb)) {
			let id: ReturnType<typeof setTimeout> | undefined, stopped = (intervalMs === 0 && !isDuration);
			let ticks = 0;

			const stop = Object.assign(() => {
				stopped = true;
				clearTimeout(id);
			}, { [Symbol.dispose]: () => stop() }) as Tempo.TickerStop;

			(function tick() {
				cb(current.clone(), stop);													// unified emission
				ticks++;

				if (!stopped && !shouldStop(ticks)) {
					const next = current.add(payload);
					const nextMs = next.epoch.ms as number;
					const delay = Math.max(0, nextMs - now());

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

				if ((intervalMs === 0 && !isDuration) || shouldStop(ticks)) break;

				const next = current.add(payload);
				const nextMs = next.epoch.ms as number;
				const delay = Math.max(0, nextMs - now());

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
