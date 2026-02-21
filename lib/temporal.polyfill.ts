/**
 * This file is used to polyfill the Temporal API for environments that do not support it.
 * It is not needed in environments that support the Temporal API.
 * It is only reference from the main entry point of the application,
 * and not 'imported' into an ES modules
 * 
 * The polyfill import is only needed in the 'whiteLibrary' project.
 * 
 * example:  npx tsx --import ./lib/temporal.polyfill.ts --env-file=.env ./src/wallet.ts
 */

import { Temporal } from '@js-temporal/polyfill';

if (!globalThis.Temporal) {
  Object.defineProperty(globalThis, 'Temporal', {
    value: Temporal,
    writable: false,
    enumerable: true,
    configurable: false,
  });
}
