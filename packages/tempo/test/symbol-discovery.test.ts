import { Tempo } from '#tempo/tempo.class.js';
import { $Tempo } from '#library/symbol.library.js';

describe('Global Discovery (Symbol.for($Tempo))', () => {
	beforeEach(() => {
		// Clear all discovery mechanisms
		delete (globalThis as any)[$Tempo];
		Tempo.init();
	});

	afterEach(() => {
		delete (globalThis as any)[$Tempo];
		Tempo.init();
	});

	it('should discover and merge global options', () => {
		(globalThis as any)[$Tempo] = {
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
		(globalThis as any)[$Tempo] = {
			options: () => ({
				locale: 'ja-JP'
			})
		};

		Tempo.init();
		expect(Tempo.config.locale).toBe('ja-JP');
	});

	it('should register global terms', () => {
		const mockDefine = vi.fn();
		(globalThis as any)[$Tempo] = {
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
		(globalThis as any)[$Tempo] = {
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

	it('should merge global custom formats', () => {
		(globalThis as any)[$Tempo] = {
			formats: {
				'custom': '{yyyy}!!{mm}!!{dd}'
			}
		};

		Tempo.init();
		expect(Tempo.FORMAT.has('custom')).toBe(true);
		expect((Tempo.FORMAT as any).custom).toBe('{yyyy}!!{mm}!!{dd}');

		const t = new Tempo('2024-05-20');
		expect((t.fmt as any).custom).toBe('2024!!05!!20');
	});
});
