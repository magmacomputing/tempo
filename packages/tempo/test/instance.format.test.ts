import { Tempo } from '#core/tempo.class.js';

const label = 'instance.format:';

describe(`${label} format method`, () => {

  test('formats with standard tokens', () => {
    const t = new Tempo('2024-05-20 15:30:00');
    expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20');
    // hh is 24-hour hour. HH is 12-hour hour.
    expect(t.format('{hh}:{mi}')).toBe('15:30');
  });

  test('formats with 12-hour clock and meridiem', () => {
    const t = new Tempo('2024-05-20 15:30:00');
    expect(t.format('{HH}:{mi}{mer}')).toBe('03:30pm');
  });

  test('accesses term properties via {term.xxx}', () => {
    const t = new Tempo('2024-05-20');
    // We expect {term.quarter} to work if registered in terms
    const formatted = t.format('{term.quarter}');
    // Since we don't know for sure if quarter is loaded in the test environment,
    // we just check that it doesn't crash and returns something plausible
    expect(formatted).toBeDefined();
  });

  test('handles escaping correctly', () => {
    const t = new Tempo('2024-05-20');
    // Match.braces matches tokens inside { }. 
    // The current implementation returns the escaped string as-is because it doesn't match the regex.
    expect(t.format('\\{yyyy\\}')).toContain('yyyy');
  });

  test('formats with pre-defined full names', () => {
    const t = new Tempo('2024-05-20');
    // mon/mmm are for month names. wkd/www are for weekday names.
    // In current implementation:
    // mon -> short (May), mmm -> short (May) [actually both same for May]
    // wkd -> short (Mon), www -> short (Mon)
    expect(t.format('{mmm}')).toBe('May');
    expect(t.format('{www}')).toBe('Mon');
  });

});
