import { Tempo } from '#core/shared/tempo.class.js';

const label = 'static.methods:';
const testKey = '$TempoTest';
const testDiscovery = '$TempoTest';

// Reset to defaults before each test to ensure isolation
beforeEach(() => {
  delete (globalThis as any)[Symbol.for(testDiscovery)];
  Tempo.writeStore(void 0, testKey);
  Tempo.init({ store: testKey, discovery: testDiscovery });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.init()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} init`, () => {

  test('returns the global config', () => {
    const config = Tempo.init();
    expect(config).toBeDefined();
    expect(config.scope).toBe('global');
  })

  test('reset to defaults when called with no args', () => {
    Tempo.init({ pivot: 99 });
    expect(Tempo.parse.pivot).toBe(99);
    Tempo.init();
    expect(Tempo.parse.pivot).toBe(Tempo.default.pivot);		// back to default
  })

  test('applies timeZone abbreviation alias', () => {
    Tempo.init({ timeZone: 'AEST' });
    expect(Tempo.config.timeZone).toBe('Australia/Sydney');
  })

  test('applies timeZone as IANA directly', () => {
    Tempo.init({ timeZone: 'America/New_York' });
    expect(Tempo.config.timeZone).toBe('America/New_York');
  })

  test('infers sphere (north) for a northern timezone', () => {
    Tempo.init({ timeZone: 'America/New_York' });
    expect(Tempo.config.sphere).toBe(Tempo.COMPASS.North);
  })

  test('infers sphere (south) for a southern timezone', () => {
    Tempo.init({ timeZone: 'Australia/Sydney' });
    expect(Tempo.config.sphere).toBe(Tempo.COMPASS.South);
  })

  test('sphere (none) for UTC which does not observe DST', () => {
    Tempo.init({ timeZone: 'UTC' });
    expect(Tempo.config.sphere).toBeUndefined();
  })

  test('applies custom pivot year', () => {
    Tempo.init({ pivot: 50 });
    expect(Tempo.parse.pivot).toBe(50);
  })

  test('mdyLocales are set after init with a locale', () => {
    Tempo.init({ mdyLocales: ['en-PH'] });
    expect(Tempo.parse.mdyLocales.length).toBeGreaterThan(0);
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.getSymbol()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} getSymbol`, () => {

  test('returns a Symbol for a new string key', () => {
    const sym = Tempo.getSymbol('myKey');
    expect(typeof sym).toBe('symbol');
  })

  test('returns the same Symbol for the same key (idempotent)', () => {
    const sym1 = Tempo.getSymbol('dupeKey');
    const sym2 = Tempo.getSymbol('dupeKey');
    expect(sym1).toBe(sym2);
  })

  test('returns a unique auto-allocated Symbol when called with no args', () => {
    const sym1 = Tempo.getSymbol();
    const sym2 = Tempo.getSymbol();
    expect(sym1).not.toBe(sym2);
  })

  test('registers and returns an existing Symbol when passed a symbol', () => {
    const original = Symbol('testSym');
    const registered = Tempo.getSymbol(original);
    expect(registered).toBe(original);
  })

  test('handles namespaced keys (uses last segment as description)', () => {
    const sym = Tempo.getSymbol('ns.myToken');
    expect(sym.description).toBe('myToken');
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.regexp()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} regexp`, () => {

  test('returns a RegExp', () => {
    expect(Tempo.regexp('{yy}')).toBeInstanceOf(RegExp);
  })

  test('is anchored (^ and $)', () => {
    const re = Tempo.regexp('{yy}');
    expect(re.source.startsWith('^')).toBe(true);
    expect(re.source.endsWith('$')).toBe(true);
  })

  test('is case-insensitive', () => {
    const re = Tempo.regexp('{yy}');
    expect(re.flags).toContain('i');
  })

  test('expands a simple layout token', () => {
    // {yy} should expand into a 4-digit year pattern
    const re = Tempo.regexp('{yy}');
    expect(re.test('2024')).toBe(true);
    expect(re.test('abcd')).toBe(false);
  })

  test('expands multiple layout tokens', () => {
    const re = Tempo.regexp('{yy}-{mm}-{dd}');
    expect(re.test('2024-05-20')).toBe(true);
    expect(re.test('20240520')).toBe(false);
  })

  test('accepts a custom snippet override', () => {
    const customSnippet = { [Tempo.getSymbol('yy')]: /(\d{2})/ } as any;
    const re = Tempo.regexp('{yy}', customSnippet);
    expect(re).toBeInstanceOf(RegExp);
  })

  test('accepts a RegExp as the layout input', () => {
    const re = Tempo.regexp(/\d{4}-\d{2}-\d{2}/);
    expect(re).toBeInstanceOf(RegExp);
  })

  test('deduplicates named capture groups (replaces with back-references)', () => {
    // a layout that references {sep} twice should not raise a duplicate capture error
    expect(() => Tempo.regexp('{yy}{sep}{mm}{sep}{dd}')).not.toThrow();
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.compare()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} compare`, () => {

  test('returns 0 for equal dates', () => {
    const t1 = new Tempo('2024-06-01');
    const t2 = new Tempo('2024-06-01');
    expect(Tempo.compare(t1, t2)).toEqual(0);								// toEqual treats -0 === 0
  })

  test('returns -1 when t1 < t2', () => {
    const t1 = new Tempo('2024-01-01');
    const t2 = new Tempo('2024-12-31');
    expect(Tempo.compare(t1, t2)).toBe(-1);
  })

  test('returns 1 when t1 > t2', () => {
    const t1 = new Tempo('2024-12-31');
    const t2 = new Tempo('2024-01-01');
    expect(Tempo.compare(t1, t2)).toBe(1);
  })

  test('can be used as a sort comparator', () => {
    const dates = ['2024-03-01', '2024-01-01', '2024-02-01'].map(d => new Tempo(d));
    const sorted = [...dates].sort(Tempo.compare);
    expect(sorted[0].yy).toBe(2024);
    expect(sorted[0].mm).toBe(1);
    expect(sorted[2].mm).toBe(3);
  })

  test('compares against now when t2 is omitted', () => {
    const past = new Tempo('2000-01-01');
    expect(Tempo.compare(past)).toBe(-1);
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.from()
// Note: @Immutable wraps Tempo in a subclass, so instanceof may not cross
// module-boundary correctly. Verify shape via constructor.name instead.
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} from`, () => {

  test('creates a Tempo-shaped instance from a date string', () => {
    const t = Tempo.from('2024-05-20');
    expect(t.constructor.name).toBe('Tempo');
    expect(t.yy).toBe(2024);
  })

  test('creates a Tempo-shaped instance with options only', () => {
    const t = Tempo.from({ timeZone: 'UTC' });
    expect(t.constructor.name).toBe('Tempo');
    expect(t.config.timeZone).toBe('UTC');
  })

  test('creates a Tempo-shaped instance from a date string with options', () => {
    const t = Tempo.from('2024-05-20', { timeZone: 'UTC' });
    expect(t.constructor.name).toBe('Tempo');
    expect(t.yy).toBe(2024);
    expect(t.config.timeZone).toBe('UTC');
  })

  test('creates a valid Tempo-shaped instance for undefined input', () => {
    const t = Tempo.from(undefined);
    expect(t.constructor.name).toBe('Tempo');
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// Tempo.now()
// ─────────────────────────────────────────────────────────────────────────────
describe(`${label} now`, () => {

  test('returns a BigInt', () => {
    expect(typeof Tempo.now()).toBe('bigint');
  })

  test('is close to Date.now() in magnitude', () => {
    const nowNs = Tempo.now();
    const nowMs = BigInt(Date.now()) * 1_000_000n;
    const diff = nowNs > nowMs ? nowNs - nowMs : nowMs - nowNs;
    expect(diff).toBeLessThan(1_000_000_000n);							// within 1 second
  })

  test('advances over time', async () => {
    const first = Tempo.now();
    await new Promise(r => setTimeout(r, 5));
    const second = Tempo.now();
    expect(second).toBeGreaterThan(first);
  })

})

describe(`${label} readStore / writeStore`, () => {

  test('readStore returns an object (empty when nothing stored)', () => {
    const result = Tempo.readStore(); // Uses testKey from config
    expect(typeof result).toBe('object');
  })

  test('writeStore and readStore round-trip an options object', () => {
    Tempo.writeStore({ pivot: 42 }); // Uses testKey from config
    const result = Tempo.readStore();
    expect(result?.pivot).toBe(42);
    Tempo.writeStore(void 0);        // clean up (uses testKey)
  })

})
