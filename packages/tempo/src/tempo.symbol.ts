/**
 * Centralized registry for all Tempo-specific Global Symbols.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 * Tempo-specific symbols are kept here (rather than @magmacomputing/library) to maintain
 * clean separation of concerns.
 */

/** key for Global Discovery of Tempo configuration */			export const $Tempo = Symbol.for('$Tempo');
/** key for Global Discovery of Tempo Plugins */						export const $Plugins = Symbol.for('$TempoPlugin');
/** key for Reactive Plugin Registration */									export const $Register = Symbol.for('$TempoRegister');

/**
 * Define a reactive registration hook on a global symbol.
 * Allows Tempo to listen for side-effect plugin registrations
 * from plugins loaded later in the lifecycle.
 * @returns any previous callback already registered for this symbol
 */
export function registerHook(sym: symbol, cb: (val: any) => void) {
	const existing = (globalThis as any)[sym];

	if (existing !== undefined && typeof existing === 'function')
		console.warn(`Overwriting existing hook for symbol: ${sym.description}`);

	(globalThis as any)[sym] = cb;
	return existing;																					// allow chaining or cleanup
}