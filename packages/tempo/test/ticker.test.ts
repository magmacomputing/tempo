import { Tempo, isTempo } from '#tempo/tempo.class.js';
import { TickerPlugin } from '#tempo/tempo.config/plugins/plugin.ticker.js';

Tempo.load(TickerPlugin);

const label = 'ticker:';

describe(`${label}`, () => {

	test(`${label} callback pattern`, async () => {
		let count = 0;
		let lastTick: any;

		{
			using _stop = Tempo.ticker(100, (t) => {
				count++;
				lastTick = t;
			});

			await new Promise(resolve => setTimeout(resolve, 0)); // check immediate
			expect(count).toBe(1);
			expect(lastTick).toBeDefined();

			await new Promise(resolve => setTimeout(resolve, 500));	// wait for ~5 total ticks
		} // stop() is called automatically here

		expect(count).toBeGreaterThanOrEqual(4);
		expect(lastTick).toBeDefined();
		expect(isTempo(lastTick)).toBe(true);

		const finalCount = count;
		await new Promise(resolve => setTimeout(resolve, 100));
		expect(count).toBe(finalCount);											// check it stopped
	});

	test(`${label} async generator pattern`, async () => {
		const results: any[] = [];
		let i = 0;

		{
			await using ticker = Tempo.ticker(20);
			for await (const t of ticker) {
				results.push(t);
				if (++i === 3) break;
			}
		} // asyncDispose() is called automatically here

		expect(results.length).toBe(3);
		expect(results[0]).toBeDefined();
		expect(isTempo(results[0])).toBe(true);
	});

	test(`${label} backwards ticker`, async () => {
		const results: number[] = [];
		const start = new Tempo('2024-01-01T00:00:10Z');

		{
			Tempo.ticker(-1000, start, (t, stop) => {
				results.push(t.ss);
				if (results.length === 3) stop();
			});

			await new Promise(resolve => setTimeout(resolve, 2500));
		}

		expect(results).toEqual([10, 9, 8]);
	});

	test(`${label} immediate stop`, async () => {
		let count = 0;
		Tempo.ticker(50, (t, stop) => {
			count++;
			stop(); // stop immediately on first tick
		});

		await new Promise(resolve => setTimeout(resolve, 200));
		expect(count).toBe(1); // should only have the immediate tick
	});

	test('ticker: flexible numeric intervals', async () => {
		let count = 0;
		// Test String
		const stop1 = Tempo.ticker('50', () => count++);
		await new Promise(resolve => setTimeout(resolve, 75));
		stop1();
		expect(count).toBeGreaterThanOrEqual(2);

		// Test BigInt
		count = 0;
		const stop2 = Tempo.ticker(50n, () => count++);
		await new Promise(resolve => setTimeout(resolve, 75));
		stop2();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test('ticker: emit-once (zero interval)', async () => {
		let count = 0;
		const stop = Tempo.ticker(0, () => count++);
		await new Promise(resolve => setTimeout(resolve, 100));
		stop();
		expect(count).toBe(1); // Only initial emit
	});

	test('ticker: validation', () => {
		// @ts-ignore
		expect(() => Tempo.ticker(NaN)).toThrow(RangeError);
		// @ts-ignore
		expect(() => Tempo.ticker(Infinity)).toThrow(RangeError);
		// @ts-ignore
		expect(() => Tempo.ticker('not a number')).toThrow(RangeError);
	});

});
