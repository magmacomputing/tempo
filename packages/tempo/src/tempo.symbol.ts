/**
 * Centralized registry for all Tempo-specific Global Symbols.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 * Tempo-specific symbols are kept here (rather than @magmacomputing/library) to maintain
 * clean separation of concerns.
 */

import type { Tempo } from '#tempo/tempo.class.js';

/** key for Global Discovery of Tempo configuration */			export const $Tempo = Symbol.for('$Tempo');
/** key for Global Discovery of Tempo Plugins */						export const $Plugins = Symbol.for('$TempoPlugin');
/** key for Reactive Plugin Registration */									export const $Register = Symbol.for('$TempoRegister');
/** key for Global Identity Brand for Tempo */							export const $isTempo = Symbol.for('$isTempo');

/** key for Internal Interpreter Service */									export const $Interpreter = Symbol.for('$TempoInterpreter');
/** key for contextual Error Logging */											export const $logError = Symbol.for('$TempoLogError');
/** key for contextual Debug Logging */											export const $logDebug = Symbol.for('$TempoLogDebug');

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

/** check valid Tempo */
export const isTempo = (tempo?: any): tempo is Tempo => tempo?.[$isTempo] === true;
