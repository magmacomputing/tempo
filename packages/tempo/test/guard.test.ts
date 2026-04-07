import { Tempo } from '#tempo/tempo.class.js';

describe('Master Guard Verification', () => {

  test('should pass valid ISO strings with single TimeZone brackets', () => {
    const inputs = [
      '2024-01-01[America/New_York]',
      '2024-01-01T12:00[UTC]',
      '2024-01-01T12:00:00.123[+10:00]'
    ];
    
    inputs.forEach(input => {
      const t = new Tempo(input);
      expect(t.isValid, `Failed to validate: ${input}`).toBe(true);
    });
  });

  test('should pass valid ISO strings with dual (TimeZone + Calendar) brackets', () => {
    const inputs = [
      '2024-01-01[America/New_York][iso8601]',
      '2024-01-01T12:00[UTC][gregory]',
      '2024-01-01[Z][japanese]'
    ];
    
    inputs.forEach(input => {
      const t = new Tempo(input);
      expect(t.isValid, `Failed to validate dual-brackets: ${input}`).toBe(true);
    });
  });

  test('should correctly reject malformed brackets or invalid characters inside them', () => {
    const inputs = [
      '2024-01-01[UTC',         // Missing closing bracket
      '2024-01-01UTC]',         // Missing opening bracket
      '2024-01-01[UTC]extra',   // Trailing invalid characters
      '2024-01-01[]'            // Empty brackets (now rejected by our sync logic)
    ];
    
    inputs.forEach(input => {
      // Tempo throws on parse failure if catch is false (default)
      expect(() => new Tempo(input, { silent: true })).toThrow();
    });
  });

  test('should handle keyword-interleaving (e.g. "today[UTC]")', () => {
    const t = new Tempo('today[UTC]');
    expect(t.isValid).toBe(true);
    expect(t.tz).toBe('UTC');
  });

  test('should correctly extract unwrapped timezone and calendar values', () => {
    // Single bracket
    const t1 = new Tempo('2024-01-01[America/New_York]');
    expect(t1.tz).toBe('America/New_York');

    // Dual brackets
    const t2 = new Tempo('2024-01-01[Europe/Paris][gregory]');
    expect(t2.tz).toBe('Europe/Paris');
    expect(t2.cal).toBe('gregory');

    // Calendar-only (handled via the same snippet logic)
    const t3 = new Tempo('2024-01-01[u-ca=japanese]');
    expect(t3.cal).toBe('japanese');

    // Mixed case/symbol content
    const t4 = new Tempo('2024-01-01[Etc/GMT+10]');
    expect(t4.tz).toBe('Etc/GMT+10');
  });

});
