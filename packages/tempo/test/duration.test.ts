import { Tempo } from '#tempo';

describe('Tempo overloads', () => {
  const t = new Tempo();

  test('until() returns Duration when unit is omitted', () => {
    const d1 = t.until();
    expect(d1).toHaveProperty('iso');
    expect(typeof d1.iso).toBe('string');

    const d2 = t.until({ timeZone: 'UTC' });
    expect(d2).toHaveProperty('iso');

    const d3 = t.until('2024-01-01');
    expect(d3).toHaveProperty('iso');

    const d4 = t.until('2024-01-01', { timeZone: 'UTC' });
    expect(d4).toHaveProperty('iso');
  });

  test('until() returns number when unit is specified', () => {
    const n1 = t.until('hours');
    expect(typeof n1).toBe('number');

    const n2 = t.until({ unit: 'hours' });
    expect(typeof n2).toBe('number');

    const n3 = t.until('hours', { timeZone: 'UTC' });
    expect(typeof n3).toBe('number');

    const n4 = t.until('2024-01-01', 'hours');
    expect(typeof n4).toBe('number');

    const n5 = t.until('2024-01-01', { unit: 'hours' });
    expect(typeof n5).toBe('number');

    const n6 = t.until({ timeZone: 'UTC' }, 'hours');
    expect(typeof n6).toBe('number');

    const n7 = t.until({ timeZone: 'UTC' }, { unit: 'hours' });
    expect(typeof n7).toBe('number');
  });

  test('since() returns string', () => {
    const s1 = t.since();
    expect(typeof s1).toBe('string');

    const s2 = t.since('hours');
    expect(typeof s2).toBe('string');

    const s3 = t.since('2024-01-01', 'hours');
    expect(typeof s3).toBe('string');
  });
});
