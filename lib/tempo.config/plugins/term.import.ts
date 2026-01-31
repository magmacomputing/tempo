/**
 * import of plugins
 */
import * as qtr from '#core/shared/tempo.config/plugins/term.quarter.js';
import * as szn from '#core/shared/tempo.config/plugins/term.season.js';
import * as zdc from '#core/shared/tempo.config/plugins/term.zodiac.js';
import * as per from '#core/shared/tempo.config/plugins/term.timeline.js';

export default [																						// export to Tempo class
	{ key: qtr.key, scope: qtr.scope, description: qtr.description, define: qtr.define },
	{ key: szn.key, scope: szn.scope, description: szn.description, define: szn.define },
	{ key: zdc.key, scope: zdc.scope, description: zdc.description, define: zdc.define },
	{ key: per.key, scope: per.scope, description: per.description, define: per.define },
]

/**
 * Usage:
 * show only the 'key' field from the pre-defined range
 * new Tempo('20-May-1957').term.qtr		# range of Fiscal Quarters
 * 			> 'Q2'
 * show the 'range' object that relates to the Tempo instance
 * new Tempo('28-Aug-1968').term.quarter
 * 			> {key: 'Q2', day: 1, month: 4, fiscal: 1969}
 * 
 * Notes:  
 * A 'term' has two parts:  
 * 1) an array of objects that define the DateTime lower boundaries of a range  
 * (e.g.  [{key: 'Summer', day: 1, month: 12}, {key: 'Autumn', day: 1, month: 3}...])  
 * these are statically defined when the Tempo class is first imported.  
 *   
 * 2) a function which determines where a Tempo instance fits within the above range array.  
 * this function is assigned to a getter on the 'term' property for each new Tempo instance.  
 * 
 * I did consider using 'import()', but that would introduce a Promise-based set of plugins  
 * that would require a .then() to access the values.  
 * But, I would prefer to keep this synchronous, and lazy-loaded.  
 *   
 * The 'export default' is an object that stashes the plugin definitions.
 * Tempo will use this object to define getter properties on each instance (under the 'term' property).  
 * (for example, new Tempo().term.season)  
 * The getter will not execute the code until actually referenced (lazy-loaded).  
 * In this way, we can defer the execution of the lookup until it is needed  
 * and keep a Tempo instance as light-weight as possible.  
 * 
 * In addition, the getter will be auto-replaced with the return-value of the plugin definition.  
 * (for example, the
 * Object.defineProperty(..., ..., { get: () => { ... } })	will be overridden after first access with  
 * Object.defineProperty(..., ..., { value: ... })  
 * In this way, we can memoize the result of the plugin definition, and avoid the need to execute the lookup again.
 */