import { Tempo } from '#core/shared/tempo.class.js';

const label = 'static.getters:';

// Reset to defaults before each test to ensure isolation
beforeEach(() => { Tempo.init() });

// ─────────────────────────────────────────────────────────────────────────────
// Enum Getters – return frozen Enumify objects with known keys/values
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} WEEKDAY / WEEKDAYS`, () => {
  test('WEEKDAY has 7 short-form entries, plus 1 for All', () => {
    expect(Tempo.WEEKDAY.keys().length).toBe(8);
  })

  test('WEEKDAYS has 7 long-form entries, plus 1 for All', () => {
    expect(Tempo.WEEKDAYS.keys().length).toBe(8);
  })

  test('WEEKDAY keys are abbreviations (3 chars)', () => {
    Tempo.WEEKDAY.keys().forEach(k => expect(k.length).toBeLessThanOrEqual(3));
  })

  test('WEEKDAYS keys are full names', () => {
    expect(Tempo.WEEKDAYS.keys()).toContain('Monday');
  })

})

describe(`${label} MONTH / MONTHS`, () => {

  test('MONTH has 12 short-form entries, plus 1 for All', () => {
    expect(Tempo.MONTH.keys().length).toBe(13);
  })

  test('MONTHS has 12 long-form entries, plus 1 for All', () => {
    expect(Tempo.MONTHS.keys().length).toBe(13);
  })

  test('MONTH includes expected abbreviation', () => {
    expect(Tempo.MONTH.keys()).toContain('Jan');
  })

  test('MONTHS includes expected full name', () => {
    expect(Tempo.MONTHS.keys()).toContain('January');
  })

})

describe(`${label} DURATION / DURATIONS`, () => {

  test('DURATION has 10 singular time unit keys', () => {
    expect(Tempo.DURATION.keys().length).toBe(10);
  })

  test('DURATIONS has 10 plural time unit keys', () => {
    expect(Tempo.DURATIONS.keys().length).toBe(10);
  })

  test('DURATION includes "year"', () => {
    expect(Tempo.DURATION.keys()).toContain('year');
  })

  test('DURATIONS includes "years"', () => {
    expect(Tempo.DURATIONS.keys()).toContain('years');
  })

  test('DURATION values are numbers (seconds)', () => {
    Tempo.DURATION.keys().forEach(k => expect(typeof Tempo.DURATION[k]).toBe('number'));
  })

  test('year in DURATIONS is larger than month', () => {
    expect(Tempo.DURATIONS['years']).toBeGreaterThan(Tempo.DURATIONS['months']);
  })
})

describe(`${label} SEASON`, () => {

  test('SEASON is defined', () => {
    expect(Tempo.SEASON).toBeDefined();
  })

  test('SEASON has quarterly entries', () => {
    expect(Tempo.SEASON.keys().length).toBeGreaterThan(0);
  })

})

describe(`${label} COMPASS`, () => {

  test('COMPASS has North, South, East, West', () => {
    const keys = Tempo.COMPASS.keys();
    expect(keys).toContain('North');
    expect(keys).toContain('South');
    expect(keys).toContain('East');
    expect(keys).toContain('West');
  })

  test('COMPASS values are lowercase strings', () => {
    Tempo.COMPASS.keys().forEach(k => {
      const val = String(Tempo.COMPASS[k]);
      expect(typeof val).toBe('string');
      expect(val).toBe(val.toLowerCase());
    })
  })

})

describe(`${label} ELEMENT`, () => {

  test('ELEMENT keys has entries for standard datetime units', () => {
    expect(Tempo.ELEMENT.keys()).toContain('yy');
    expect(Tempo.ELEMENT.keys()).toContain('mm');
    expect(Tempo.ELEMENT.keys()).toContain('dd');
  })

  test('ELEMENT values has entries for standard datetime units', () => {
    expect(Tempo.ELEMENT.values()).toContain('year');
    expect(Tempo.ELEMENT.values()).toContain('month');
    expect(Tempo.ELEMENT.values()).toContain('day');
  })

})

describe(`${label} FORMAT`, () => {

  test('FORMAT is defined and has named format strings', () => {
    expect(Tempo.FORMAT).toBeDefined();
    expect(Tempo.FORMAT.keys().length).toBeGreaterThan(0);
  })

  test('FORMAT values are strings', () => {
    Tempo.FORMAT.keys().forEach(k => {
      expect(typeof Tempo.FORMAT[k]).toBe('string');
    })
  })

})

describe(`${label} LIMIT`, () => {

  test('LIMIT is defined', () => {
    expect(Tempo.LIMIT).toBeDefined();
  })

  test('LIMIT has at least one boundary date', () => {
    expect(Object.keys(Tempo.LIMIT).length).toBeGreaterThan(0);
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Structural Getters
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} terms`, () => {

  test('terms is an array', () => {
    expect(Array.isArray(Tempo.terms)).toBe(true);
  })

  test('terms contains objects with at least a name', () => {
    Tempo.terms.forEach(t => expect(typeof t.key).toBe('string'));
  })

  test('terms does not expose the "define" function', () => {
    Tempo.terms.forEach(t => expect((t as any).define).toBeUndefined());
  })

})

