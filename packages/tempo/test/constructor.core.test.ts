import { Tempo } from '#tempo/core';
import { FormatModule } from '#tempo/format';

Tempo.extend(FormatModule);

describe('Tempo Core', () => {
	beforeEach(() => {
		Tempo.init()
	})
	afterEach(() => vi.restoreAllMocks())

	describe('Constructor Modes', () => {

		describe("mode: 'auto' (Default)", () => {
			it('should auto-switch to lazy mode if input passes Master Guard', () => {
				const t = new Tempo('2024-01-01');
				expect(t.config.mode).toBe(Tempo.MODE.Auto);
				expect(t.config.lazy).toBe(true);
				expect(t.yy).toBe(2024);
				expect(t.yw).toBe(2024);
			});

			it('should fail-fast (strict) if input fails Master Guard', () => {
				vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.spyOn(console, 'warn').mockImplementation(() => {});
				// 'Hello World' fails the guard, so it attempts immediate parsing and throws
				expect(() => new Tempo('Hello World')).toThrow(/Cannot parse Date/);
			});
		});

		describe("mode: 'strict'", () => {
			it('should throw immediately on invalid TimeZone', () => {
				vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.spyOn(console, 'warn').mockImplementation(() => {});
				// Even with a valid-looking date, 'strict' forces immediate validation of all options
				expect(() => new Tempo('2024-01-01', { mode: Tempo.MODE.Strict, timeZone: 'Invalid/Zone' })).toThrow();
			});
		});

		describe("Global strategy overrides", () => {
			it("should throw on invalid input when global mode is 'strict'", () => {
				Tempo.init({ mode: Tempo.MODE.Strict });
				vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.spyOn(console, 'warn').mockImplementation(() => {});
				expect(() => new Tempo('Invalid Date')).toThrow();
			});
		});

		describe("mode: 'defer'", () => {
			it('should NOT throw immediately on invalid TimeZone', () => {
				// 'defer' ignores the guard and skips all validation in the constructor
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Defer, timeZone: 'Invalid/Zone' });
				expect(t).toBeInstanceOf(Tempo);
				expect(t.config.lazy).toBe(true);

				// Throws only on access
				vi.spyOn(console, 'error').mockImplementation(() => {});
				vi.spyOn(console, 'warn').mockImplementation(() => {});
				expect(() => t.yy).toThrow();
			});
		});

		describe("catch: true (Advanced Error Handling)", () => {
			it('should suppress immediate throws in strict mode', () => {
				vi.spyOn(console, 'warn').mockImplementation(() => {});
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Strict, timeZone: 'Invalid/Zone', catch: true });
				expect(t.isValid).toBe(false);
				expect(t.format('{yyyy}')).toBe('');
			});

			it('should suppress deferred throws in defer mode', () => {
				vi.spyOn(console, 'warn').mockImplementation(() => {});
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Defer, timeZone: 'Invalid/Zone', catch: true });
				expect(t.isValid).toBe(false);										// Validates on call
				expect(t.format('{yyyy}')).toBe('');
			});
		});
	});
});
