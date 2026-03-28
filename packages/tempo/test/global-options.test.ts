import { Tempo } from '#tempo'

// Use a private test symbol to avoid trashing globalThis[$Tempo]
const $TestTempo = Symbol('TestGlobalOptionsDiscovery')

describe('Global Configuration Discovery', () => {
	beforeEach(() => {
		// Clear our test discovery mechanism
		delete (globalThis as any)[$TestTempo]
		Tempo.init()
	})

	afterEach(() => {
		delete (globalThis as any)[$TestTempo]
		Tempo.init()
	})

	afterAll(() => {
		delete (globalThis as any)[$TestTempo]
		Tempo.init()
	})

	test('Tempo automatically discovers and applies via Symbol.for($Tempo) (Discovery Contract)', () => {
		(globalThis as any)[$TestTempo] = {
			options: { timeZone: 'Europe/Paris', customGlobalVal: true }
		}

		// Re-initialize so it picks up our test global
		Tempo.init({ discovery: $TestTempo })

		expect(Tempo.config.timeZone).toBe('Europe/Paris')
		expect(Tempo.config.customGlobalVal).toBe(true)
	})

	test('Tempo supports functional options in Discovery Contract', () => {
		(globalThis as any)[$TestTempo] = {
			options: () => ({ timeZone: 'Asia/Tokyo', customGlobalFn: true })
		}

		// Re-initialize so it picks up our test global
		Tempo.init({ discovery: $TestTempo })

		expect(Tempo.config.timeZone).toBe('Asia/Tokyo')
		expect(Tempo.config.customGlobalFn).toBe(true)
	})

	test('Explicit init options override Global Discovery', () => {
		(globalThis as any)[$TestTempo] = {
			options: { timeZone: 'Europe/Paris' }
		}

		Tempo.init({ discovery: $TestTempo }) // Picks up test global
		Tempo.init({ timeZone: 'America/New_York' }) // Explicit override

		expect(Tempo.config.timeZone).toBe('America/New_York')
	})

	test('Tempo discovers global options for events and periods', () => {
		(globalThis as any)[$TestTempo] = {
			options: {
				event: { 'global launch': '2026-10-01' },
				period: { 'global teatime': '15:30' }
			}
		}

		Tempo.init({ discovery: $TestTempo })

		const tEvent = new Tempo('global launch')
		expect(tEvent.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-01')

		const tPeriod = new Tempo('global teatime')
		expect(tPeriod.format('{hh}:{mi}')).toBe('15:30')
	})
})