describe(`${label} properties`, () => {

  test('properties is an array of strings', () => {
    expect(Array.isArray(Tempo.properties)).toBe(true);
    Tempo.properties.forEach(p => expect(typeof p).toBe('string'));
  })

  test('properties includes core instance getters', () => {
    expect(Tempo.properties).toContain('yy');
    expect(Tempo.properties).toContain('mm');
    expect(Tempo.properties).toContain('dd');
  })

  test('properties does not include Symbol keys', () => {
    Tempo.properties.forEach(p => expect(typeof p).not.toBe('symbol'));
  })

})

describe(`${label} config`, () => {

  test('config returns an object', () => {
    expect(typeof Tempo.config).toBe('object');
  })

  test('config has scope "global"', () => {
    expect(Tempo.config.scope).toBe('global');
  })

  test('config has a timeZone string', () => {
    expect(typeof Tempo.config.timeZone).toBe('string');
  })

  test('config is a frozen shallow copy (not the live object)', () => {
    const cfg = Tempo.config;
    expect(Object.isFrozen(cfg)).toBe(true);
  })

  test('config changes are reflected after Tempo.init()', () => {
    Tempo.init({ pivot: 33 });
    expect(Tempo.parse.pivot).toBe(33);
  })

})

describe(`${label} default`, () => {

  test('default returns an object', () => {
    expect(typeof Tempo.default).toBe('object');
  })

  test('default is frozen', () => {
    expect(Object.isFrozen(Tempo.default)).toBe(true);
  })

  test('default has a pivot', () => {
    expect(typeof Tempo.default.pivot).toBe('number');
  })

})

describe(`${label} parse`, () => {

  test('parse returns an object', () => {
    expect(typeof Tempo.parse).toBe('object');
  })

  test('parse has snippet, layout, event, period sub-objects', () => {
    expect(Tempo.parse.snippet).toBeDefined();
    expect(Tempo.parse.layout).toBeDefined();
    expect(Tempo.parse.event).toBeDefined();
    expect(Tempo.parse.period).toBeDefined();
  })

  test('parse.snippet is a frozen copy', () => {
    expect(Object.isFrozen(Tempo.parse)).toBe(true);
  })

  test('parse updates after Tempo.init() with new snippet', () => {
    Tempo.init({ snippet: { mySnip: 'myVal' } });
    const sym = Tempo.getSymbol('mySnip');
    expect(Tempo.parse.snippet[sym]).toBeInstanceOf(RegExp);
  })

  test('parse.mdyLocales is an array', () => {
    expect(Array.isArray(Tempo.parse.mdyLocales)).toBe(true);
  })

})
