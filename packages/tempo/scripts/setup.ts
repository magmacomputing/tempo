import { Temporal } from '@js-temporal/polyfill';

Object.defineProperty(globalThis, 'Temporal', { value: Temporal, enumerable: false, configurable: true, writable: true });
