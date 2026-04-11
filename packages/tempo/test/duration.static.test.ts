import { Tempo } from '#tempo';

describe('Tempo.duration() (Full)', () => {
	it('should return a Duration object from a string', () => {
		const d = Tempo.duration('P1Y');
		expect(d.years).toBe(1);
		expect(d.iso).toBe('P1Y');
	});

	it('should return a Duration object from an object', () => {
		const d = Tempo.duration({ months: 2 });
		expect(d.months).toBe(2);
		expect(d.iso).toBe('P2M');
	});

	it('should return a Duration object with correct properties', () => {
		const d = Tempo.duration('P1Y2M3D');
		expect(d.years).toBe(1);
		expect(d.months).toBe(2);
		expect(d.days).toBe(3);
		expect(d.sign).toBe(1);
		expect(d.blank).toBe(false);
	});
});
