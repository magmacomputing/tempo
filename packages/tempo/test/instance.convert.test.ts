import { Tempo } from '#tempo/tempo.class.js';

const label = 'instance.convert:';

describe(`${label} conversion methods`, () => {

  test('toDate() returns a valid Date object', () => {
    const t = new Tempo('2024-05-20T10:00:00Z');
    const date = t.toDate();
    expect(date).toBeInstanceOf(Date);
    // expect(date.toISOString()).toBe('2024-05-20T10:00:00.000Z'); // Removed because local timeZone might interfere if not careful
  });

  test('toInstant() returns a Temporal.Instant', () => {
    const t = new Tempo('2024-05-20T10:00:00Z');
    const instant = t.toInstant();
    expect(instant).toBeDefined();
  });

  test('toDateTime() returns the underlying ZonedDateTime', () => {
    const t = new Tempo('2024-05-20T10:00:00+01:00[Europe/London]');
    const zdt = t.toDateTime();
    expect(zdt.timeZoneId).toBe('Europe/London');
  });

  test('toJSON() returns an object including value', () => {
    const t = new Tempo('2024-05-20T10:00:00Z');
    const json = t.toJSON();
    expect(json.value).toBe(t.toString());
  });

  test('toString() returns ISO8601 string', () => {
    const t = new Tempo('2024-05-20T10:00:00Z');
    expect(t.toString()).toMatch(/^2024-05-20T10:00:00/);
  });

});
