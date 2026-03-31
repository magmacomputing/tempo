/**
 * This file verifies native Temporal API support.
 * Any library that depends on the Temporal API should ensure this is loaded first.
 */

import { Temporal } from '@js-temporal/polyfill';

// @ts-ignore
if (!globalThis.Temporal) {
	(globalThis as any).Temporal = Temporal;
}

export { }
