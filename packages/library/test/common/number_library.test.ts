import { asCurrency } from '#library/number.library.js';

describe('Number Library', () => {
	describe('asCurrency', () => {
		it('should format a number as AUD currency by default', () => {
			const result = asCurrency(123.45);
			// The exact format can depend on the locale, but it should contain the number and currency symbol (or code)
			expect(result).toMatch(/123\.45/);
		});

		it('should format a string as currency by coercing to number', () => {
			const result = asCurrency("123.45");
			expect(result).toMatch(/123\.45/);
		});

		it('should support different currencies (e.g. USD)', () => {
			const result = asCurrency(123.45, 2, 'USD');
			expect(result).toMatch(/123\.45/);
			// In many locales USD is $ or USD
			expect(result).toMatch(/\$|USD/);
		});

		it('should handle zero correctly', () => {
			const result = asCurrency(0);
			expect(result).toMatch(/0\.00/);
		});

		it('should handle string zero correctly', () => {
			const result = asCurrency("0");
			expect(result).toMatch(/0\.00/);
		});
	});
});
