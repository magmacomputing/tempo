/**
 * This file is used to polyfill the Temporal API for environments that do not support it.
 * It is not needed in environments that support the Temporal API.
 * 
 * The polyfill import is really only needed in 'NodeJS' and older 'browser' projects,  
 * but is imported in the ./lib/index.ts file for convenience.
 * 
 * node example:  node ./src/{file}.ts
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
