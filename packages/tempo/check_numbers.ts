import { enumify } from './src/tempo.enum.js'; // Wait, it's in tempo.enum.js? No, from library.
import { $Target } from './src/tempo.symbol.js'; // Wait, it might be in library too.

// Actually I'll test with the real Tempo
import { Tempo } from './src/tempo.class.ts';

const keysBefore = Object.keys(Tempo.NUMBER);
Tempo.extend({ numbers: { twelve: 12 } });
const keysAfter = Object.keys(Tempo.NUMBER);

console.log('Keys Before:', keysBefore);
console.log('Keys After:', keysAfter);
console.log('Twelve:', (Tempo.NUMBER as any).twelve);
