import { asNumber, isNumeric } from '.././lib/coercion.library.js';
import { isNumber, isObject, isFunction } from '.././lib/type.library.js';
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
export const TickerPlugin = (_options, TempoClass, _factory) => {
    const ticker = function (intervalOrOptionsOrCallback, callback) {
        const isFn = isFunction(intervalOrOptionsOrCallback);
        const options = (isObject(intervalOrOptionsOrCallback) && !isFn && !('epochMilliseconds' in intervalOrOptionsOrCallback))
            ? intervalOrOptionsOrCallback
            : { interval: isFn ? undefined : intervalOrOptionsOrCallback };
        const cb = isFn ? intervalOrOptionsOrCallback : callback;
        let { interval, limit, until: stopAt, seed, ...duration } = options;
        // Default to 1s interval if none provided, or use flattened duration keys
        if (interval === undefined) {
            if (Object.keys(duration).length > 0)
                interval = duration;
            else
                interval = 1;
        }
        const isDuration = isObject(interval) && !isNumeric(interval);
        const intervalMs = !isDuration ? asNumber(interval) * 1000 : 0;
        if (!isDuration && !isNumber(intervalMs))
            throw new RangeError('Tempo.ticker: interval must be a numeric value (seconds) or a Duration object');
        const until = stopAt ? new TempoClass(stopAt) : undefined;
        const now = () => Temporal.Now.instant().epochMilliseconds;
        let current = new TempoClass(seed);
        // Helper to check if we should stop
        const shouldStop = (ticks) => {
            if (limit !== undefined && ticks >= limit)
                return true;
            if (until !== undefined) {
                const comparison = TempoClass.compare(current, until);
                const isForward = isDuration ? (Temporal.Duration.from(interval).sign >= 0) : (intervalMs >= 0);
                if (isForward && comparison >= 0)
                    return true;
                if (!isForward && comparison <= 0)
                    return true;
            }
            return false;
        };
        const payload = isDuration ? interval : { milliseconds: intervalMs };
        // Pattern 1 ~ Callbacks
        if (isFunction(cb)) {
            let id, stopped = (intervalMs === 0 && !isDuration);
            let ticks = 0;
            const stop = Object.assign(() => {
                stopped = true;
                clearTimeout(id);
            }, { [Symbol.dispose]: () => stop() });
            (function tick() {
                cb(current.clone(), stop); // unified emission
                ticks++;
                if (!stopped && !shouldStop(ticks)) {
                    const next = current.add(payload);
                    const nextMs = next.epoch.ms;
                    const delay = Math.max(0, nextMs - now());
                    id = setTimeout(() => {
                        current = next; // advance virtual clock
                        tick(); // recurse
                    }, delay);
                }
            })(); // immediately-invoke tick()
            return stop;
        }
        // Pattern 2 ~ Async Generators
        const generator = (async function* () {
            let ticks = 0;
            while (true) {
                yield current.clone(); // emit immediately
                ticks++;
                if ((intervalMs === 0 && !isDuration) || shouldStop(ticks))
                    break;
                const next = current.add(payload);
                const nextMs = next.epoch.ms;
                const delay = Math.max(0, nextMs - now());
                await new Promise(resolve => setTimeout(resolve, delay));
                current = next; // advance virtual clock
            }
        })();
        return Object.assign(generator, {
            [Symbol.asyncDispose]: async () => { await generator.return(undefined); }
        });
    };
    TempoClass.ticker = ticker;
};
//# sourceMappingURL=plugin.ticker.js.map