import { Tempo } from '#core/tempo.class.js';
import { Token } from '#core/tempo.config/tempo.default.js';

describe('Tempo.regexp', () => {
  test('should expand snippets and handle nested named capture groups', () => {
    // Use existing tokens or check if we can add new ones
    const innerSym = Tempo.getSymbol('inner_test');
    const outerSym = Tempo.getSymbol('outer_test');

    const snippet = {
      [innerSym]: /(?<inner_test>bar)/,
      [outerSym]: /(?<outer_test>foo{inner_test}baz)/,
    } as any;

    const reg = Tempo.regexp('{outer_test}', snippet);
    expect(reg.source).toBe('^((?<outer_test>foo(?<inner_test>bar)baz))$');
    expect(reg.flags).toContain('i');
  });

  test('should handle multiple named capture groups in one snippet', () => {
    const multiSym = Tempo.getSymbol('multi_test');

    const snippet = {
      [multiSym]: /(?<A>a)(?<B>b)/,
    } as any;

    const reg = Tempo.regexp('{multi_test}', snippet);
    expect(reg.source).toBe('^((?<A>a)(?<B>b))$');
  });

  test('should handle complex nested groups with alternatives', () => {
    const tzdSym = Tempo.getSymbol('tzd_test');

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
