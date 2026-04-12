import { Tempo } from '#tempo';
import '#tempo/plugin/extend/extend.ticker.js';

describe('Ticker Pledge Refactor Verification', () => {

    test('should terminate async iteration immediately when stop() is called (Pledge)', async () => {
        const t = Tempo.ticker({ seconds: 1 });
        let count = 0;

        const loopPromise = (async () => {
            for await (const tick of t) {
                count++;
                if (count === 1) {
                    // Stop the ticker while it's waiting for the NEXT tick (1s delay)
                    t.stop();
                }
            }
            return count;
        })();

        const start = Date.now();
        await loopPromise;
        const duration = Date.now() - start;

        // Duration should be low (the first pulse is immediate, but the stop should happen immediately)
        expect(duration).toBeLessThan(500);
        expect(count).toBe(1);
    });
});
