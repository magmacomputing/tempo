import type { Tempo } from '.././tempo.class.js';
declare module '.././tempo.class.js' {
    namespace Tempo {
        /** ticker interval allowed types */ type TickerInterval = number | string | bigint | Temporal.DurationLike;
        /** ticker stop condition options */ type TickerOptions = Partial<Temporal.DurationLike> & {
            interval?: TickerInterval;
            limit?: number;
            until?: Tempo.DateTime | Tempo.Options;
            seed?: Tempo.DateTime | Tempo.Options;
        };
        /** callback function for Tempo.ticker() */ type TickerCallback = (t: Tempo, stop: () => void) => void;
        /** AsyncGenerator return type for Tempo.ticker() */ type TickerGenerator = AsyncGenerator<Tempo> & AsyncDisposable;
        /** stop() function return type for Tempo.ticker() */ type TickerStop = (() => void) & Disposable;
        /** combined return type for Tempo.ticker() */ type TickerResult = TickerGenerator | TickerStop;
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
export declare const TickerPlugin: Tempo.Plugin;
