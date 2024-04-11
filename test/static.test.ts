import { Tempo } from '../lib/tempo.class';

const label = 'static:';

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} get the properties`, () => {
    expect(Tempo.properties.sort())
      .toEqual(['yy', 'mm', 'dd', 'hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'ww', 'tz', 'ts', 'dow', 'mmm', 'mon', 'ddd', 'day', 'nano', 'term', 'config', 'epoch'].sort())
  })

  test(`${label} get the elements`, () => {
    expect(Tempo.elements)
      .toEqual(['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'])
  })

  test(`${label} get the durations`, () => {
    expect(Tempo.durations)
      .toEqual(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'])
  })

  test(`${label} check the terms contains {quarter}`, () => {
    expect(JSON.stringify(Object.keys(Tempo.terms)))
      .toContain('quarter')
  })
})