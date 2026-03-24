/**
 * Test setup file.
 * This ensures tests and REPL work in an environment with native Temporal support 
 * or a user-provided polyfill.
 */
console.log('--- setup.ts: Starting...');

if (!globalThis.Temporal) {
	console.log('--- setup.ts: Importing polyfill dynamic...');
	const { Temporal: _Temporal } = await import('@js-temporal/polyfill');
	console.log('--- setup.ts: Polyfill imported.');

	console.log('--- setup.ts: Defining globalThis.Temporal...');
	Object.defineProperty(globalThis, 'Temporal', {
		value: _Temporal,
		writable: false,
		enumerable: true,
		configurable: false,
	});
	console.log('--- setup.ts: globalThis.Temporal defined.');
}
