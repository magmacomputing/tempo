import { Tempo } from './src/tempo.class.js';
import { TickerPlugin } from './src/plugins/extend/plugin.ticker.js';
import { QuarterTerm } from './src/plugins/term/term.quarter.js';

Tempo.init();
Tempo.extend(TickerPlugin);
Tempo.extend(QuarterTerm);

console.log("START");
const seed = '2020-01-01T00:00:00';
console.log("Adding quarter to seed:", new Tempo(seed).add({'#quarter': 1}).toString());
console.log("Creating ticker...");
const ticker = Tempo.ticker({ '#quarter': 1 }, { seed });
console.log("Ticker created.");
console.log("Pulse 1", ticker.pulse().toString());
console.log("Pulse 2", ticker.pulse().toString());
console.log("DONE");
