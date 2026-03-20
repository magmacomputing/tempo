import { Tempo } from '#core/shared/tempo.class.js';

describe('#setConfig refactor verification', () => {

	beforeEach(() => {
		Tempo[Symbol.dispose]();																// Reset global config to defaults
	})

	test('should handle snippet as a single RegExp', () => {
		using _ = Tempo;																			// ensure cleanup after test
		Tempo.init({ snippet: { 'test': /test-regex/ } });
		const parse = Tempo.parse;
		// Symbol.for('test') or whatever Token['test'] returns
		const sym = Tempo.getSymbol('test');
		expect(parse.snippet[sym]).toBeInstanceOf(RegExp);
		expect(parse.snippet[sym].source).toBe('test-regex')
	})

	test('should handle snippet as a string (converted to RegExp)', () => {
		using _ = Tempo;
		Tempo.init({ snippet: { 'testStr': 'test-string' } });
		const sym = Tempo.getSymbol('testStr');
		expect(Tempo.parse.snippet[sym]).toBeInstanceOf(RegExp);
		expect(Tempo.parse.snippet[sym].source).toBe('test-string')
	})

	test('should handle layout as a single string', () => {
		using _ = Tempo;
		Tempo.init({ layout: { 'myLayout': '{dd}{mm}{yy}' } });
		const sym = Tempo.getSymbol('myLayout');
		expect(Tempo.parse.layout[sym]).toBe('{dd}{mm}{yy}')
	})

  test('should handle layout as a RegExp (converted to source string)', () => {
    Tempo.init({ layout: { 'myRegExpLayout': /^\d{4}$/ } });
    const sym = Tempo.getSymbol('myRegExpLayout');
    expect(Tempo.parse.layout[sym]).toBe('^\\d{4}$')
  })

  test('should handle snippet as an array of objects/strings', () => {
    Tempo.init({
      snippet: [
        { 'snip1': 'val1' },
        'val2' // Unnamed
      ]
    });
    expect(Tempo.parse.snippet[Tempo.getSymbol('snip1')].source).toBe('val1');
    // Unnamed is added via #setConfig collect case 'String' -> getSymbol()
    const getValues = (obj: any) => Reflect.ownKeys(obj).map(k => obj[k]);
    const snippets = getValues(Tempo.parse.snippet).map(r => (r as RegExp).source);
    expect(snippets).toContain('val1');
    expect(snippets).toContain('val2')
  })

  test('should handle nested arrays in options', () => {
    Tempo.init({
      layout: [
        { 'lay1': 'v1' },
        [
          { 'lay2': 'v2' },
          'v3'
        ]
      ]
    });
    const getValues = (obj: any) => Reflect.ownKeys(obj).map(k => obj[k]);
    const layouts = getValues(Tempo.parse.layout);
    expect(layouts).toContain('v1');
    expect(layouts).toContain('v2');
    expect(layouts).toContain('v3')
  })

  test('should handle mixed objects and single values in snippets', () => {
    Tempo.init({
      snippet: [
        { 'key1': 'val1' },
        'single-val-regex'
      ]
    });
    const getValues = (obj: any) => Reflect.ownKeys(obj).map(k => obj[k]);
    const snippets = getValues(Tempo.parse.snippet).map(r => (r as RegExp).source);
    expect(snippets).toContain('val1');
    expect(snippets).toContain('single-val-regex')
  })

  test('should correctly set local config overrides', () => {
    const t = new Tempo({
      timeZone: 'UTC',
      snippet: { 'localSnip': 'locVal' }
    });
    expect(t.config.timeZone).toBe('UTC');
    const getValues = (obj: any) => Reflect.ownKeys(obj).map(k => obj[k]);
    const snippets = getValues(t.parse.snippet).map(r => (r as RegExp).source);
    expect(snippets).toContain('locVal')
  })

  test('should omit scope, anchor, and value from public config getter', () => {
    const t = new Tempo('now', { timeZone: 'America/New_York' });
    const config = t.config as any;
    expect(config.timeZone).toBe('America/New_York');
    expect(config.scope).toBeUndefined();
    expect(config.anchor).toBeUndefined();
    expect(config.value).toBeUndefined();
  })

})
