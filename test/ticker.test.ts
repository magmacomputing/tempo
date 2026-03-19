import { Tempo, isTempo } from '#core/shared/tempo.class.js';

const label = 'ticker:';

describe(`${label}`, () => {

	test(`${label} callback pattern`, async () => {
		let count = 0;
		let lastTick: any;

		const stop = Tempo.ticker(50, (t) => {
			count++;
			lastTick = t;
		});

		await new Promise(resolve => setTimeout(resolve, 200)); // wait for ~4 ticks
		stop();

		expect(count).toBeGreaterThanOrEqual(3);
		expect(lastTick).toBeDefined();
		expect(isTempo(lastTick)).toBe(true);

		const finalCount = count;
		await new Promise(resolve => setTimeout(resolve, 100));
		expect(count).toBe(finalCount); // check it stopped
	});

	test(`${label} async generator pattern`, async () => {
		const ticker = Tempo.ticker(20);
		const results: any[] = [];

		let i = 0;
		for await (const t of ticker) {
			results.push(t);
			if (++i === 3) break;
		}

		expect(results.length).toBe(3);
		expect(results[0]).toBeDefined();
		expect(isTempo(results[0])).toBe(true);
	});

	test(`${label} validation`, () => {
		expect(() => Tempo.ticker(0)).toThrow(RangeError);
		expect(() => Tempo.ticker(-1)).toThrow(RangeError);
		expect(() => Tempo.ticker(NaN)).toThrow(RangeError);
		expect(() => Tempo.ticker(Infinity)).toThrow(RangeError);
	});

});
