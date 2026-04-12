import { Tempo } from '#tempo';
import { QuarterTerm } from '#tempo/plugin/term/term.quarter.js';

describe('Debug QuarterTerm', () => {
	it('should have a resolve method', () => {
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
		expect(term).toBeDefined();
	});
});
