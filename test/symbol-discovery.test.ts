import { Tempo, $Tempo } from '#core/shared/tempo.class.js';

describe('Global Discovery (Symbol.for($Tempo))', () => {
	const symbolKey = Symbol.for($Tempo);

	beforeEach(() => {
		// Clear all discovery mechanisms
		delete (globalThis as any)[symbolKey];
		Tempo.init();
	});

	afterEach(() => {
		delete (globalThis as any)[symbolKey];
		Tempo.init();
	});

	it('should discover and merge global options', () => {
		(globalThis as any)[symbolKey] = {
			options: {
				locale: 'en-AU',
				limit: 42
			}
		};

		Tempo.init();
		expect(Tempo.config.locale).toBe('en-AU');
		expect(Tempo.config.limit).toBe(42);
	});

	it('should support functional global options', () => {
		(globalThis as any)[symbolKey] = {
			options: () => ({
				locale: 'ja-JP'
			})
		};

		Tempo.init();
		expect(Tempo.config.locale).toBe('ja-JP');
	});

	it('should register global terms', () => {
		const mockDefine = vi.fn();
		(globalThis as any)[symbolKey] = {
			terms: [{
				key: 'globalTerm',
				description: 'A globally registered term',
				define: mockDefine
			}]
		};

		Tempo.init();
		const terms = Tempo.terms;
		expect(terms.find(t => t.key === 'globalTerm')).toBeDefined();
	});

	it('should merge global timezone aliases', () => {
		(globalThis as any)[symbolKey] = {
			timeZones: {
				'MYTZ': 'Australia/Brisbane'
			}
		};

		Tempo.init();
		// We can verify this indirectly via internal state if we had access, 
		// or by parsing a date with that timezone alias.
		const t = new Tempo('2024-01-01', { timeZone: 'MYTZ' });
		expect(t.config.timeZone).toBe('Australia/Brisbane');
	});
});
