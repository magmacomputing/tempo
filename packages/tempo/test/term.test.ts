import { Tempo } from '#tempo';

const label = 'term:';

/**
 * Test the Tempo term plugins
 */
describe(`${label}`, () => {

  test(`${label} check for the {quarter} plugin`, () => {
    const qtr = (Tempo.terms as any[]).find(({ key }) => key === 'qtr');

    expect(qtr)
      .toBeDefined()
  })

  test(`${label} check the term contains {quarter}`, () => {
    const tempo = new Tempo('01-Jan', { sphere: 'south' });
    const quarter = tempo.term.quarter;										  // evaluate {quarter} on tempo.term
    const qtr = tempo.term.qtr;														  // evaluate {qtr} on tempo.term  

    const keys = [];
    for (const key in tempo.term) keys.push(key);

    expect(keys).toContain('quarter')
    expect(keys).toContain('qtr')
    expect(qtr)
      .toBe('Q3')
  })

  test(`${label} check the {daily} term`, () => {
    const tempo = new Tempo('1pm');
    const period = tempo.term.per;													// evaluate {per} on tempo.term

    expect(period)
      .toBe('midday')
  })
})
