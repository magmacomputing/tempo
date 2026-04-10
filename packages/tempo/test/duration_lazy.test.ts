import { Tempo } from '#tempo/tempo.class.js';

describe('Tempo Duration Plugin (Lazy)', () => {
	it('should throw "plugin not loaded" by default', () => {
		const t = new Tempo('2024-01-01');
		expect(() => t.until('2024-01-02')).toThrow('Duration plugin not loaded');
	});

	it('should work after importing the plugin', async () => {
		// @ts-ignore
		await import('../src/plugins/module/module.duration.js');

		const t = new Tempo('2024-01-01');
		const diff = t.until('2024-01-02', 'days');
		expect(diff).toBe(1);
	});
});
