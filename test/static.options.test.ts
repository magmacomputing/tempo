import { Tempo, $Tempo } from '#core/tempo.class.js';

describe('static.options', () => {
	const testKey = '$TempoTest';
	const testDiscovery = '$TempoTest';

	beforeEach(() => {
		// Clear all state
		delete (globalThis as any)[Symbol.for(testDiscovery)];
		Tempo.writeStore(void 0, testKey); // clear test storage
		Tempo.init({ store: testKey, discovery: testDiscovery });
	});

	afterEach(() => {
		delete (globalThis as any)[Symbol.for(testDiscovery)];
		Tempo.writeStore(void 0, testKey);
	});

	it('should return a combined options object with four keys', () => {
		const opts = Tempo.options;
		expect(Object.keys(opts)).toEqual(['default', 'discovery', 'storage', 'global']);
	});

	it('should reflect the library default options in "default"', () => {
		expect(Tempo.options.default.pivot).toBe(Tempo.default.pivot);
		expect(Tempo.options.default.timeZone).toBeDefined();
		expect(Tempo.options.default.timeZone.utc).toBe('UTC');
	});

	it('should reflect the current global config in "global"', () => {
		Tempo.init({ locale: 'en-AU' });
		expect(Tempo.options.global.locale).toBe('en-AU');
		expect(Tempo.options.global.scope).toBe('global');
	});

	it('should reflect global discovery in "discovery"', () => {
		(globalThis as any)[Symbol.for(testDiscovery)] = {
			options: { locale: 'ja-JP' },
			timeZone: { myZone: 'Australia/Perth' }
		};
		// No need to re-init for the getter itself as it reads from globalThis
		expect(Tempo.options.discovery.options.locale).toBe('ja-JP');
		expect(Tempo.options.discovery.timeZone.myZone).toBe('Australia/Perth');
		expect(Tempo.options.discovery.scope).toBe('discovery');
	});

	it('should reflect persistent storage in "storage" including the store key', () => {
		Tempo.writeStore({ limit: 123 }); // Uses the testKey from config
		
		const storage = Tempo.options.storage;
		expect(storage.key).toBe(testKey);
		expect(storage.limit).toBe(123);
		// Check proxy behavior (toJSON)
		expect(JSON.parse(JSON.stringify(storage)).limit).toBe(123);
	});

	it('should return proxied objects for all keys except default (which is frozen)', () => {
		const opts = Tempo.options;
		// default is secured/frozen but not proxied by getProxy in its own getter
		expect(Object.isFrozen(opts.default)).toBe(true);
		
		// discovery, global, and storage should be proxied
		// We can check this by looking for the $Target symbol or testing toJSON behavior
		const $Target = Symbol.for('$Target');
		expect((opts.discovery as any)[$Target]).toBeDefined();
		expect((opts.global as any)[$Target]).toBeDefined();
		expect((opts.storage as any)[$Target]).toBeDefined();
	});
});
