import { Tempo } from '#tempo/core';
import { FormatModule } from '#tempo/format';
import { registryReset } from '#tempo/tempo.enum.js';
import '#tempo/term/standard';

Tempo.extend(FormatModule);

describe('Reproduction of Parsing Regressions', () => {
	afterEach(() => registryReset());

	it('should correctly parse "one Wednesday ago"', () => {
		const anchor = new Tempo('2024-03-20'); // A Wednesday
		const result = anchor.add('one Wednesday ago');
		expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2024-03-13');
	});

	it('should correctly parse "eleven days hence" after extension', () => {
		Tempo.extend({ numbers: { eleven: 11 } });
		const anchor = new Tempo('2024-03-20');
		const result = anchor.add('eleven days hence');
		expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2024-03-31');
	});
});
