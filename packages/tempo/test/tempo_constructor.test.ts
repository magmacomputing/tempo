import { Tempo } from '../src/tempo.class.js';

describe('Tempo Core', () => {
	beforeEach(() => {
		Tempo.init()
	})

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
				const spyE = vi.spyOn(console, 'error').mockImplementation(() => {});
				const spyW = vi.spyOn(console, 'warn').mockImplementation(() => {});
				// 'Hello World' fails the guard, so it attempts immediate parsing and throws
				expect(() => new Tempo('Hello World')).toThrow(/Cannot parse Date/);
				spyE.mockRestore();
				spyW.mockRestore();
			});
		});

		describe("mode: 'strict'", () => {
			it('should throw immediately on invalid TimeZone', () => {
				const spyE = vi.spyOn(console, 'error').mockImplementation(() => {});
				const spyW = vi.spyOn(console, 'warn').mockImplementation(() => {});
				// Even with a valid-looking date, 'strict' forces immediate validation of all options
				expect(() => new Tempo('2024-01-01', { mode: Tempo.MODE.Strict, timeZone: 'Invalid/Zone' })).toThrow();
				spyE.mockRestore();
				spyW.mockRestore();
			});
		});

		describe("Global strategy overrides", () => {
			it("should throw on invalid input when global mode is 'strict'", () => {
				Tempo.init({ mode: Tempo.MODE.Strict });
				const spyE = vi.spyOn(console, 'error').mockImplementation(() => {});
				const spyW = vi.spyOn(console, 'warn').mockImplementation(() => {});
				try {
					expect(() => new Tempo('Invalid Date')).toThrow();
				} finally {
					spyE.mockRestore();
					spyW.mockRestore();
					Tempo.init();																		// Reset to defaults
				}
			});
		});

		describe("mode: 'defer'", () => {
			it('should NOT throw immediately on invalid TimeZone', () => {
				// 'defer' ignores the guard and skips all validation in the constructor
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Defer, timeZone: 'Invalid/Zone' });
				expect(t).toBeInstanceOf(Tempo);
				expect(t.config.lazy).toBe(true);

				// Throws only on access
				const spyE = vi.spyOn(console, 'error').mockImplementation(() => {});
				const spyW = vi.spyOn(console, 'warn').mockImplementation(() => {});
				expect(() => t.yy).toThrow();
				spyE.mockRestore();
				spyW.mockRestore();
			});
		});

		describe("catch: true (Advanced Error Handling)", () => {
			it('should suppress immediate throws in strict mode', () => {
				const spyW = vi.spyOn(console, 'warn').mockImplementation(() => {});
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Strict, timeZone: 'Invalid/Zone', catch: true });
				expect(t.isValid()).toBe(false);
				expect(t.format('{yyyy}')).toBe('');
				spyW.mockRestore();
			});

			it('should suppress deferred throws in defer mode', () => {
				const spyW = vi.spyOn(console, 'warn').mockImplementation(() => {});
				const t = new Tempo('2024-01-01', { mode: Tempo.MODE.Defer, timeZone: 'Invalid/Zone', catch: true });
				expect(t.isValid()).toBe(false);										// Validates on call
				expect(t.format('{yyyy}')).toBe('');
				spyW.mockRestore();
			});
		});
	});
});
