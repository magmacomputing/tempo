import { describe, it, expect } from 'vitest';
import { Tempo } from '../src/tempo.class.js';

describe('Master Guard Extension', () => {
  it('should rebuild the guard after extension', () => {
    // 1. Initially, 'apple' should FAIL the guard and throw immediately (since lazy: false by default)
    expect(() => new Tempo('apple')).toThrow(/Cannot parse Date: "apple"/);

    // 2. Extend with a custom term 'apple'
    Tempo.extend({
      terms: [{
        key: 'apple',
        define: (t) => t.month === 10
      }]
    });

    // 3. Now 'apple' should PASS the guard.
    // Since it passes the guard, the constructor auto-switches to lazy: true.
    // So it should NOT throw during instantiation!
    const t = new Tempo('apple');
    expect(t).toBeInstanceOf(Tempo);
    expect(t.config.lazy).toBe(true);
    
    // 4. Accessing a property should now trigger parsing and throw (since 'apple' is still un-parseable by the engine)
    expect(() => t.yy).toThrow(/Cannot parse Date: "apple"/);
  });
});
