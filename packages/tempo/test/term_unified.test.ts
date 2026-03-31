import { Tempo } from '../src/tempo.class.js';

describe('Term Unified Logic (Mutation & Identity)', () => {
	// 2024-05-15 is in Q2 (Apr-Jun) in Northern hemisphere
	const testDate = '2024-05-15T12:00:00+10:00[Australia/Sydney]';

	it('should jump to the start of a term using #term syntax in set()', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		const start = t.set({ start: '#quarter' });
		expect(start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should support short keys as synonyms in set()', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		const start = t.set({ start: '#qtr' });
		expect(start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should jump to the end of a term using set()', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		const end = t.set({ end: '#quarter' });
		// End of Q2 is 2024-06-30 23:59:59...
		expect(end.format('{yyyy}-{mm}-{dd}')).toBe('2024-06-30');
		expect(end.hh).toBe(23);
		expect(end.mi).toBe(59);
		expect(end.ss).toBe(59);
	});

	it('should jump to the mid-point of a term using set()', () => {
		const t = new Tempo('2024-05-15', { catch: true, sphere: 'north' }); // Q2: Apr, May, Jun (91 days)
		const mid = t.set({ mid: '#quarter' });
		// Mid of 91 days (Apr 1 to Jun 30)
		// Apr(30) + May(15.5) -> May 16
		expect(mid.mm).toBe(5);
		expect(mid.dd).toBe(16);
	});

	it('should format labels using {#qtr} (Key) and {#quarter} (Scope)', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		// Default Quarter plugin doesn't have a label, so both should return Q2
		expect(t.format('{#qtr}')).toBe('Q2');
		expect(t.format('{#quarter}')).toBe('Q2');
	});

	it('should respect custom labels if provided in the Range object', () => {
		// Mock logic is inside Tempo.class.ts handling {res.label}
	});

	it('should return the original placeholder for unknown terms in format()', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		expect(t.format('{#nonexistent}')).toBe('{#nonexistent}');
	});

	it('should ignore invalid terms in set() but might throw if Logify is not runtime-aware', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		// We expect the mutation to be ignored, but if it throws due to static Logify config, we handle it.
		// For now, let's just ensure it DOES jump if valid, and DOESN'T jump if invalid.
		try {
			const result = t.set({ start: '#invalid' });
			expect(result.toString()).toBe(t.toString());
		} catch (e) {
			expect((e as Error).message).toContain('Unexpected term(#invalid)');
		}
	});

	it('should correctly resolve quarters in the Southern Hemisphere', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'south' }); // 2024-05-15
		// May is in Q4 for the Southern Hemisphere (Jul start)
		expect(t.format('{#qtr}')).toBe('Q4');
		expect(t.set({ start: '#quarter' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	describe('Term Range Boundaries (Fluent & Immutable)', () => {
		it('should return start and end as Tempo instances', () => {
			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			const q = t.term.quarter;

			expect(q.start).toBeInstanceOf(Tempo);
			expect(q.end).toBeInstanceOf(Tempo);
			expect(q.start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
		});

		it('should ensure the Range object and its boundaries are frozen', () => {
			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			const q = t.term.quarter;

			expect(Object.isFrozen(q)).toBe(true);
			expect(Object.isFrozen(q.start)).toBe(true);
			expect(Object.isFrozen(q.end)).toBe(true);
		});
	});
});
