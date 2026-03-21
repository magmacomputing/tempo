import { asNumber } from '#core/shared/number.library.js';
import { isNumber, isFunction } from '#core/shared/type.library.js';
import type { Tempo } from '#core/tempo.class.js';

declare module '#core/tempo.class.js' {
	namespace Tempo {
		let ticker: {
			(intervalMs: number | string | bigint): AsyncGenerator<Tempo> & AsyncDisposable;
			(intervalMs: number | string | bigint, seed: Tempo.DateTime): AsyncGenerator<Tempo> & AsyncDisposable;
			(intervalMs: number | string | bigint, callback: (t: Tempo, stop: () => void) => void): (() => void) & Disposable;
			(intervalMs: number | string | bigint, seed: Tempo.DateTime, callback: (t: Tempo, stop: () => void) => void): (() => void) & Disposable;
		};
	}
}

/**
 * # TickerPlugin
 * Implementation of Tempo.ticker as an optional plugin.
 * Extends the Tempo class with pulse-based date-time generators.
 */
export const TickerPlugin: Tempo.Plugin = (_options, TempoClass, _factory) => {

	/**
	 * ## Tempo.ticker()
	 * Emits a pulse of `Tempo` objects at the specified interval.
	 * All tickers emit their initial state immediately upon initialization (T=0).
	 * Supports Async Generators (Pattern 1) or callbacks (Pattern 2).
	 */
	(TempoClass as any).ticker = function (
		intervalMs: number | string | bigint,
		seedOrCallback?: Tempo.DateTime | ((t: Tempo, stop: () => void) => void),
		callback?: (t: Tempo, stop: () => void) => void
	): (AsyncGenerator<Tempo> & AsyncDisposable) | ((() => void) & Disposable) {
		const interval = asNumber(intervalMs as any);
		if (!isNumber(interval))
			throw new RangeError('Tempo.ticker: intervalMs must be a finite numeric value');

		const [seed, cb] = isFunction(seedOrCallback)
			? [void 0, seedOrCallback]
			: [seedOrCallback, callback];

		let current = new TempoClass(seed);

		const now = () => (globalThis as any).Temporal.Now.instant().epochMilliseconds;

		// Pattern 2 ~ Callbacks
		if (isFunction(cb)) {
			let id: ReturnType<typeof setTimeout> | undefined, stopped = (interval === 0);
			const start = now(), absInterval = Math.abs(interval);
			let ticks = 0;
			const stop = Object.assign(() => {
				stopped = true;
				clearTimeout(id);
			}, { [Symbol.dispose]: () => stop() });

			(function tick() {
				cb(current.clone(), stop);													// unified emission

				if (!stopped) {
					const delay = Math.max(0, start + (++ticks * absInterval) - now());
					id = setTimeout(() => {
						current = current.add({ milliseconds: interval });// increment (or decrement)
						tick();
					}, delay);
				}
			})();

			return stop;
		}

		// Pattern 1 ~ Async Generators
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
		})();

		return Object.assign(generator, {
			[Symbol.asyncDispose]: async () => { await generator.return(void 0 as any) }
		});
	}
}
