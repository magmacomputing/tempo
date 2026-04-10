import { describe, it, expect } from 'vitest';
import { Tempo } from '#tempo';

describe('Integrity Check', () => {
	it('QuarterTerm in Tempo.#terms should have resolve', () => {
		// @ts-ignore
		const terms = Tempo.terms;
		const quarter = terms.find(t => t.scope === 'quarter');
		expect(typeof quarter?.resolve).toBe('function');
	});
});
