import { Tempo } from '#tempo';

describe('Custom Configuration Options', () => {

	test('non-standard options are preserved in config', () => {
		const t = new Tempo('now', { customKey: 'customValue' } as any);
		expect(t.config.customKey).toBe('customValue');
	})

	test('non-standard options are accessible in Terms plugins', () => {
		// Register a term that uses a custom config option
		Tempo.extend({
			key: 'customTerm',
			description: 'A term that uses custom config',
			define() {
				return this.config.pluginOption || 'default';
			}
		})

		const t1 = new Tempo('now', { pluginOption: 'active' } as any);
		expect(t1.format('{#customTerm}')).toBe('active');

		const t2 = new Tempo('now');
		expect(t2.format('{#customTerm}')).toBe('default');
	})
})
