import * as enums from './src/tempo.enum.js';
import { $Target } from '#library/symbol.library.js';

console.log('--- DEBUG ENUMS ---');
console.log('FORMAT keys:', Object.keys(enums.FORMAT));
console.log('Has extend:', typeof enums.FORMAT.extend);

const tgt = (enums.FORMAT as any)[$Target] ?? enums.FORMAT;
console.log('Target keys:', Object.keys(tgt));
console.log('Prototype:', Object.getPrototypeOf(tgt));
console.log('Prototype keys:', Object.keys(Object.getPrototypeOf(tgt)));
console.log('-------------------');
