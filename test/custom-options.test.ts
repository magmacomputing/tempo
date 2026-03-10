import { Tempo } from '#core/shared/tempo.class.js';

describe('Custom Configuration Options', () => {
	it('should preserve non-standard options in the config object', () => {
		const customKey = 'myCustomOption';
		const customValue = 'hello-world';

		const t = new Tempo('now', { [customKey]: customValue });

		expect((t.config as any)[customKey]).toBe(customValue);
	});

	it('should allow accessing custom options within a Term definition', () => {
		// Initialize with a custom option
		Tempo.init({
			threshold: 10
		});

		// Add a term that uses the custom option
		Tempo.addTerm({
			key: 'testThreshold',
			scope: 'threshold',
			description: 'Test Threshold',
			define: function (this: Tempo, keyOnly?: boolean) {
				const threshold = this.config.threshold ?? 0;
				const status = this.dd > threshold ? 'Above' : 'Below';
				return keyOnly ? status : { key: status, threshold };
			}
		});

		const t1 = new Tempo('2025-01-05'); // day 5 is below 10
		expect(t1.term.testThreshold).toBe('Below');

		const t2 = new Tempo('2025-01-15'); // day 15 is above 10
		expect(t2.term.testThreshold).toBe('Above');
	});
});
