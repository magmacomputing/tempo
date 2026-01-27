import { Tempo } from '../lib/tempo.class.js';

const label = 'term:';

/**
 * Test the Tempo term plugins
 */
describe(`${label}`, () => {

  test(`${label} check for the {quarter} plugin`, () => {
    const qtr = Tempo.terms.find((plugin: any) => plugin.key === 'qtr');

    expect(qtr)
      .toBeDefined()
  })

  test(`${label} check the term contains {quarter}`, () => {
    const tempo = new Tempo('01-Jan', { sphere: 'south' });
    const quarter = tempo.term.quarter;
    const qtr = tempo.term.qtr;

    expect(Object.keys(tempo.term))
      .toContain('quarter')
    expect(Object.keys(tempo.term))
      .toContain('qtr')
    expect(qtr)
      .toBe('Q3')
  })

  test(`${label} check the {daily} term`, () => {
    const tempo = new Tempo('1pm');
    const period = tempo.term.per;

    expect(period)
      .toBe('midday')
  })
})
