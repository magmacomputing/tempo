import { Tempo } from '../lib/tempo.class';

const label = 'static:';

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} get the accessors`, () => {
    expect(Tempo.properties.sort())
      .toEqual(['yy', 'mm', 'dd', 'hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'ww', 'tz', 'ts', 'dow', 'mmm', 'mon', 'ddd', 'day', 'qtr', 'szn', 'nano', 'terms', 'config', 'epoch'].sort())
  })

  test(`${label} get the durations`, () => {
    expect(Tempo.durations)
      .toEqual(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'])
  })
})