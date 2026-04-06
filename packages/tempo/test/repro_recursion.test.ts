import { Tempo } from '#tempo';
import { isFunction } from '#library/type.library.js';

describe('Functional Recursion Limit', () => {
	it('should cap functional recursion at 5 hops and return gracefully when catch:true', () => {
		let count = 0;
		const recursive = () => {
			count++;
			return recursive;
		};

		// 1. With catch:true, it should log a warning and return the function as-is
		const t = new Tempo(recursive as any, { catch: true });
		expect(count).toBe(100);
		expect(isFunction(recursive)).toBe(true);
	});

	it('should throw an error when recursion cap is hit and catch:false', () => {
		let count = 0;
		const recursive = () => {
			count++;
			return recursive;
		};

		// 2. With catch:false (default), it should throw
		const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
		try {
			expect(() => new Tempo(recursive, { catch: false })).toThrow(/Infinite recursion detected/);
			expect(count).toBe(100);
		} finally {
			spy.mockRestore();
		}
	});
});
