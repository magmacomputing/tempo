import { Tempo } from '../src/tempo.class.js';

describe('Proof: Enumerable + Silent Mode', () => {
	it('should trigger getters during object inspection (enumerable: true)', () => {
		const t = new Tempo('Invalid Date', { catch: true, silent: true });

		// Now that we've reverted to enumerable: true, Object.keys should NOT be empty
		// This is the "discoverability" benefit.
		expect(Object.keys(t.term).length).toBeGreaterThan(0);
		expect(Object.keys(t.fmt).length).toBeGreaterThan(0);
	});

	it('should be silent when logging the instance with silent: true', () => {
		const t = new Tempo('Invalid Date', { catch: true, silent: true });
		
		// Manual spies to confirm NO console noise is produced during evaluation
		const spyE = vi.spyOn(console, 'error').mockImplementation(() => { });
		const spyW = vi.spyOn(console, 'warn').mockImplementation(() => { });

		// Trigger full evaluation of all enumerable getters
		const keys = Object.keys(t.term);
		console.log(`Triggered ${keys.length} getters silently.`);

		// Even though getters were triggered and some definitely failed (invalid date),
		// Logify.silent should have prevented any console output.
		expect(spyE).not.toHaveBeenCalled();
		expect(spyW).not.toHaveBeenCalled();

		spyE.mockRestore();
		spyW.mockRestore();
	});

	it('should still show errors when NOT in silent mode (baseline check)', () => {
		const spyW = vi.spyOn(console, 'warn').mockImplementation(() => { });
		const t = new Tempo('Invalid Date', { catch: true, silent: false });
		
		// Trigger a failure (which calls Logify.catch with {catch: true})
		try { t.term.quarter } catch(e) {}

		expect(spyW).toHaveBeenCalled();
		spyW.mockRestore();
	});
});
