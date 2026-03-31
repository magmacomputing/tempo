import { QuarterTerm } from './term.quarter.js'
import { SeasonTerm } from './term.season.js'
import { ZodiacTerm } from './term.zodiac.js'
import { TimelineTerm } from './term.timeline.js'

/** collection of built-in terms for initial registration */
export const registerTerms = [QuarterTerm, SeasonTerm, ZodiacTerm, TimelineTerm];
