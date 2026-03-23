import { omit, purge } from '#library/reflection.library.js';

describe('Reflection Library', () => {
	describe('omit/purge on Array', () => {
		it('should clear an array using purge', () => {
			const arr = [1, 2, 3];
			purge(arr);
			expect(arr.length).toBe(0);
			expect(arr).toEqual([]);
		});

		it('should clear an array using omit with no keys', () => {
			const arr = ['a', 'b', 'c'];
			omit(arr);
			expect(arr.length).toBe(0);
			expect(arr).toEqual([]);
		});

		it('should omit specific keys from an array', () => {
			const arr = ['a', 'b', 'c'];
			omit(arr, 1); // remove index 1
			expect(arr).toEqual(['a', 'c']);
		});
	});
});
