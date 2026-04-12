import { Tempo } from '#tempo';

describe('Integrity Check', () => {
	it('QuarterTerm in Tempo.#terms should have resolve', () => {
		// @ts-ignore
		const terms = Tempo.terms;
		const quarter = terms.find((t: any) => t.scope === 'quarter');
		expect(typeof quarter?.resolve).toBe('function');
	});
});
