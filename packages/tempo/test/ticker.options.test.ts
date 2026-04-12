import { Tempo } from '#tempo';
import '#tempo/plugin/extend/extend.ticker.js';

describe('Tempo.ticker Options & Enhancements', () => {

	test('ticker with limit (callback)', async () => {
		let count = 0;
		const results: string[] = [];

		// Stop after 3 ticks
		const stop = Tempo.ticker({ seconds: 0.05, limit: 3 }, (t) => {
			count++;
			results.push(t.format('{ss}:{ms}') as string);
		});

		try {
			await new Promise(resolve => setTimeout(resolve, 250));

			expect(count).toBe(3);
			expect(results.length).toBe(3);
		} finally {
			stop();
		}
	});

	test('ticker with limit (generator)', async () => {
		const ticker = Tempo.ticker({ seconds: 0.03, limit: 2 });
		const results: any[] = [];

		for await (const t of ticker) {
			results.push(t);
		}

		expect(results.length).toBe(2);
	});

	test('ticker with until (virtual deadline)', async () => {
		const seed = '2024-01-01T12:00:00';
		const until = '2024-01-01T12:00:01';										// 1 second later
		const results: string[] = [];

		// 200ms interval, should tick at 0ms, 200ms, 400ms, 600ms, 800ms, 1000ms
		const stop = Tempo.ticker({
			seconds: 0.2,
			seed,
			until
		}, (t) => {
			results.push(t.format('sortTime') as string);
		});

		try {
			await new Promise(resolve => setTimeout(resolve, 300));	// enough for virtual time to pass, but real time is fast

			expect(results.length).toBe(6);												// 0, 0.2, 0.4, 0.6, 0.8, 1.0
			expect(results[results.length - 1]).toContain('12:00:01');
		} finally {
			stop();
		}
	});

	test('ticker with flattened DurationLike options', async () => {
		const seed = '2024-01-01T00:00:00';
		// Direct use of 'milliseconds' in options
		const ticker = Tempo.ticker({
			milliseconds: 20,
			seed,
			limit: 2
		});

		const results: string[] = [];
		for await (const t of ticker) {
			results.push(t.format('{ss}:{ms}') as string);
		}

		expect(results).toEqual(['00:000', '00:020']);
	});

	test('ticker with default 1s interval', async () => {
		const seed = '2024-01-01T00:00:00';
		// No interval or duration keys provided
		const ticker = Tempo.ticker({
			seed,
			limit: 3
		});

		const results: string[] = [];
		for await (const t of ticker) {
			results.push(t.format('{ss}') as string);
		}

		expect(results).toEqual(['00', '01', '02']);
	});

	test('backward compatibility (numeric interval)', async () => {
		let count = 0;
		const stop = Tempo.ticker(0.05, () => {
			count++;
		});

		try {
			await new Promise(resolve => setTimeout(resolve, 150));
			expect(count).toBeGreaterThanOrEqual(2);
		} finally {
			stop();
		}
	});

	test('ergonomic callback-only ticker (default 1s)', async () => {
		let count = 0;
		const stop = Tempo.ticker(() => {
			count++;
		});

		try {
			// Check immediate tick
			await new Promise(resolve => setTimeout(resolve, 0));
			expect(count).toBe(1);
		} finally {
			stop();
		}
	});

});
