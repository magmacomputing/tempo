import { test, expect } from 'vitest'
import { Tempo } from '#tempo/tempo.class.js'

test('debug formats prototype', () => {
	const t = new Tempo('2024-01-01');
	const formats = t.config.formats;                         // access via public getter
	
	// Actually, I can use the public getter if it's pointing to the same thing
	const publicFormats = Tempo.formats;
	console.log('Public Formats Type:', typeof publicFormats);
	console.log('Public Formats Prototype:', Object.getPrototypeOf(publicFormats));
	console.log('Public Formats has property:', 'has' in publicFormats);
	console.log('Public Formats has method:', typeof publicFormats.has);
	
	expect(typeof publicFormats.has).toBe('function');
})
