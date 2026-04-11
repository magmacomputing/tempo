import { Tempo } from '#tempo/core';

describe('Tempo.duration() (Core)', () => {
	it('should throw Error if plugin not loaded', () => {
		// Note: t.config access in interpret handles the static config lookup
		expect(() => Tempo.duration('P1Y')).toThrow('duration plugin not loaded');
	});

	it('should work after manual extension', async () => {
		// @ts-ignore
		const { DurationModule } = await import('../src/plugins/module/module.duration.js');
		Tempo.extend(DurationModule);
		
		const d = Tempo.duration('P1Y');
		expect(d.years).toBe(1);
		expect(d.iso).toBe('P1Y');
	});
});
