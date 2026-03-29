import { Tempo, isTempo } from '../src/tempo.class.js'

describe('Tempo Initialization Hang Repro', () => {
	it('should initialize without hanging when accessed via Proxy', () => {
		// This access triggers Proxy discovery and class initialization.
		// Before the fix, this would cause infinite recursion and hang.
		expect(isTempo(Tempo)).toBe(true)
		expect(Tempo.NUMBER.zero).toBe(0)
		expect(Tempo.FORMAT.iso).toBeDefined()
	})

	it('should be ready after initialization', () => {
		// Accessing a property should ensure lifecycle is ready
		expect(Tempo.isExtending).toBe(false)
		expect(Tempo.isInitializing).toBe(false)
	})
})
