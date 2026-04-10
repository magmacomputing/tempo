import { Temporal } from '@js-temporal/polyfill';

/**
 * Bare Setup for Tempo.
 * Only polyfills the Temporal API without loading plugins.
 */
Object.defineProperty(globalThis, 'Temporal', { value: Temporal, enumerable: false, configurable: true, writable: true });
