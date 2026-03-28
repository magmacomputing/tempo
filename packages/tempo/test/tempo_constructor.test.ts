import { Tempo } from '../src/tempo.class.js';

describe('Tempo Core', () => {
	describe('Constructor', () => {
		it('should throw an error on invalid input (Invalid TimeZone)', () => {
			expect(() => new Tempo('2024-01-01', { timeZone: 'Invalid/Zone' })).toThrow();
		});

		it('should return a valid Tempo instance on success', () => {
			const t = new Tempo('2024-01-01');
			expect(t).toBeInstanceOf(Tempo);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-01-01');
		});
	});
});
