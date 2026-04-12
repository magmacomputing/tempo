import { Tempo } from '#tempo'

describe('Tempo Term Literacy (Namespace Shorthand)', () => {

	describe('.set() shorthand', () => {
		test('set("#period.morning") sets to the start of morning', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })
			const res = t.set('#period.morning')
			expect(res.hh).toBe(8)
			expect(res.mi).toBe(0)
		})

		test('set("#zodiac.aries") sets to the start of the current Aries (prev year)', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })
			const res = t.set('#zodiac.aries')
			expect(res.yy).toBe(2025)
			expect(res.mm).toBe(3)
			expect(res.dd).toBe(21)
		})

		test('set("#qtr.q3") sets to the start of the current Q3 (prev year)', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })
			const res = t.set('#qtr.q3')
			expect(res.yy).toBe(2025)
			expect(res.mm).toBe(7)
			expect(res.dd).toBe(1)
		})

		test('set({ start: "#period.night" }) sets explicitly to start of current night', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })
			const res = t.set({ start: '#period.night' })
			// Jan 1 12:00. The current night started at Jan 1 20:00 (since it hasn't happened yet today, it looks back)
			// Wait, the logic for 'current range' should find the range that contains the current time, or the last one if we are between.
			// At 12:00, the last night start was Dec 31 20:00.
			expect(res.hh).toBe(20)
			expect(res.dd).toBe(31)
		})
	})

	describe('.add() shorthand', () => {
		test('add("#qtr.q1") moves to the next Q1', () => {
			const t = new Tempo('2026-06-01', { sphere: 'north' })	// Midway through Q2
			const res = t.add('#qtr.q1')						// Should find 2027-01-01
			expect(res.yy).toBe(2027)
			expect(res.mm).toBe(1)
			expect(res.dd).toBe(1)
		})

		test('add({ "#period.morning": 2 }) moves two mornings ahead', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })	// Current morning is Jan 1 08:00
			const res = t.add({ '#period.morning': 2 })
			// Morning 1: Jan 2 08:00
			// Morning 2: Jan 3 08:00
			expect(res.dd).toBe(3)
			expect(res.hh).toBe(8)
		})

		test('add({ "#zodiac.aries": -1 }) moves one cycle back from current Aries', () => {
			const t = new Tempo('2026-06-01', { sphere: 'north' })
			// Current Aries is 2026-03-21
			const res = t.add({ '#zodiac.aries': -1 })
			expect(res.yy).toBe(2025)
			expect(res.mm).toBe(3)
			expect(res.dd).toBe(21)
		})
	})

	describe('Error handling', () => {
		test('invalid term shorthand trips #errored (with catch:true)', () => {
			const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
			const t = new Tempo('2026-01-01', { catch: true }).set('#invalid.term')
			expect(t.isValid).toBe(false)
			spy.mockRestore()
		})

		test('invalid range in known term trips #errored (with catch:true)', () => {
			const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
			const t = new Tempo('2026-01-01', { catch: true }).set('#qtr.q99')
			expect(t.isValid).toBe(false)
			spy.mockRestore()
		})
	})

})
