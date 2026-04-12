import { Tempo } from '#tempo';
import '#tempo/plugin/extend/extend.ticker.js';

describe('Error Handling stabilization', () => {
	it('should throw an error for invalid ticker interval by default', () => {
		Tempo.init({ catch: false });
		const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
		try {
			expect(() => Tempo.ticker('invalid')).toThrow();
		} finally {
			spy.mockRestore();
		}
	});

	it('should log a warning and fallback to 1s when catch: true', () => {
		Tempo.init({ catch: true });
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });

		let t: any;
		try {
			expect(() => {
				t = Tempo.ticker('invalid');
			}).not.toThrow();

			expect(spy).toHaveBeenCalled();
			expect(t).toBeDefined();
		} finally {
			t?.[Symbol.dispose]();
			spy.mockRestore();
			Tempo.init({ catch: false }); // Reset
		}
	});
});
