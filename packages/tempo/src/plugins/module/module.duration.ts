import { $Interpreter } from '../../tempo.symbol.js';
import { defineModule } from '../plugin.util.js';
import { duration } from './module.duration.logic.js';
import type { Tempo } from '../../tempo.class.js';

/**
 * Functional Module to attach duration methods to Tempo.
 */
// @ts-ignore
export const DurationModule: Tempo.Module = defineModule((options: any, TempoClass: any) => {
	TempoClass[$Interpreter] ??= {};
	TempoClass[$Interpreter].duration = duration;
});
