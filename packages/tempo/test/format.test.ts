import { Tempo } from '#core/tempo.class.js';

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

  it('should handle wy for ISO year', () => {
    const t3 = new Tempo('2024-12-30'); // Monday, Week 1 of 2025
    expect(t3.wy).toBe(2025);
    expect(t3.format('{wy}{ww}')).toBe(202501);
    expect(typeof t3.format('{wy}{ww}')).toBe('number');
  })

  describe('auto-meridiem', () => {
    const tAM = new Tempo('2024-05-20T10:30:45');
    const tPM = new Tempo('2024-05-20T22:30:45');

    it('adds am/pm after {HH}', () => {
      expect(tAM.format('{HH}')).toBe('10am');
      expect(tPM.format('{HH}')).toBe('10pm');
    })

    it('adds am/pm after {mi} if it follow {HH}', () => {
      expect(tAM.format('{HH}:{mi}')).toBe('10:30am');
      expect(tPM.format('{HH}:{mi}')).toBe('10:30pm');
    })

    it('adds am/pm after {ss} if it follows {HH}', () => {
      expect(tAM.format('{HH}:{mi}:{ss}')).toBe('10:30:45am');
      expect(tPM.format('{HH}:{mi}:{ss}')).toBe('10:30:45pm');
    })

    it('does not add am/pm if {mer} is already present', () => {
      expect(tAM.format('{HH} {mer}')).toBe('10 am');
      expect(tPM.format('{HH} {mer}')).toBe('10 pm');
    })

    it('does not add am/pm if {MER} is already present', () => {
      expect(tAM.format('{HH} {MER}')).toBe('10 AM');
      expect(tPM.format('{HH} {MER}')).toBe('10 PM');
    })

    it('does not add am/pm for {hh} (24-hour)', () => {
      expect(tPM.format('{hh}:{mi}')).toBe('22:30');
    })

    it('handles non-time tokens in between', () => {
      expect(tAM.format('{HH} on {mon}')).toBe('10am on May');
    })
  })
})
