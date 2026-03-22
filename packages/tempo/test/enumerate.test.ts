import { enumify } from '#core/shared/enumerate.library.js';

describe('enumify stealth proxy', () => {
  it('should expose all keys from the prototype chain in Object.keys()', () => {
    const BASE = enumify({ A: 1, B: 2 });
    const EXTENDED = BASE.extend({ C: 3 });

    expect(EXTENDED.keys()).toEqual(['A', 'B', 'C']);
  });

  it('should correctly handle JSON.stringify() for extended enums', () => {
    const BASE = enumify({ A: 1, B: 2 });
    const EXTENDED = BASE.extend({ C: 3 });

    const json = JSON.parse(JSON.stringify(EXTENDED));
    expect(json).toEqual({ A: 1, B: 2, C: 3 });
  });

  it('should still support enum methods on extended enums', () => {
    const BASE = enumify({ A: 1, B: 2 });
    const EXTENDED = BASE.extend({ C: 3 });

    expect(EXTENDED.count()).toBe(3);
    expect(EXTENDED.keys()).toEqual(['A', 'B', 'C']);
    expect(EXTENDED.values()).toEqual([1, 2, 3]);
    expect(EXTENDED.has('A')).toBe(true);
    expect(EXTENDED.has('C')).toBe(true);
  });

  it('should handle multiple levels of extension', () => {
    const BASE = enumify({ A: 1 });
    const MID = BASE.extend({ B: 2 });
    const TOP = MID.extend({ C: 3 });

    expect(TOP.keys()).toEqual(['A', 'B', 'C']);
    expect(TOP.count()).toBe(3);
    expect(JSON.parse(JSON.stringify(TOP))).toEqual({ A: 1, B: 2, C: 3 });
  });

  it('should allow shadowing of inherited keys', () => {
    const BASE = enumify({ A: 1, B: 2 });
    const EXTENDED = BASE.extend({ B: 20, C: 3 });

    expect(EXTENDED.keys()).toEqual(['A', 'B', 'C']);
    expect(EXTENDED.B).toBe(20);
    expect(EXTENDED.values()).toEqual([1, 20, 3]);
  });

  it('should support Symbol keys in enums', () => {
    const sym = Symbol('test');
    const MyEnum = enumify({
      [sym]: 'symbol-value',
      standard: 'string-value'
    });

    expect(MyEnum.keys()).toContain(sym);
    expect(MyEnum.has(sym)).toBe(true);
    expect((MyEnum as any)[sym]).toBe('symbol-value');
    expect(MyEnum.entries().find(([key]) => key === sym)).toBeDefined();
  });
});
