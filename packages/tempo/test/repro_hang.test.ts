import { getType } from '#library/type.library.js'
import { Tempo } from '#tempo/tempo.class.js'
import { isTempo } from '#tempo/tempo.symbol.js';

describe('Tempo Initialization Hang Repro', () => {
	it('should initialize without hanging when accessed via Proxy', () => {
		// This access triggers Proxy discovery and class initialization.
		// Before the fix, this would cause infinite recursion and hang.
		expect(getType(Tempo)).toBe('Class')
		expect(isTempo(new Tempo())).toBe(true)
		expect(Tempo.NUMBER.zero).toBe(0)
		expect(Tempo.FORMAT.date).toBeDefined()
	})

	it('should be ready after initialization', () => {
		// Accessing a property should ensure lifecycle is ready
		expect(Tempo.isExtending).toBe(false)
		expect(Tempo.isInitializing).toBe(false)
	})
})
