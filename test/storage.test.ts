import { Tempo, $Tempo } from '#core/shared/tempo.class.js';

describe('Tempo storage functionality', () => {
	const customKey = 'my-custom-key';
	const defaultKey = Symbol.keyFor($Tempo)!;

	beforeEach(() => {
		// Clear process.env for the keys we use
		delete process.env[customKey];
		delete process.env[defaultKey];
		// Reset global config to default state
		Tempo.init();
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

	it('should load default storage key during Tempo.init()', () => {
		const config: Tempo.Options = { timeZone: 'Asia/Tokyo' };
		Tempo.writeStore(config, defaultKey);

		Tempo.init(); // Reset and load from defaultKey
		expect(Tempo.config.timeZone).toBe('Asia/Tokyo');
	})
})

