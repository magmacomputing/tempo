import { Tempo } from '../src/tempo.class.js';
import '../src/plugins/term/term.index.js'; // ensure terms are registered

describe('Term Dispatch Refactor', () => {
	it('should set term by index (#quarter: 2)', () => {
		const t = new Tempo('2024-01-01T00:00:00', { timeZone: 'America/New_York' });
		const t2 = t.set({ '#quarter': 2 });
		// Q2 2024 (North) should start on April 1st
		expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should set start of current term (start: "#quarter")', () => {
		const t = new Tempo('2024-05-15T12:00:00', { timeZone: 'America/New_York' });
		const t2 = t.set({ 'start': '#quarter' });
		// May 15 is in Q2, so start should be April 1st
		expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
		expect(t2.format('{hh}:{mi}:{ss}')).toBe('00:00:00');
	});

	it('should stay within fiscal year when setting by index', () => {
		const t = new Tempo('2024-01-01T00:00:00', { timeZone: 'America/New_York' });
		const t2 = t.set({ '#quarter': 4 });
		expect(t2.format('{yyyy}')).toBe('2024');
		expect(t2.format('{mm}')).toBe('10');
	});

	it('should throw error for unknown term', () => {
		const t = new Tempo();
		expect(() => t.set({ '#unknown': 1 })).toThrow('Unknown Term identifier: #unknown');
	});

	it('should handle mid.term correctly', () => {
		const t = new Tempo('2024-01-01T00:00:00', { timeZone: 'America/New_York' });
		const t2 = t.set({ 'mid': '#quarter' });
		// Q1 is Jan, Feb, Mar. Mid should be midpoint of range.
		// Approx Feb 15
		expect(t2.format('{yyyy}-{mm}')).toBe('2024-02');
	});
});
