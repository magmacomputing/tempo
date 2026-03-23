import '#tempo/temporal.polyfill.js';
import { Tempo } from '#tempo/tempo.class.js';

describe('Tempo smoke tests', () => {
  beforeAll(() => {
    // Define a dynamic event for testing binding
    Tempo.init({
      event: {
        'my.birthday': function (this: Tempo) {
          return '2026-05-20';
        }
      }
    });
  });

  test('Relative Dates', () => {
    expect(new Tempo('now').isValid()).toBe(true);
    expect(new Tempo('today').format('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Tempo('yesterday').format('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Tempo('tomorrow').format('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('Relative Units', () => {
    expect(new Tempo('2 days ago').format('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Tempo('3 weeks hence').format('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('Dynamic Event Function', () => {
    // Birthday is set to 2026-05-20 in beforeAll
    // 'display' format in Default is 'www, dd mmm yyyy'
    // 2026-05-20 is a Wednesday
    expect(new Tempo('my.birthday').format('display')).toBe('Wed, 20 May 2026');
  });

  test('Relative Period', () => {
    // 'morning' is defined as '08:00' in Default period
    expect(new Tempo('morning').hh).toBe(8);
  });
});
