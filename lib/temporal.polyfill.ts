/**
 * This file is used to polyfill the Temporal API for environments that do not support it.
 * It is not needed in environments that support the Temporal API.
 * 
 * The polyfill import is only needed in the 'whiteLibrary' and 'whiteSheet' projects.
 * 
 * node example:  npx tsx --import ./lib/temporal.polyfill.ts --env-file=.env ./src/wallet.ts
 */

import { Temporal as _Temporal } from '@js-temporal/polyfill';

// @ts-ignore
if (!globalThis.Temporal) {
  Object.defineProperty(globalThis, 'Temporal', {
    value: _Temporal,
    writable: false,
    enumerable: true,
    configurable: false,
  });
}
