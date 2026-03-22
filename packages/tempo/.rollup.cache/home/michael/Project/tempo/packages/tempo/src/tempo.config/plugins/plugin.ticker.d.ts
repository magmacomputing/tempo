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
export declare const TickerPlugin: Tempo.Plugin;
