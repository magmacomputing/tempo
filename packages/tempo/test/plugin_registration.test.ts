import { Tempo } from '#tempo';
import { $Plugins } from '#tempo/plugins/tempo.plugin.js';
import { TickerPlugin } from '#tempo/plugins/plugin.ticker.js';

describe('Self-Registering Plugins', () => {

	test('TickerPlugin should be auto-registered on import', () => {
		// 1. TickerPlugin was imported above, so it should be in $Plugins
		const db = (globalThis as any)[$Plugins];
		expect(db).toBeDefined();
		expect(db.plugins).toContain(TickerPlugin);
		
		// 2. We must call init() to "activate" the registered plugins
		Tempo.init();
		expect(Tempo.ticker).toBeDefined();
	});

	test('Plugins should survive Tempo.init() reset', () => {
		// 1. Verify installed
		Tempo.init();
		expect(Tempo.ticker).toBeDefined();

		// 2. Perform a hard reset (empty init)
		Tempo.init(); 

		// 3. Verify it's STILL installed (init() should have re-extended from $Plugins)
		expect(Tempo.ticker).toBeDefined();
	});
});
