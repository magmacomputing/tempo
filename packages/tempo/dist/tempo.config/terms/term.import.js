/**
 * Built-in term plugin registrations.
 *
 * This module exports a registration function to be called by tempo.class.ts.
 *
 * returns an array of Terms to be loaded into Tempo.#terms
 */
import * as qtr from './term.quarter.js';
import * as szn from './term.season.js';
import * as zdc from './term.zodiac.js';
import * as per from './term.timeline.js';
export default [
    { key: qtr.key, scope: qtr.scope, description: qtr.description, define: qtr.define },
    { key: szn.key, scope: szn.scope, description: szn.description, define: szn.define },
    { key: zdc.key, scope: zdc.scope, description: zdc.description, define: zdc.define },
    { key: per.key, scope: per.scope, description: per.description, define: per.define },
];
//# sourceMappingURL=term.import.js.map