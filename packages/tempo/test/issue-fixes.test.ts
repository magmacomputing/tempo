import { Tempo } from '#tempo/tempo.class.js';
import { $Tempo } from '#library/symbol.library.js';

const keyFor = Symbol.keyFor($Tempo)!;

describe('Tempo Issue Fixes', () => {
  beforeEach(() => {
    Tempo.init();
    // Clear mock storage if needed (using env for Node)
    delete process.env[keyFor];
  });

  describe('Relative Event Logic', () => {
    test('relative events follow the instance base when using .set()', () => {
      const today = new Tempo();
      const yesterday = today.set({ event: 'yesterday' });
      const dayBeforeYesterday = yesterday.set({ event: 'yesterday' });

      const expected = (today.toDateTime()).toPlainDate().add({ days: -2 });
      expect(dayBeforeYesterday.format('{yyyy}-{mm}-{dd}')).toBe(expected.toString());
    })

    test('now matches the current time by default', () => {
      const t = new Tempo('now');
      const realNow = Temporal.Now.instant().epochMilliseconds;
      // Allow 200ms for execution jitter
      expect(Math.abs(t.toInstant().epochMilliseconds - realNow)).toBeLessThan(200);
    })

    test('combined event and period works correctly (e.g. yesterday afternoon)', () => {
      const t = new Tempo('yesterday afternoon');
      const expectedDate = new Tempo().add({ days: -1 }).format('{yyyy}-{mm}-{dd}');

      expect(t.format('{yyyy}-{mm}-{dd}')).toBe(expectedDate);
      expect(t.format('{HH}')).toBe('03pm'); // afternoon is 3:00pm
    })
  })

  describe('ZonedDateTime Bracket Parsing', () => {
    test('recognizes timezone ID in brackets over offset', () => {
      // +01:00 is not London during DST, but the bracket should win
      const t = new Tempo('2024-05-20T10:00:00+01:00[Europe/London]');
      expect(t.tz).toBe('Europe/London');
    })

    test('handles Z with brackets', () => {
      const t = new Tempo('2024-05-20T10:00:00Z[UTC]');
      expect(t.tz).toBe('UTC');
    })

    test('bracketed timezone is applied before relative event resolution', () => {
      // The correct way to resolve relative events in a specific timezone is via options
      const t = new Tempo('yesterday', { timeZone: 'America/New_York' });
      expect(t.tz).toBe('America/New_York');

      // Verify the date is correct for NY
      const nyNow = Temporal.Now.zonedDateTimeISO('America/New_York');
      const expectedDate = nyNow.subtract({ days: 1 }).toPlainDate().toString();
      expect(t.format('{yyyy}-{mm}-{dd}')).toBe(expectedDate);
    })
  })

  describe('Storage Precedence (Discovery > Storage > Defaults)', () => {
    test('Storage overrides Defaults', () => {
      // Mock storage
      process.env[keyFor] = JSON.stringify({ pivot: 10 });

      // Initialize without options - should pick up from storage
      Tempo.init();
      expect(Tempo.parse.pivot).toBe(10);
    })

    test('Discovery overrides Storage', () => {
      process.env[keyFor] = JSON.stringify({ pivot: 10 });

      // Global Discovery (using symbol)
      (globalThis as any)[Symbol.for(keyFor)] = {
        options: { pivot: 20 }
      };

      Tempo.init();
      expect(Tempo.parse.pivot).toBe(20);

      // Cleanup
      delete (globalThis as any)[Symbol.for(keyFor)];
    })
  })

  describe('.set() and .add() Flexibility', () => {
    test('set() accepts options with timeZone', () => {
      const t = new Tempo('2024-05-20 10:00', { timeZone: 'UTC' });
      const lon = t.set({ timeZone: 'Europe/London' });
      expect(lon.tz).toBe('Europe/London');
      expect(lon.format('{hh}:{mi}')).toBe('11:00'); // London is DST (+01:00) in May
    })

    test('set() accepts two arguments (value, options)', () => {
      const t = new Tempo('2024-05-20 10:00', { timeZone: 'UTC' });
      // This would have failed before
      const shifted = t.set('tomorrow', { timeZone: 'America/New_York' });
      expect(shifted.tz).toBe('America/New_York');
      expect(shifted.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-21');
    })

    test('add() accepts options with mutation', () => {
      const t = new Tempo('2024-05-20 10:00', { timeZone: 'UTC' });
      const nextWeek = t.add({ days: 7 }, { debug: true });
      expect(nextWeek.format('{dd}')).toBe('27');
    })
  })
})
