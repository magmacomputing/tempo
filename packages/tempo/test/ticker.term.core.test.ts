import { Tempo } from '#tempo/core'
import '#tempo/term/standard'
import '#tempo/ticker'

describe('Ticker with Terms', () => {

	test.each([
		{
			name: 'once-per-quarter using #quarter term',
			interval: { '#quarter': 1 },
			seed: '2020-01-01T00:00:00',
			expected: [
				'2020-04-01T00:00:00',
				'2020-07-01T00:00:00',
				'2020-10-01T00:00:00',
				'2021-01-01T00:00:00'
			]
		},
		{
			name: 'every morning using #period term',
			interval: { '#period': 'morning' },
			seed: '2020-01-01T00:00:00',
			expected: [
				'2020-01-01T08:00:00',
				'2020-01-02T08:00:00',
				'2020-01-03T08:00:00',
				'2020-01-04T08:00:00'
			]
		}
	])('should pulse $name', ({ interval, seed, expected }) => {
		const pulses: string[] = []
		const ticker = Tempo.ticker(interval, { seed })
		const callback = vi.fn((t: Tempo) => {
			pulses.push(t.toString().substring(0, 19))
		})

		ticker.on('pulse', callback)

		// Manual pulses to simulate time passing (after the initial bootstrap pulse)
		ticker.pulse()
		ticker.pulse()
		ticker.pulse()

		expect(callback).toHaveBeenCalledTimes(4)
		expect(pulses).toEqual(expected)
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
