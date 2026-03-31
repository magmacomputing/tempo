import { makeTemplate } from '#library/string.library.js';

describe('String Library', () => {
	describe('makeTemplate', () => {
		it('should substitute simple placeholders', () => {
			const template = 'Hello ${name}!';
			const data = { name: 'World' };
			const result = makeTemplate(template)(data);
			expect(result).toBe('Hello World!');
		});

		it('should substitute multiple placeholders', () => {
			const template = '${greeting}, ${name}!';
			const data = { greeting: 'Hi', name: 'Alice' };
			const result = makeTemplate(template)(data);
			expect(result).toBe('Hi, Alice!');
		});

		it('should handle missing keys gracefully', () => {
			const template = 'Hello ${name}${unknown}!';
			const data = { name: 'World' };
			const result = makeTemplate(template)(data);
			expect(result).toBe('Hello World!');
		});

		it('should be safe from code execution', () => {
			const template = 'Hello ${console.log("hacked")}';
			const data = {};
			const result = makeTemplate(template)(data);
			// It should just return "Hello " (or "Hello undefined" depending on implementation)
			// Our implementation returns empty string for undefined.
			expect(result).toBe('Hello ');
		});

		it('should handle templateString as non-string (coerce to string)', () => {
			const template = 12345;
			const result = makeTemplate(template as any)({});
			expect(result).toBe('12345');
		});
	});
});
