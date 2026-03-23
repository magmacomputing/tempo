import { Tempo } from '#tempo/tempo.class.js';

describe('Tempo.from() static method', () => {
	it('should create an instance of Tempo from no arguments (now)', () => {
		const t = Tempo.from();
		expect(t).toBeInstanceOf(Tempo);
		expect(t.isValid()).toBe(true);

		// check that it's close to "now"
		const now = Temporal.Now.instant().epochMilliseconds;
		expect(Math.abs(t.epoch.ms - now)).toBeLessThan(200);
	})

	it('should create an instance of Tempo from options only', () => {
		const t = Tempo.from({ timeZone: 'UTC' });
		expect(t).toBeInstanceOf(Tempo);
		expect(t.tz).toBe('UTC');
	})

	it('should create an instance of Tempo from date-time string and options', () => {
		const t = Tempo.from('2025-01-01', { timeZone: 'America/New_York' });
		expect(t).toBeInstanceOf(Tempo);
		expect(t.toString()).toContain('2025-01-01');
		expect(t.tz).toBe('America/New_York');
	})

	it('should create an instance of Tempo from an existing Tempo instance', () => {
		const t1 = new Tempo('2024-12-25');
		const t2 = Tempo.from(t1);
		expect(t2).toBeInstanceOf(Tempo);
		expect(t2.nano).toBe(t1.nano);
	})
})
