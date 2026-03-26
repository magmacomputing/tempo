/**
 * Centralized registry for all Global Symbols used across the Magma monorepo.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

/** key to use for identifying the raw target of a Proxy */
export const $Target = Symbol.for('$Target');

/** key to identify objects that should remain extensible (skip secure() deep-freeze) */
export const $Extensible = Symbol.for('$Extensible');

/** Node.js custom inspection symbol for the Proxy pattern */
export const $Inspect = Symbol.for('nodejs.util.inspect.custom');
