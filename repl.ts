import './lib/temporal.polyfill.js';
import { Tempo } from './lib/tempo.class.js';

// @ts-ignore
globalThis.Tempo = Tempo;

console.log('\x1b[32mTempo REPL initialized.\x1b[0m');

