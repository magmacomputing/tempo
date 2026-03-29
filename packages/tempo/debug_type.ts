import * as enums from './src/tempo.enum.js';
import { $Target } from '#library/symbol.library.js';
import { getType } from '#library/type.library.js';

console.log('--- DEBUG ENUMS TYPE ---');
console.log('FORMAT type:', getType(enums.FORMAT));
console.log('FORMAT toString:', Object.prototype.toString.call(enums.FORMAT));
console.log('FORMAT is Proxy:', (enums.FORMAT as any)[$Target] !== undefined);

const tgt = (enums.FORMAT as any)[$Target] ?? enums.FORMAT;
console.log('Target type:', getType(tgt));
console.log('Target toString:', Object.prototype.toString.call(tgt));
console.log('-------------------');
