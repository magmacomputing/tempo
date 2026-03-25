/**
 * Built-in term plugin registration objects.
 *
 * This module exports an array of Tempo.TermPlugin objects to be imported by tempo.class.ts.  
 * Tempo will pass these ( via Tempo.init() ) to Tempo.extend() to register these on the 'term' getter.
 */

import * as qtr from './term.quarter.js';
import * as szn from './term.season.js';
import * as zdc from './term.zodiac.js';
import * as per from './term.timeline.js';
import type { Tempo } from '#tempo';

export default [
	{ key: qtr.key, scope: qtr.scope, description: qtr.description, define: qtr.define },
	{ key: szn.key, scope: szn.scope, description: szn.description, define: szn.define },
	{ key: zdc.key, scope: zdc.scope, description: zdc.description, define: zdc.define },
	{ key: per.key, scope: per.scope, description: per.description, define: per.define },
] as Tempo.TermPlugin[]
