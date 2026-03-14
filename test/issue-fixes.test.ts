import { Tempo, $Tempo } from '#core/shared/tempo.class.js';

describe('Tempo Issue Fixes', () => {
  beforeEach(() => { 
    Tempo.init();
    // Clear mock storage if needed (using env for Node)
    delete process.env[$Tempo];
  });

  describe('Relative Event Logic', () => {
    test('relative events follow the instance base when using .set()', () => {
      const today = new Tempo();
      const yesterday = today.set({ event: 'yesterday' });
      const dayBeforeYesterday = yesterday.set({ event: 'yesterday' });
      
      const expected = (today.toDateTime()).toPlainDate().add({ days: -2 });
      expect(dayBeforeYesterday.format('{yyyy}-{mm}-{dd}')).toBe(expected.toString());
    })

    test('now uses the instance base if available', () => {
      // Offset by 1 hour
      const past = new Tempo().add({ hours: -1 });
      const nowFromPast = past.set({ event: 'now' });
      
      // Since 'now' returns an Instant in this case, it should match the past's instant
      expect(nowFromPast.toInstant().epochMilliseconds).toBe(past.toInstant().epochMilliseconds);
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
  })

  describe('Storage Precedence (Discovery > Storage > Defaults)', () => {
    test('Storage overrides Defaults', () => {
      // Mock storage
      process.env[$Tempo] = JSON.stringify({ pivot: 10 });
      
      // Initialize without options - should pick up from storage
      Tempo.init();
      expect(Tempo.parse.pivot).toBe(10);
    })

    test('Discovery overrides Storage', () => {
      process.env[$Tempo] = JSON.stringify({ pivot: 10 });
      
      // Global Discovery (using symbol)
      (globalThis as any)[Symbol.for($Tempo)] = {
        options: { pivot: 20 }
      };
      
      Tempo.init();
      expect(Tempo.parse.pivot).toBe(20);
      
      // Cleanup
      delete (globalThis as any)[Symbol.for($Tempo)];
    })
  })
})
