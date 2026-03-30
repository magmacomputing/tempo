import { Tempo } from '../src/tempo.class.js';

describe('Master Guard Extension', () => {
  it('should rebuild the guard after extension via Discovery', () => {
    // 1. Initially, 'apple' should FAIL the guard and throw immediately (since lazy: false by default)
    expect(() => new Tempo('apple')).toThrow(/Cannot parse Date: "apple"/);

    // 2. Extend with a custom term 'apple' via Discovery object
    Tempo.extend({
      terms: [{
        key: 'apple',
        define() { return this.mm === 10 }
      }]
    });

    // 3. Now 'apple' should PASS the guard and auto-switch to lazy: true.
    const t = new Tempo('apple');
    expect(t).toBeInstanceOf(Tempo);
    expect(t.config.lazy).toBe(true);

    // 4. Accessing a property should now trigger parsing and throw (since 'apple' is still un-parseable by the engine)
    expect(() => t.yy).toThrow(/Cannot parse Date: "apple"/);
  });

  it('should rebuild the guard after direct extension', () => {
    // 1. 'banana' fails initially
    expect(() => new Tempo('banana')).toThrow(/Cannot parse Date: "banana"/);

    // 2. Extend directly
    Tempo.extend({
      key: 'banana',
      define() { return this.mm === 11 }
    });

    // 3. 'banana' now passes guard
    const t = new Tempo('banana');
    expect(t.config.lazy).toBe(true);
  });
});
