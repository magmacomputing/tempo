import { Tempo, $Tempo } from '#core/shared/tempo.class.js';

describe('Global Configuration Discovery', () => {
	const sym = Symbol.for($Tempo);

	beforeEach(() => {
		// Clear discovery before each test
		delete (globalThis as any)[sym];
		Tempo.init();
	});

	afterEach(() => {
		delete (globalThis as any)[sym];
		Tempo.init();
	}); // Reset Tempo to default state

	afterAll(() => {
		delete (globalThis as any)[sym];
		Tempo.init(); // Clean up
	});

	test('Tempo automatically discovers and applies via Symbol.for($Tempo) (Discovery Contract)', () => {
		(globalThis as any)[sym] = {
			options: { timeZone: 'Europe/Paris', customGlobalVal: true }
		};

		// Re-initialize so it picks up the global
		Tempo.init();

		const t = new Tempo('now');
		expect(t.config.timeZone).toBe('Europe/Paris');
		expect(t.config.customGlobalVal).toBe(true);
	});

	test('Tempo supports functional options in Discovery Contract', () => {
		(globalThis as any)[sym] = {
			options: () => ({ timeZone: 'Asia/Tokyo', customGlobalFn: true })
		};

		// Re-initialize so it picks up the global
		Tempo.init();

		const t = new Tempo('now');
		expect(t.config.timeZone).toBe('Asia/Tokyo');
		expect(t.config.customGlobalFn).toBe(true);
	});

	test('Explicit init options override Global Discovery', () => {
		(globalThis as any)[sym] = {
			options: { timeZone: 'Europe/Paris' }
		};

		Tempo.init(); // Picks up global
		Tempo.init({ timeZone: 'America/New_York' }); // Explicit override

		const t = new Tempo('now');
		expect(t.config.timeZone).toBe('America/New_York');
	});

	test('Tempo discovers global options for events and periods', () => {
		(globalThis as any)[sym] = {
			options: {
				event: { 'global launch': '2026-10-01' },
				period: { 'global teatime': '15:30' }
			}
		};

		Tempo.init();

		const tEvent = new Tempo('global launch');
		expect(tEvent.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-01');

		const tPeriod = new Tempo('global teatime');
		expect(tPeriod.format('{hh}:{mi}')).toBe('15:30');
	});
});
