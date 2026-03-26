import { Tempo } from '#tempo/index.js';

describe('Tempo storage functionality', () => {
	const customKey = 'my-custom-key';
	const testKey = '$TempoTest';
	const testDiscovery = '$TempoTest';

	beforeEach(() => {
		// Clear environment for the keys we use
		delete (globalThis as any)[Symbol.for(testDiscovery)];
		delete process.env[customKey];
		delete process.env[testKey];
		// Reset global config to use test keys
		Tempo.init({ store: testKey, discovery: testDiscovery });
	})

	it('should write to and read from a custom storage key', () => {
		const config: Tempo.Options = { timeZone: 'Australia/Perth', calendar: 'iso8601' };
		Tempo.writeStore(config, customKey);

		expect(process.env[customKey]).toBeDefined();
		const read = Tempo.readStore(customKey);
		expect(read.timeZone).toBe(config.timeZone);
		expect(read.calendar).toBe(config.calendar);
	})

	it('should use the "store" option in Tempo.from() to load config from custom key', () => {
		const config: Tempo.Options = { timeZone: 'Europe/London' };
		Tempo.writeStore(config, customKey);

		const t = Tempo.from({ store: customKey });

		expect(t.config.timeZone).toBe('Europe/London');
		expect(t.config.store).toBe(customKey);
	})

	it('should load storage key during Tempo.init()', () => {
		const config: Tempo.Options = { timeZone: 'Asia/Tokyo' };
		Tempo.writeStore(config, testKey);

		Tempo.init({ store: testKey, discovery: testDiscovery }); // Reset and load from testKey
		expect(Tempo.config.timeZone).toBe('Asia/Tokyo');
	})
})

