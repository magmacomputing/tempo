/**
 * Centralized registry for all Global Symbols used across the Magma monorepo.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

/** key to use for identifying the raw target of a Proxy */	export const $Target = Symbol.for('$Target');
/** key to identify objects that should remain extensible */export const $Extensible = Symbol.for('$Extensible');
/** NodeJS custom inspection symbol for the Proxy pattern */export const $Inspect = Symbol.for('nodejs.util.inspect.custom');
/** key for Global Discovery of Tempo configuration */			export const $Tempo = Symbol.for('$Tempo');
/** key for Global Discovery of Tempo Plugins */						export const $Plugins = Symbol.for('$TempoPlugin');
/** key for Reactive Plugin Registration */									export const $Register = Symbol.for('$TempoRegister');
/** key to trigger full discovery of all lazy properties */	export const $Discover = Symbol.for('$Discover');

/** 
 * Define a reactive registration hook on a global symbol.
 * This allows a library (like Tempo) to listen for side-effect registrations 
 * from plugins loaded at a later point in the lifecycle.
 */
export function registerHook(sym: symbol, cb: (val: any) => void) {
	(globalThis as any)[sym] = cb;
}

