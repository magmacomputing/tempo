import { Tempo } from '#tempo/tempo.class.js';

describe('Tempo Plugin System', () => {

	test('should extend Tempo with a static method', () => {
		const staticPlugin: Tempo.Plugin = (_options, TempoClass) => {
			(TempoClass as any).staticMethod = () => 'static';
		};

		Tempo.extend(staticPlugin);
		expect((Tempo as any).staticMethod()).toBe('static');
	});

	test('should extend Tempo with an instance method', () => {
		const instancePlugin: Tempo.Plugin = (_options, TempoClass) => {
			(TempoClass.prototype as any).instanceMethod = function() {
				return 'instance';
			};
		};

		Tempo.extend(instancePlugin);
		const t = new Tempo();
		expect((t as any).instanceMethod()).toBe('instance');
	});

	test('should pass options to the plugin', () => {
		let receivedOptions: any;
		const optionsPlugin: Tempo.Plugin = (options) => {
			receivedOptions = options;
		};

		Tempo.extend(optionsPlugin, { foo: 'bar' });
		expect(receivedOptions).toEqual({ foo: 'bar' });
	});

	test('should not install the same plugin twice', () => {
		let installCount = 0;
		const singlePlugin: Tempo.Plugin = () => {
			installCount++;
		};

		Tempo.extend(singlePlugin);
		Tempo.extend(singlePlugin);
		expect(installCount).toBe(1);
	});

	test('should provide a factory function to the plugin', () => {
		let factoryResult: any;
		const factoryPlugin: Tempo.Plugin = (_opts, _Class, factory) => {
			factoryResult = factory('2024-01-01');
		};

		Tempo.extend(factoryPlugin);
		expect(factoryResult).toBeInstanceOf(Tempo);
		expect(factoryResult.toString()).toContain('2024-01-01');
	});

	test('should auto-load plugins from init options', () => {
		let loaded = false;
		const initPlugin: Tempo.Plugin = () => { loaded = true; };

		Tempo.init({ plugins: [initPlugin] });
		expect(loaded).toBe(true);
	});

	test('should auto-load plugins from global discovery', () => {
		const testDiscovery = '$TempoTestDiscovery';
		let loaded = false;
		const discoveryPlugin: Tempo.Plugin = () => { loaded = true; };

		(globalThis as any)[Symbol.for(testDiscovery)] = {
			plugins: [discoveryPlugin]
		};

		Tempo.init({ discovery: testDiscovery });
		expect(loaded).toBe(true);
	});

	test('should protect existing members but allow new ones', () => {
		// 1. Try to overwrite existing (should throw in strict mode)
		// Note: Tempo.now is a static method we want to protect
		expect(() => { 
			(Tempo as any).now = () => 'hacked'; 
		}).toThrow();

		// 2. Try to add new (should succeed)
		const newPlugin: Tempo.Plugin = (_opts, _Class) => {
			(_Class as any).freshMethod = () => 'fresh';
		};
		Tempo.extend(newPlugin);
		expect((Tempo as any).freshMethod()).toBe('fresh');
	});

	test('should protect Symbol properties (like Symbol.dispose)', () => {
		expect(() => { 
			(Tempo as any)[Symbol.dispose] = () => {}; 
		}).toThrow();
	});
});
