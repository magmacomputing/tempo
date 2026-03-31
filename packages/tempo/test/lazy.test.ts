import { Tempo } from '../src/tempo.class.js';

describe('Tempo Lazy Evaluation (Shadowing)', () => {
	beforeEach(() => {
		Tempo.init();
	});

	describe('Static Registries', () => {
		it('should expose available formats via Tempo.formats', () => {
			const formats = Tempo.formats;
			// Since formats is a Proxy/Enum, we use .keys() or .has()
			expect(formats.keys?.()).toContain('date');
			expect(formats.keys?.()).toContain('time');
		});

		it('should expose available terms via Tempo.terms', () => {
			const terms = Tempo.terms;
			// If terms are empty in test, we might need a manual registration or just check that it's an array
			expect(Array.isArray(terms)).toBe(true);
		});
	});

	describe('Instance Lazy-Loading', () => {
		it('should start with an empty #fmt shadow-object', () => {
			const t = new Tempo('2024-05-20');
			// @ts-ignore - accessing private-ish getter fmt
			expect(Object.keys(t.fmt)).toHaveLength(0);
		});

		it('should evaluate a format on first access and make it an own property', () => {
			const t = new Tempo('2024-05-20');
			// @ts-ignore
			expect(t.fmt.date).toBe('2024-05-20');
			// @ts-ignore
			expect(Object.keys(t.fmt)).toContain('date');
		});

		it('should maintain a shadowing chain when multiple properties are accessed', () => {
			const t = new Tempo('2024-05-20');
			// @ts-ignore
			const d1 = t.fmt.date;
			// @ts-ignore
			const d2 = t.fmt.time;

			// @ts-ignore
			expect(Object.keys(t.fmt)).toContain('date');
			// @ts-ignore
			expect(Object.keys(t.fmt)).toContain('time');
		});
	});

	describe('Iteration & Serialization', () => {
		it('should flatten the shadowing chain for Symbol.iterator', () => {
			const t = new Tempo('2024-05-20');
			// @ts-ignore
			void t.fmt.date;
			// @ts-ignore
			void t.fmt.time;

			const entries = [...t];
			const keys = entries.map(([k]) => k);
			expect(keys).toContain('date');
			expect(keys).toContain('time');
		});

		it('should correctly serialize to a flat configuration object for round-tripping', () => {
			const t = new Tempo('2024-05-20');
			const json = t.toJSON();
			expect(json).toHaveProperty('value', '2024-05-20T00:00:00');
			expect(json).not.toHaveProperty('fmt');							// fmt should NOT be in toJSON
		});
	});
});
