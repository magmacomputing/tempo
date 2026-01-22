import { Tempo } from '../lib/tempo.class.js';

const label = 'static:';

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} get the properties`, () => {
    expect(Tempo.properties.toSorted())
      .toEqual(['yy', 'mm', 'dd', 'hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'fmt', 'ww', 'tz', 'ts', 'dow', 'mmm', 'mon', 'www', 'wkd', 'day', 'nano', 'term', 'config', 'epoch'].toSorted())
  })

  test(`${label} get the elements`, () => {
    expect(Tempo.DURATION.keys())
      .toEqual(['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'])
  })

  test(`${label} get the durations`, () => {
    expect(Tempo.DURATIONS.keys())
      .toEqual(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'])
  })

  test(`${label} check the term contains {quarter}`, () => {
    const tempo = new Tempo('01-Jan', { sphere: 'south' });
    const quarter = tempo.term.quarter;
    const qtr = tempo.term.qtr;

    expect(JSON.stringify(Object.keys(tempo.term)))
      .toContain('quarter')
    expect(JSON.stringify(Object.keys(tempo.term)))
      .toContain('qtr')
    expect(qtr)
      .toBe('Q3')
  })
})