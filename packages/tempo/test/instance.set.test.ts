import { Tempo } from '#tempo/tempo.class.js';

const label = 'instance.set:';

describe(`${label} set method`, () => {

  test('sets atomic units correctly', () => {
    const t = new Tempo('2024-05-20');
    const t2 = t.set({ year: 2025, month: 12, day: 25 });
    expect(t2.yy).toBe(2025);
    expect(t2.mm).toBe(12);
    expect(t2.dd).toBe(25);
  });

  test('sets via parsing string (e.g. period)', () => {
    const t = new Tempo('2024-05-20 08:00');
    const t2 = t.set({ event: 'afternoon' });							            // afternoon -> 15:00 usually
    expect(t2.hh).toBe(15);
  });

  test('sets via parsing time string', () => {
    const t = new Tempo('2024-05-20');
    const t2 = t.set({ time: '10:30pm' });
    expect(t2.hh).toBe(22);
    expect(t2.mi).toBe(30);
  });

  test('accumulates parse results from .set() calls', () => {
    const t = new Tempo('20-May');
    expect(t.parse.result.length).toBe(1);

    const t2 = t.set({ period: 'afternoon' });
    expect(t2.parse.result.length).toBeGreaterThanOrEqual(2);
    expect(t2.parse.result.some(r => r.type === 'Period')).toBe(true);
  });

  test('startOf/midOf/endOf shorthand via set', () => {
    const t = new Tempo('2024-05-20 12:34:56');
    const start = t.set({ start: 'day' });
    expect(start.hh).toBe(0);
    expect(start.mi).toBe(0);

    const end = t.set({ end: 'month' });
    expect(end.dd).toBe(31);
    expect(end.hh).toBe(23);
  });

});
