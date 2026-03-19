/**
 * Built-in term plugin registrations.
 *
 * This module exports a registration function to be called by tempo.class.ts.
 *
 * returns an array of Terms to be loaded into Tempo.#terms
 */

import * as qtr from '#core/shared/tempo.config/plugins/term.quarter.js';
import * as szn from '#core/shared/tempo.config/plugins/term.season.js';
import * as zdc from '#core/shared/tempo.config/plugins/term.zodiac.js';
import * as per from '#core/shared/tempo.config/plugins/term.timeline.js';
import type { Tempo } from '#core/shared/tempo.class.js';

export default [
	{ key: qtr.key, scope: qtr.scope, description: qtr.description, define: qtr.define },
	{ key: szn.key, scope: szn.scope, description: szn.description, define: szn.define },
	{ key: zdc.key, scope: zdc.scope, description: zdc.description, define: zdc.define },
	{ key: per.key, scope: per.scope, description: per.description, define: per.define },
] as Tempo.TermPlugin[]
