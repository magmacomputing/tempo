import type { Tempo } from '#core/tempo.class.js';
declare module '#core/tempo.class.js' {
    namespace Tempo {
        /** ticker 'intervalMs' allowed types */ type TickerInterval = number | string | bigint;
        /** callback function for Tempo.ticker() */ type TickerCallback = (t: Tempo, stop: () => void) => void;
        /** AsyncGenerator return type for Tempo.ticker() */ type TickerGenerator = AsyncGenerator<Tempo> & AsyncDisposable;
        /** stop() function return type for Tempo.ticker() */ type TickerStop = (() => void) & Disposable;
        /** combined return type for Tempo.ticker() */ type TickerResult = TickerGenerator | TickerStop;
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
export declare const TickerPlugin: Tempo.Plugin;
