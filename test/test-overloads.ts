import { Tempo } from '#core/shared/tempo.class.js';

const t = new Tempo();

const d1 = t.until(); // Duration
const d2 = t.until({ timeZone: 'UTC' }); // Duration
const d3 = t.until('2024-01-01'); // Duration
const d4 = t.until('2024-01-01', { timeZone: 'UTC' }); // Duration

const n1 = t.until('hours'); // number
const n2 = t.until({ unit: 'hours' }); // number
const n3 = t.until('hours', { timeZone: 'UTC' }); // number
const n4 = t.until('2024-01-01', 'hours'); // number
const n5 = t.until('2024-01-01', { unit: 'hours' }); // number
const n6 = t.until({ timeZone: 'UTC' }, 'hours'); // number
const n7 = t.until({ timeZone: 'UTC' }, { unit: 'hours' }); // number

const s1 = t.since();
const s2 = t.since('hours');
const s3 = t.since('2024-01-01', 'hours');
