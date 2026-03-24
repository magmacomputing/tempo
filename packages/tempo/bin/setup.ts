/**
 * Test setup file.
 * This ensures tests and REPL work in an environment with native Temporal support 
 * or a user-provided polyfill.
 */
await import('#library/prototype.library.js');							// load prototype patches

if (!(globalThis as any).Temporal) {
	const { Temporal: _Temporal } = await import('@js-temporal/polyfill');

	Object.defineProperty(globalThis, 'Temporal', {
		value: _Temporal,
		writable: false,
		enumerable: true,
		configurable: false,
	});
}

export { }
