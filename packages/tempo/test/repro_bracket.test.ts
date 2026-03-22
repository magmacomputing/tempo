import { Tempo } from '#core/tempo.class.js';

describe('Bracket Regex Fix', () => {
  it('should correctly parse timezone and calendar from multiple brackets', () => {
    const input = '2024-05-20T10:00:00+00:00[UTC][u-ca=gregory]';
    const t = new Tempo(input);
    
    expect(t.tz).toBe('UTC');
    // We need to check if calendar is correctly updated. 
    // Since I don't see a public 'calendar' getter, I'll check if the instance reflects it in a way we can verify.
    // Based on #parseZone: this.#local.config.calendar = calendar;
    // Tempo.config returns a proxy of this.#local.config (or global if local is empty/inherited)
    expect(t.config.calendar).toBe('gregory');
  });

  it('should handle single bracket as timezone', () => {
    const t = new Tempo('2024-05-20T10:00:00+01:00[Europe/London]');
    expect(t.tz).toBe('Europe/London');
  });
});
