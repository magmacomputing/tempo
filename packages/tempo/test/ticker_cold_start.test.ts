import { Tempo } from '#tempo';
import '#tempo/plugin/extend/extend.ticker.js';

describe('Ticker Cold-Start Resolution', () => {
    beforeEach(() => { Tempo.init(); });

    test('should start pulsing when a listener is added post-creation', async () => {
        // 1. Create a ticker without a callback (should remain idle)
        const t = Tempo.ticker({ seconds: 0.1 });
        let count = 0;

        // 2. Wait to ensure it remains idle
        await new Promise(resolve => setTimeout(resolve, 250));
        expect(count).toBe(0);

        // 3. Add a listener (should trigger bootstrap)
        t.on('pulse', () => { count++; });

        // 4. Verify pulsing has started
        await new Promise(resolve => setTimeout(resolve, 250));
        expect(count).toBeGreaterThan(0);
        t.stop();
    });
});
