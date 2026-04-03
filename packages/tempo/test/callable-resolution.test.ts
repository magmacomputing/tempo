import { Tempo } from '../src/tempo.class.js';

describe('Tempo Callable Resolution', () => {
	test('should resolve a function-valued input returning a date string', () => {
		const t = new Tempo(() => '2024-01-01');
		expect(t.fmt.date).toBe('2024-01-01');
	});

	test('should resolve a function-valued input returning a Tempo instance', () => {
		const t1 = new Tempo('2024-01-01');
		const t2 = new Tempo(() => t1);
		expect(t2.fmt.date).toBe('2024-01-01');
	});

	test('should preserve Tempo instance context (this) in callable input', () => {
		const t = new Tempo(function (this: any) {
			return '2024-01-01';
		});
		expect(t.fmt.date).toBe('2024-01-01');
	});

	test('should prevent infinite recursion for self-returning functions', () => {
		const self: any = function (this: any) { return self };
		expect(() => new Tempo(self, { silent: true })).toThrow();	// Throws diagnostic error in default catch:false mode
	});
});
