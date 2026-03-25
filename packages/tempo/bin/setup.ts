/**
 * Test setup file.
 * This ensures tests and REPL work in an environment with native Temporal support 
 * or a user-provided polyfill.
 */
import { Temporal as _Temporal } from '@js-temporal/polyfill';

if (!(globalThis as any).Temporal) {
	Object.defineProperty(globalThis, 'Temporal', {
		value: _Temporal,
		writable: false,
		enumerable: true,
		configurable: false,
	});
}
