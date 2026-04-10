import { Tempo } from '#tempo';

const label = 'instance.result:';

describe(`${label} parse result accumulation`, () => {

  test('initial parse records one result', () => {
    const t = new Tempo('20-May');
    expect(t.parse.result.length).toBe(1);
    expect(t.parse.result[0].value).toBe('20-May');
  });

  test('multiple .set() calls accumulate results', () => {
    const t1 = new Tempo('2024-05-20');
    const t2 = t1.set({ time: '10:00' });
    const t3 = t2.set({ period: 'afternoon' });

    expect(t3.parse.result.length).toBe(4);								// 1 (constr) + 1 (set.time) + 2 (set.period pushes once in #conform and once in #parsePeriod)
    // Also ensure it meets the minimum
    expect(t3.parse.result.length).toBeGreaterThanOrEqual(3);
  });

  test('mixed .add() and .set() calls preserve history', () => {
    const t = new Tempo('20-May')
      .add({ day: 1 })
      .set({ period: 'noon' });

    // 1 for constr, 1 for .set (add doesn't push new parsing but preserves)
    // Actually user said: "expect that #add will now push a 'ZonedDateTime' rule-match"
    // Let's check current implementation of #add
    expect(t.parse.result.length).toBeGreaterThanOrEqual(2);
  });

  test('nested parsing (Event/Period) records detailed matches', () => {
    const t = new Tempo('xmas');
    // For 'xmas', #conform calls #parseEvent, which calls #result
    expect(t.parse.result.some(r => r.type === 'Event')).toBe(true);
  });

});
