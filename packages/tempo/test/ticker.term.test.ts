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
		ticker.pulse() // Pulse 1: 2020-04-01T00:00:00
		ticker.pulse() // Pulse 2: 2020-07-01T00:00:00
		ticker.pulse() // Pulse 3: 2020-10-01T00:00:00

		expect(callback).toHaveBeenCalledTimes(4)
		expect(pulses).toEqual([
			'2020-04-01T00:00:00',
			'2020-07-01T00:00:00',
			'2020-10-01T00:00:00',
			'2021-01-01T00:00:00'
		])
	})

	it('should pulse every morning using #period term', () => {
		const seed = '2020-01-01T00:00:00'
		const pulses: string[] = []

		// morning is defined in term.timeline.ts as 08:00
		const ticker = Tempo.ticker({ '#period': 'morning' }, { seed })
		const callback = vi.fn((t: Tempo) => {
			pulses.push(t.toString().substring(0, 19))
		})

		ticker.on('pulse', callback)

		ticker.pulse() // Pulse 1: 2020-01-01T08:00:00 (first morning)
		ticker.pulse() // Pulse 2: 2020-01-02T08:00:00 (following morning)
		ticker.pulse() // Pulse 3: 2020-01-03T08:00:00 (next day morning)

		expect(callback).toHaveBeenCalledTimes(4)
		expect(pulses).toEqual([
			'2020-01-01T08:00:00',
			'2020-01-02T08:00:00',
			'2020-01-03T08:00:00',
			'2020-01-04T08:00:00'
		])
	})

	it('should refuse to launch with an invalid #term', () => {
		const seed = '2020-01-01'
		const payload = { '#invalid': 1 }

		// 1. should throw by default (catch: false)
		expect(() => Tempo.ticker(payload, { seed })).toThrow(/Invalid Ticker payload resolution/)

		// 2. should catch and inhibit start if (catch: true)
		const errorCallback = vi.fn()
		const ticker = Tempo.ticker(payload, { seed, catch: true })
		ticker.on('catch', errorCallback)

		// Pulse-manual should not work meaningfully as ticker was inhibited
		expect(ticker.pulse().isValid).toBe(false)
	})
})
