import { Tempo } from '#tempo/tempo.class.js'
import '#tempo/plugins/extend/plugin.ticker.js'

describe('Ticker with Terms', () => {

	it('should pulse once-per-quarter using #quarter term', () => {
		const seed = '2020-01-01T00:00:00'
		const pulses: string[] = []

		const ticker = Tempo.ticker({ '#quarter': 1 }, { seed })
		const callback = vi.fn((t: Tempo) => {
			pulses.push(t.toString().substring(0, 19))
		})

		ticker.on('pulse', callback)

		// Manual pulses to simulate time passing
		ticker.pulse() // Pulse 1: 2020-01-01T00:00:00
		ticker.pulse() // Pulse 2: 2020-04-01T00:00:00
		ticker.pulse() // Pulse 3: 2020-07-01T00:00:00

		expect(callback).toHaveBeenCalledTimes(3)
		expect(pulses).toEqual([
			'2020-01-01T00:00:00',
			'2020-04-01T00:00:00',
			'2020-07-01T00:00:00'
		])
	})

	it('should pulse every morning using #period term', () => {
		const seed = '2020-01-01T00:00:00'
		const pulses: string[] = []

		// morning is defined in TermPeriod as 08:00 - 12:00
		const ticker = Tempo.ticker({ '#period': 'morning' }, { seed })
		const callback = vi.fn((t: Tempo) => {
			pulses.push(t.toString().substring(0, 19))
		})

		ticker.on('pulse', callback)

		ticker.pulse() // Pulse 1: 2020-01-01T00:00:00 (seed)
		ticker.pulse() // Pulse 2: 2020-01-01T08:00:00 (next morning)
		ticker.pulse() // Pulse 3: 2020-01-02T08:00:00 (following morning)

		expect(callback).toHaveBeenCalledTimes(3)
		expect(pulses).toEqual([
			'2020-01-01T00:00:00',
			'2020-01-01T08:00:00',
			'2020-01-02T08:00:00'
		])
	})
})
