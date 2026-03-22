import { Tempo } from '#core/tempo.class.js';

const label = 'instance.until:';

describe(`${label} until method`, () => {
	test('calculates duration in specific units', () => {
		const t1 = new Tempo('2024-01-01T12:00:00');
		const t2 = new Tempo('2024-01-01T14:30:00');
		
		expect(t1.until(t2, 'hours')).toBe(2.5);
		expect(t1.until(t2, 'minutes')).toBe(150);
	});

	test('calculates duration to a string date', () => {
		const t = new Tempo('2024-01-01T00:00:00');
		expect(t.until('2024-01-02T00:00:00', 'hours')).toBe(24);
	});

	test('returns Duration object when no unit is specified', () => {
		const t1 = new Tempo('2024-01-01T12:00:00');
		const t2 = new Tempo('2024-01-02T14:30:00');
		
		const dur = t1.until(t2);
		expect(dur).toHaveProperty('iso');
		expect(dur).toHaveProperty('days', 1);
		expect(dur).toHaveProperty('hours', 2);
		expect(dur).toHaveProperty('minutes', 30);
	});

	test('handles negative durations correctly', () => {
		const t1 = new Tempo('2024-01-02T12:00:00');
		const t2 = new Tempo('2024-01-01T12:00:00');
		// "until" something in the past should be negative
		expect(t1.until(t2, 'hours')).toBe(-24);
	});
});
