import { Tempo } from '../src/tempo.class.js';
import '../src/plugins/term/term.index.js';

describe('Fiscal Cycle Wrap-around', () => {
	it('should resolve Southern Hemisphere Q4 for April anchor', () => {
		const t1 = new Tempo('2026-04-01', { sphere: 'south' });
		// South Q4 starts Apr 1st. FY26 starts Jul 2025.
		// So 2026-04-01 is indeed Q4 of FY26.
		expect(t1.term.qtr).toBe('Q4');
	});

	it('should back-date to Q2 of the same fiscal cycle', () => {
		const t1 = new Tempo('2026-04-01', { sphere: 'south' });
		const t2 = t1.set({ '#quarter': 2 });
		// Q2 of the same fiscal cycle (FY26) started Oct 1st, 2025.
		expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2025-10-01');
	});

	// test-cases for next release, v2.1.0+
	// it('should advance to Q1 of the next fiscal cycle (+1 quarter)', () => {
	// 	const t1 = new Tempo('2026-04-01', { sphere: 'south' });
	// 	const t2 = t1.set({ '+quarter': 1 });
	// 	// Next Q after Q4(FY26) is Q1(FY27) starting Jul 1st, 2026.
	// 	expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-01');
	// });

	// it('should handle large forward shifts (+5 quarters)', () => {
	// 	const t1 = new Tempo('2026-04-01', { sphere: 'south' });
	// 	const t2 = t1.set({ '+quarter': 5 });
	// 	// Q4(FY26) + 5 = Q1(FY28) starting Jul 1st, 2027.
	// 	// Q4(FY26) -> Q1(FY27) -> Q2(FY27) -> Q3(FY27) -> Q4(FY27) -> Q1(FY28)
	// 	expect(t2.format('{yyyy}-{mm}-{dd}')).toBe('2027-07-01');
	// });
});
