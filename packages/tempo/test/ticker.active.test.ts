import { Tempo } from '#tempo';
import { Ticker } from '#tempo/plugin/extend/extend.ticker.js';

describe('Ticker Management (Static Registry)', () => {

	it('should track active tickers in the registry', async () => {
		const initialCount = Ticker.active.length;

		const t1 = Tempo.ticker(0.5);
		const t2 = Tempo.ticker(0.5);

		expect(Ticker.active.length).toBe(initialCount + 2);

		t1.stop();
		expect(Ticker.active.length).toBe(initialCount + 1);

		t2.stop();
		expect(Ticker.active.length).toBe(initialCount);
	});

	it('should provide accurate snapshots via Ticker.active', async () => {
		const seed = '2020-01-01T00:00:00';
		const ticker = Tempo.ticker({ seconds: 1, seed, limit: 10 });

		try {
			const snapshot = Ticker.active.find((s: any) => s.ticker === ticker);

			expect(snapshot).toBeDefined();
			expect(snapshot?.ticks).toBe(0);
			expect(snapshot?.limit).toBe(10);
			expect(snapshot?.next.format('sortTime')).toContain('00:00:00');

			ticker.pulse();
			const snapshot2 = Ticker.active.find((s: any) => s.ticker === ticker);
			expect(snapshot2?.ticks).toBe(1);
			expect(snapshot2?.next.format('sortTime')).toContain('00:00:01');
		} finally {
			ticker.stop();
		}
	});

	it('should expose instance info via .info getter', () => {
		const ticker = Tempo.ticker(5);
		try {
			const info = ticker.info;

			expect(info.interval).toEqual({ seconds: 5 });
			expect(info.stopped).toBe(false);
			expect(info.ticks).toBe(0);
		} finally {
			ticker.stop();
		}
		expect(ticker.info.stopped).toBe(true);
	});

	describe('One-Shot Behavior', () => {

		it('should treat seed-only tickers as one-shot (limit:1)', () => {
			// Pattern A: string seed
			const t1 = Tempo.ticker('Fri 10am');
			try {
				expect(t1.info.limit).toBe(1);
			} finally {
				t1.stop();
			}

			// Pattern B: options object with only seed
			const t2 = Tempo.ticker({ seed: '2025-01-01' });
			try {
				expect(t2.info.limit).toBe(1);
			} finally {
				t2.stop();
			}
		});

		it('should NOT imply limit:1 if a duration property is present', () => {
			const t1 = Tempo.ticker({ seed: 'Fri 10am', seconds: 30 });
			try {
				expect(t1.info.limit).toBeUndefined();
			} finally {
				t1.stop();
			}
		});
	});

	it('should support explicit resource management (using)', async () => {
		const limit = 1234;
		{
			// @ts-ignore - 'using' might require newer TS target but is supported by Vitest/Node
			using t = Tempo.ticker({ limit, seconds: 1 });
			expect(Ticker.active.find((s: any) => s.limit === limit)).toBeDefined();
		}
		// t is now stopped automatically
		expect(Ticker.active.find((s: any) => s.limit === limit)).toBeUndefined();
	});
});
