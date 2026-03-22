import { asNumber } from '#core/shared/coercion.library.js';
import { isNumber, isFunction } from '#core/shared/type.library.js';
/**
 * # TickerPlugin
 * Implementation of Tempo.ticker as an optional plugin.
 * Extends the Tempo class with pulse-based date-time generators.
 * Supports callbacks (Pattern 1) and Async Generators (Pattern 2).
 * Both patterns emit their initial state immediately upon initialization (T=0).
 */
export const TickerPlugin = (_options, TempoClass, _factory) => {
    const ticker = function (intervalMs, seedOrCallback, callback) {
        const interval = asNumber(intervalMs);
        if (!isNumber(interval))
            throw new RangeError('Tempo.ticker: intervalMs must be a finite numeric value');
        const [seed, cb] = isFunction(seedOrCallback)
            ? [undefined, seedOrCallback]
            : [seedOrCallback, callback];
        const now = () => Temporal.Now.instant().epochMilliseconds;
        let current = new TempoClass(seed);
        // Pattern 1 ~ Callbacks
        if (isFunction(cb)) {
            let id, stopped = (interval === 0);
            const start = now(), absInterval = Math.abs(interval);
            let ticks = 0;
            const stop = Object.assign(() => {
                stopped = true;
                clearTimeout(id);
            }, { [Symbol.dispose]: () => stop() });
            (function tick() {
                cb(current.clone(), stop); // unified emission
                if (!stopped) {
                    const delay = Math.max(0, start + (++ticks * absInterval) - now());
                    id = setTimeout(() => {
                        current = current.add({ milliseconds: interval }); // increment (or decrement)
                        tick(); // recurse
                    }, delay);
                }
            })(); // immediately-invoke tick()
            return stop;
        }
        // Pattern 2 ~ Async Generators
        const generator = (async function* () {
            const start = now(), absInterval = Math.abs(interval);
            let ticks = 0;
            while (true) {
                yield current.clone(); // emit immediately
                if (interval === 0)
                    break; // support for 'emit-once'
                const delay = Math.max(0, start + (++ticks * absInterval) - now());
                await new Promise(resolve => setTimeout(resolve, delay));
                current = current.add({ milliseconds: interval }); // increment (or decrement)
            }
        })();
        return Object.assign(generator, {
            [Symbol.asyncDispose]: async () => { await generator.return(undefined); }
        });
    };
    TempoClass.ticker = ticker;
};
//# sourceMappingURL=plugin.ticker.js.map