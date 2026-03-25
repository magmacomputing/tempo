import { Tempo } from '#tempo/tempo.class.js';
import { Pledge } from '#library/pledge.class.js';
import { TickerPlugin } from '#tempo/plugins/plugin.ticker.js';

Tempo.extend(TickerPlugin);

describe('Static Symbol.dispose', () => {

	test('Tempo static dispose resets global config', () => {
		// 1. Set a non-default config
		Tempo.init({ timeZone: 'Africa/Cairo' });
		expect(Tempo.config.timeZone).toBe('Africa/Cairo');

		// 2. Dispose
		if (typeof Symbol.dispose === 'symbol') {
			Tempo[Symbol.dispose]();

			// 3. Verify reset (should match system timezone)
			const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
			expect(Tempo.config.timeZone).toBe(timeZone);
		}
	});

	test('Pledge static dispose resets static state', () => {
		// 1. Set a non-default static config
		Pledge.init({ debug: true, tag: 'TestPledge' });
		expect(Pledge.status.debug).toBe(true);
		expect(Pledge.status.tag).toBe('TestPledge');

		// 2. Dispose
		if (typeof Symbol.dispose === 'symbol') {
			Pledge[Symbol.dispose]();

			// 3. Verify reset
			expect(Pledge.status.debug).toBeFalsy();
			expect(Pledge.status.tag).toBeUndefined();
		}
	});

});

describe('Ticker Symbol.dispose', () => {

	test('Ticker callback returns a disposable function', async () => {
		let count = 0;
		const stop = Tempo.ticker(0.05, () => { count++ });

		expect(typeof stop).toBe('function');

		if (typeof Symbol.dispose === 'symbol') {
			expect(stop[Symbol.dispose]).toBeDefined();
			expect(typeof stop[Symbol.dispose]).toBe('function');

			// Use the dispose method instead of calling the function directly
			stop[Symbol.dispose]();

			const finalCount = count;
			await new Promise(resolve => setTimeout(resolve, 150));
			expect(count).toBe(finalCount); // Should have stopped
		} else {
			stop(); // Fallback for environments without the symbol
		}
	});

	test('Ticker generator returns an async disposable', async () => {
		const ticker = Tempo.ticker(0.02);

		if (typeof Symbol.asyncDispose === 'symbol') {
			expect(ticker[Symbol.asyncDispose]).toBeDefined();
			expect(typeof ticker[Symbol.asyncDispose]).toBe('function');

			let i = 0;
			for await (const t of ticker) {
				expect(t).toBeDefined();
				if (++i === 2) break;
			}

			// Explicitly call asyncDispose (though break does it via .return())
			await ticker[Symbol.asyncDispose]();

			const result = await ticker.next();
			expect(result.done).toBe(true);
		}
	});

	test('Ticker callback seeding (Virtual Clock)', async () => {
		const seed = '2024-01-01T00:00:00';
		const results: string[] = [];
		const stop = Tempo.ticker({ seed, interval: 0.05 }, (t) => {
			results.push(t.format('sortTime'));
		});

		await new Promise(resolve => setTimeout(resolve, 125)); // Should have 3 ticks (0ms: seed, 50ms: +50, 100ms: +100)
		stop();

		expect(results[0]).toBe(new Tempo(seed).format('sortTime'));
		expect(results[1]).toBe(new Tempo(seed).add({ milliseconds: 50 }).format('sortTime'));
		expect(results[2]).toBe(new Tempo(seed).add({ milliseconds: 100 }).format('sortTime'));
	});

	test('Ticker generator seeding (Virtual Clock)', async () => {
		const seed = '2024-01-01T00:00:00';
		const ticker = Tempo.ticker({ seed, interval: 0.05 });
		const results: string[] = [];

		let i = 0;
		for await (const t of ticker) {
			results.push(t.format('sortTime'));
			if (++i === 3) break;
		}

		expect(results[0]).toBe(new Tempo(seed).format('sortTime'));
		expect(results[1]).toBe(new Tempo(seed).add({ milliseconds: 50 }).format('sortTime'));
		expect(results[2]).toBe(new Tempo(seed).add({ milliseconds: 100 }).format('sortTime'));
	});

	test('Tempo static dispose resets global config (using syntax)', () => {
		const systemTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
		{
			using _ = Tempo;
			Tempo.init({ timeZone: 'Africa/Cairo' });
			expect(Tempo.config.timeZone).toBe('Africa/Cairo');
		}
		// Should be reset to system default after block
		expect(Tempo.config.timeZone).toBe(systemTZ);
	});

	test('Ticker generator (await using syntax)', async () => {
		const seed = '2024-01-01T12:00:00';
		const results: string[] = [];
		{
			await using ticker = Tempo.ticker({ seed, interval: 0.02 });
			let i = 0;
			for await (const t of ticker) {
				results.push(t.format('sortTime'));
				if (++i === 2) break;
			}
		}
		expect(results.length).toBe(2);
		expect(results[0]).toBe(new Tempo(seed).format('sortTime'));
	});

});
