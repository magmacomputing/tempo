import { Tempo } from '../lib/tempo.class.js';
import { Token } from '../lib/tempo.config/tempo.defaults.js';

describe('Tempo.regexp', () => {
  test('should expand snippets and handle nested named capture groups', () => {
    // Use existing tokens or check if we can add new ones
    const innerSym = Symbol('inner_test');
    const outerSym = Symbol('outer_test');

    // If Token is read-only, this might still fail, 
    // but Tempo.getSymbol should be used if possible.
    try {
      Token['inner_test'] = innerSym;
      Token['outer_test'] = outerSym;
    } catch (e) {
      // Fallback to Tempo.getSymbol if Token is frozen
      Tempo.getSymbol(innerSym);
      Tempo.getSymbol(outerSym);
    }

    const snippet = {
      [innerSym]: /(?<inner_test>bar)/,
      [outerSym]: /(?<outer_test>foo{inner_test}baz)/,
    } as any;

    const reg = Tempo.regexp('{outer_test}', snippet);

    expect(reg.source).toBe('^((?<outer_test>foo(?<inner_test>bar)baz))$');
    expect(reg.flags).toContain('i');
  });

  test('should handle multiple named capture groups in one snippet', () => {
    const multiSym = Symbol('multi_test');
    try { Token['multi_test'] = multiSym; } catch (e) { Tempo.getSymbol(multiSym); }

    const snippet = {
      [multiSym]: /(?<A>a)(?<B>b)/,
    } as any;

    const reg = Tempo.regexp('{multi_test}', snippet);
    expect(reg.source).toBe('^((?<A>a)(?<B>b))$');
  });

  test('should handle complex nested groups with alternatives', () => {
    const tzdSym = Symbol('tzd_test');
    try { Token['tzd_test'] = tzdSym; } catch (e) { Tempo.getSymbol(tzdSym); }

    const snippet = {
      [tzdSym]: /(?<tzd_test>Z|(?<offset>(?:\+(?:(?:0\d|1[0-3]):?[0-5]\d|14:00)|-(?:(?:0\d|1[0-1]):?[0-5]\d|12:00))))/,
    } as any;

    const reg = Tempo.regexp('{tzd_test}', snippet);
    // Note: escaped \d in string literal for proper comparison
    expect(reg.source).toBe('^((?<tzd_test>Z|(?<offset>(?:\\+(?:(?:0\\d|1[0-3]):?[0-5]\\d|14:00)|-(?:(?:0\\d|1[0-1]):?[0-5]\\d|12:00)))))$');
  });

  test('should NOT use backreferences for non-capturing groups like {sep}', () => {
    const layout = '{sep}{sep}';
    const snippet = {
      [Token.sep]: /(?:[\/\-\.\s,])/,
    } as any;

    const reg = Tempo.regexp(layout, snippet);
    expect(reg.source).toBe('^((?:[\\/\\-\\.\\s,])(?:[\\/\\-\\.\\s,]))$');
  });
});
