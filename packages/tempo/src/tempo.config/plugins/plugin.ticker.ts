import { asNumber } from '#core/shared/coercion.library.js';
import { isNumber, isFunction } from '#core/shared/type.library.js';
import type { Tempo } from '#core/tempo.class.js';

declare module '#core/tempo.class.js' {
	namespace Tempo {
		/** ticker 'intervalMs' allowed types */								type TickerInterval = number | string | bigint;
		/** callback function for Tempo.ticker() */							type TickerCallback = (t: Tempo, stop: () => void) => void;
		/** AsyncGenerator return type for Tempo.ticker() */		type TickerGenerator = AsyncGenerator<Tempo> & AsyncDisposable;
		/** stop() function return type for Tempo.ticker() */		type TickerStop = (() => void) & Disposable;
		/** combined return type for Tempo.ticker() */					type TickerResult = TickerGenerator | TickerStop;

		function ticker(intervalMs: TickerInterval): TickerGenerator;
		function ticker(intervalMs: TickerInterval, seed: Tempo.DateTime | Tempo.Options): TickerGenerator;
		function ticker(intervalMs: TickerInterval, callback: TickerCallback): TickerStop;
		function ticker(intervalMs: TickerInterval, seed: Tempo.DateTime | Tempo.Options, callback: TickerCallback): TickerStop;
	}
}

/**
 * # TickerPlugin
 * Implementation of Tempo.ticker as an optional plugin.
 * Extends the Tempo class with pulse-based date-time generators.  
 * Supports callbacks (Pattern 1) and Async Generators (Pattern 2).  
 * Both patterns emit their initial state immediately upon initialization (T=0).
 */
export const TickerPlugin: Tempo.Plugin = (_options, TempoClass, _factory) => {
	const ticker = function (intervalMs, seedOrCallback, callback): Tempo.TickerResult {
		const interval = asNumber(intervalMs);
		if (!isNumber(interval))
			throw new RangeError('Tempo.ticker: intervalMs must be a finite numeric value');

		const [seed, cb] = isFunction(seedOrCallback)
			? [undefined, seedOrCallback]
			: [seedOrCallback, callback];

		const now = () => Temporal.Now.instant().epochMilliseconds;
		let current = new TempoClass(seed as Tempo.DateTime);

		// Pattern 1 ~ Callbacks
		if (isFunction(cb)) {
			let id: ReturnType<typeof setTimeout> | undefined, stopped = (interval === 0);
			const start = now(), absInterval = Math.abs(interval);
			let ticks = 0;
			const stop = Object.assign(() => {
				stopped = true;
				clearTimeout(id);
			}, { [Symbol.dispose]: () => stop() }) as Tempo.TickerStop;

			(function tick() {
				cb(current.clone(), stop);													// unified emission

				if (!stopped) {
					const delay = Math.max(0, start + (++ticks * absInterval) - now());

					id = setTimeout(() => {
						current = current.add({ milliseconds: interval });// increment (or decrement)
						tick();																					// recurse
					}, delay);
				}
			})();																									// immediately-invoke tick()

			return stop;
		}

		// Pattern 2 ~ Async Generators
		const generator = (async function* () {
			const start = now(), absInterval = Math.abs(interval);
			let ticks = 0;

			while (true) {
				yield current.clone();															// emit immediately
				if (interval === 0) break;													// support for 'emit-once'

				const delay = Math.max(0, start + (++ticks * absInterval) - now());
				await new Promise(resolve => setTimeout(resolve, delay));
				current = current.add({ milliseconds: interval });	// increment (or decrement)
			}
		})() as Tempo.TickerGenerator;

		return Object.assign(generator, {
			[Symbol.asyncDispose]: async () => { await generator.return(undefined) }
		});
	} as typeof Tempo.ticker;

	TempoClass.ticker = ticker;
}
