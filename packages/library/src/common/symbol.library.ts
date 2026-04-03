/**
 * Centralized registry for all Global Symbols used across the Magma monorepo.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

/** key to use for identifying the raw target of a Proxy */	export const $Target = Symbol.for('$Target');
/** key to trigger full discovery of all lazy properties */	export const $Discover = Symbol.for('$Discover');
/** key to identify objects that should remain extensible */export const $Extensible = Symbol.for('$Extensible');
/** NodeJS custom inspection symbol for the Proxy pattern */export const $Inspect = Symbol.for('nodejs.util.inspect.custom');
/** unique marker to identify a Logify configuration object */export const $Logify = Symbol.for('$Logify');

/** identify and mark a Logify configuration object */	  	export function markConfig<T extends object>(obj: T): T {
  (obj as any)[$Logify] = true;															// tag the object
  return obj;
}
