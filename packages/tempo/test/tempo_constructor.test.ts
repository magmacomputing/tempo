import { Tempo } from '../src/tempo.class.js';

describe('Tempo Core', () => {
	describe('Constructor', () => {
		it('should throw an error on invalid input instead of returning an empty object', () => {
			// Providing something that should definitely fail parsing if not handled
			// In Tempo, many inputs might be valid, but passing an invalid object structure 
			// or triggering a Temporal error should work.
			// Let's try forcing a parse error by providing an invalid DateTime type if possible,
			// or just something that triggers the catch block.
			
			const invalidInput = { date: 'invalid' }; // This might not fail if Tempo handles it, 
			// but we want to hit the 'throw err' in the catch block.
			
			// If we pass an invalid timezone in options, it might throw in the Temporal constructor.
			expect(() => new Tempo('2024-01-01', { timeZone: 'Invalid/Zone' })).toThrow();
		});

		it('should return a valid Tempo instance on success', () => {
			const t = new Tempo('2024-01-01');
			expect(t).toBeInstanceOf(Tempo);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-01-01');
		});
	});
});
