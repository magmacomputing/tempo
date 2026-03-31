import { Tempo } from '#tempo';

// We use a private test symbol to avoid trampling on globalThis[$Tempo] during tests
const $TestTempo = Symbol('TestTempoDiscovery');

describe('Global Discovery (via Configurable Symbol)', () => {
	beforeEach(() => {
		// Clear our test discovery mechanism
		delete (globalThis as any)[$TestTempo];
		Tempo.init();
	});

	afterEach(() => {
		delete (globalThis as any)[$TestTempo];
		Tempo.init();
	});

	it('should discover and merge global options', () => {
		(globalThis as any)[$TestTempo] = {
			options: {
				locale: 'en-AU',
				limit: 42
			}
		}

		Tempo.init({ discovery: $TestTempo });
		expect(Tempo.config.locale).toBe('en-AU');
		expect(Tempo.config.limit).toBe(42);
	});

	it('should support functional global options', () => {
		(globalThis as any)[$TestTempo] = {
			options: () => ({
				locale: 'ja-JP'
			})
		}

		Tempo.init({ discovery: $TestTempo });
		expect(Tempo.config.locale).toBe('ja-JP');
	});

	it('should register global terms', () => {
		const mockDefine = vi.fn();
		(globalThis as any)[$TestTempo] = {
			terms: [{
				key: 'globalTerm',
				description: 'A globally registered term',
				define: mockDefine
			}]
		}

		Tempo.init({ discovery: $TestTempo });
		const terms = Tempo.terms;
		  expect(terms.find((t: any) => t.key === 'globalTerm')).toBeDefined();
	});

	it('should merge global timezone aliases', () => {
		(globalThis as any)[$TestTempo] = {
			timeZones: {
				'MYTZ': 'Australia/Brisbane'
			}
		}

		Tempo.init({ discovery: $TestTempo });
		const t = new Tempo('2024-01-01', { timeZone: 'MYTZ' });
		expect(t.config.timeZone).toBe('Australia/Brisbane');
	});

	it('should merge global custom formats', () => {
		(globalThis as any)[$TestTempo] = {
			formats: {
				'custom': '{yyyy}!!{mm}!!{dd}'
			}
		}

		Tempo.init({ discovery: $TestTempo });
		expect(Tempo.FORMAT.has('custom')).toBe(true);
		expect((Tempo.FORMAT as any).custom).toBe('{yyyy}!!{mm}!!{dd}');

		const t = new Tempo('2024-05-20');
		expect((t.fmt as any).custom).toBe('2024!!05!!20');
	});
});
