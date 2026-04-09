import { Tempo } from '#tempo/tempo.class.js';
import { QuarterTerm } from '#tempo/plugins/term/term.quarter.js';

describe('Debug QuarterTerm', () => {
	it('should have a resolve method', () => {
		console.log('QuarterTerm keys:', Object.keys(QuarterTerm));
		expect(typeof QuarterTerm.resolve).toBe('function');
	});

	it('should return 12 ranges for the 3-cycle window', () => {
		const t = new Tempo();
		// @ts-ignore
		const list = QuarterTerm.resolve.call(t);
		expect(list.length).toBe(12);
	});

	it('should have 4 ranges in the North template', () => {
		// @ts-ignore
		expect(QuarterTerm.groups.north.length).toBe(4);
	});

	it('should be found in Tempo.#terms', () => {
		// @ts-ignore
		const term = Tempo.terms.find(t => t.scope === 'quarter');
		console.log('Term found:', term?.key);
		expect(term).toBeDefined();
	});
});
