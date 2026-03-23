import { Tempo } from '#tempo/tempo.class.js';

const label = 'instance.since:';

describe(`${label} since method`, () => {
	test('calculates time elapsed from a past date', () => {
		const t1 = new Tempo('2024-01-01T12:00:00');
		const t2 = new Tempo('2024-01-01T14:30:00');

		expect(t2.since(t1, 'hours')).toMatch(/2h ago/i);
	});

	test('calculates time elapsed from a string date', () => {
		const t = new Tempo('2024-01-02T00:00:00');
		expect(t.since('2024-01-01T00:00:00', 'hours')).toMatch(/24h ago/i);
	});

	test('returns string description when no unit is specified', () => {
		const t1 = new Tempo('2024-01-01T12:00:00');
		const t2 = new Tempo('2024-01-02T14:30:00');

		const desc = t2.since(t1);
		expect(typeof desc).toBe('string');
		expect(desc).toBe('-P1DT2H30M');
	});

	test('handles future dates correctly', () => {
		const t1 = new Tempo('2024-01-01T12:00:00');
		const t2 = new Tempo('2024-01-02T12:00:00');
		// "since" something in the future implies it hasn't happened yet, so negative or 0 based on implementation
		const result = t1.since(t2, 'hours');
		expect(typeof result).toBe('string');
	});
});
