import { Tempo } from './src/tempo.class.js';
import { QuarterTerm } from './src/plugins/term/term.quarter.js';
import { TimelineTerm } from './src/plugins/term/term.timeline.js';
import { registerTerms } from './src/plugins/term/index.js';

Tempo.init();

const t1 = new Tempo('2020-01-01T00:00:00');
console.log('T1:', t1.format('{YYYY}-{MM}-{DD} {HH}:{mm}'));

const t2 = t1.add({ '#quarter': 1 }); // Should be Apr 1st
console.log('T2 (T1 + #quarter:1):', t2.format('{YYYY}-{MM}-{DD} {HH}:{mm}'));

const t3 = t2.add({ '#quarter': 1 }); // Should be Jul 1st
console.log('T3 (T2 + #quarter:1):', t3.format('{YYYY}-{MM}-{DD} {HH}:{mm}'));

const t4 = t3.add({ '#quarter': 1 }); // Should be Oct 1st
console.log('T4 (T3 + #quarter:1):', t4.format('{YYYY}-{MM}-{DD} {HH}:{mm}'));
