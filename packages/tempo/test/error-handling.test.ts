import { Tempo } from '../src/tempo.class.js';
import { TickerPlugin } from '../src/plugins/extend/plugin.ticker.js';

// TickerPlugin self-registers on import via definePlugin
Tempo.extend(TickerPlugin);

describe('Error Handling stabilization', () => {
	it('should throw an error for invalid ticker interval by default', () => {
		Tempo.init({ catch: false });
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(() => Tempo.ticker('invalid')).toThrow();
		spy.mockRestore();
	});

	it('should log a warning and fallback to 1s when catch: true', () => {
		Tempo.init({ catch: true });
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		
		let t;
		expect(() => {
			t = Tempo.ticker('invalid');
		}).not.toThrow();
		
		expect(spy).toHaveBeenCalled();
		expect(t).toBeDefined();
		
		spy.mockRestore();
		Tempo.init({ catch: false }); // Reset
	});
});
