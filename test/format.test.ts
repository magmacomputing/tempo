import { Tempo } from '#core/shared/tempo.class.js';

describe('Tempo.format() refinements', () => {
  const t = new Tempo('2024-05-20T10:00:00Z');

  it('should return a number for named numeric formats', () => {
    const yw = t.format('yearWeek');
    expect(typeof yw).toBe('number');
    expect(yw).toBe(202421);
  })

  it('should return a number for raw numeric patterns', () => {
    const val = t.format('{yyyy}{mm}{dd}');
    expect(typeof val).toBe('number');
    expect(val).toBe(20240520);
  })

  it('should return a string for formats with leading zeros (if not explicitly numeric)', () => {
    const dd = t.format('{dd}');
    expect(typeof dd).toBe('string');
    expect(dd).toBe('20');

    const t2 = new Tempo('2024-05-05');
    expect(t2.format('{dd}')).toBe('05');
    expect(typeof t2.format('{dd}')).toBe('string');
  })

  it('should handle isoy for ISO year', () => {
    const t3 = new Tempo('2024-12-30'); // Monday, Week 1 of 2025
    expect(t3.format('{isoy}{ww}')).toBe(202501);
    expect(typeof t3.format('{isoy}{ww}')).toBe('number');
  })
})
