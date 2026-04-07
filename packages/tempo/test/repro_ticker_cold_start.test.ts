import { Tempo } from '#tempo/tempo.class.js';
import '#tempo/plugins/plugin.ticker.js';

describe('Ticker Cold-Start Repro', () => {
    beforeEach(() => Tempo.init());

    test('should start pulsing when a listener is added later', async () => {
        // 1. Create a ticker without a callback (should remain idle)
        const t = Tempo.ticker({ seconds: 0.1 });
        let count = 0;

        // 2. Wait for some time to see if it pulses spontaneously
        await new Promise(resolve => setTimeout(resolve, 250));
        expect(count).toBe(0);

        // 3. Add a listener now (should trigger bootstrap)
        t.on('pulse', () => {
            count++;
        });

        // 4. Wait again and check if it has pulsed
        await new Promise(resolve => setTimeout(resolve, 250));

        // If fixed, count should be > 0.
        expect(count).toBeGreaterThan(0);
        t.stop();
    });
});
