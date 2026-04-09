import { describe, it, expect } from 'vitest';
import { Tempo } from '../src/tempo.class.js';

describe('Integrity Check', () => {
	it('QuarterTerm in Tempo.#terms should have resolve', () => {
		// @ts-ignore
		const terms = Tempo.terms;
		const quarter = terms.find(t => t.scope === 'quarter');
		console.log('QuarterTerm scope:', quarter?.scope);
		console.log('QuarterTerm resolve type:', typeof quarter?.resolve);
		expect(typeof quarter?.resolve).toBe('function');
	});
});
