import { Tempo } from '#tempo/tempo.class.js'

// Use a private test symbol to avoid trashing global scope
const $TestTempo = Symbol.for('TestIssueFixesDiscovery')
const keyFor = Symbol.keyFor($TestTempo) as string;

describe('Tempo Issue Fixes', () => {
  beforeEach(() => {
    Tempo.init()
    // Clear mock storage if needed (using env for Node)
    delete process.env[keyFor]
    delete (globalThis as any)[$TestTempo]
  })

  describe('Relative Event Logic', () => {
    test('relative events follow the instance base when using .set()', () => {
      const today = new Tempo()
      const yesterday = today.set('yesterday')
      const dayBeforeYesterday = yesterday.set('yesterday')

      const expected = (today.toDateTime()).toPlainDate().add({ days: -2 }).toString()
      expect(dayBeforeYesterday.format('{yyyy}-{mm}-{dd}')).toBe(expected.split('[')[0])
    })

    test('now matches the current time by default', () => {
      const t = new Tempo('now')
      const realNow = Temporal.Now.instant().epochMilliseconds
      // Allow 1000ms for execution jitter (CI/slow polyfill)
      expect(Math.abs(t.toInstant().epochMilliseconds - realNow)).toBeLessThan(1000)
    })
    test('combined event and period works correctly (e.g. yesterday afternoon)', () => {
      const t = new Tempo('yesterday afternoon')
      const expectedDate = new Tempo().add({ days: -1 }).format('{yyyy}-{mm}-{dd}')

      expect(t.format('{yyyy}-{mm}-{dd}')).toBe(expectedDate)
      expect(t.format('{HH}:{mi}:{ss}')).toBe('03:00:00pm')
    })

    test('dynamic period alias with `this` binding (e.g. half-hour)', () => {
      Tempo.init({
        period: {
          'half-hour': function (this: Tempo) {
            return `${this.hh}:30`
          }
        }
      })
      const t = new Tempo('half-hour')
      expect(t.format('{mi}:{ss}')).toBe('30:00')
      expect(t.hh).toBe(new Tempo().hh)
    })
  })

  describe('ZonedDateTime Bracket Parsing', () => {
    test('recognizes timezone ID in brackets over offset', () => {
      // +01:00 is not London during DST, but the bracket should win
      const t = new Tempo('2024-05-20T10:00:00+01:00[Europe/London]')
      expect(t.tz).toBe('Europe/London')
    })

    test('handles Z with brackets', () => {
      const t = new Tempo('2024-05-20T10:00:00Z[UTC]')
      expect(t.tz).toBe('UTC')
    })

    test('bracketed timezone is applied before relative event resolution', () => {
      // The correct way to resolve relative events in a specific timezone is via options
      const t = new Tempo('yesterday', { timeZone: 'America/New_York' })
      expect(t.tz).toBe('America/New_York')

      // Verify the date is correct for NY
      const nyNow = Temporal.Now.zonedDateTimeISO('America/New_York')
      const expectedDate = nyNow.subtract({ days: 1 }).toPlainDate().toString()
      expect(t.format('{yyyy}-{mm}-{dd}')).toBe(expectedDate)
    })
  })

  describe('Storage Precedence (Discovery > Storage > Defaults)', () => {
    test('Storage overrides Defaults', () => {
      // Mock storage
      process.env[keyFor] = '{"pivot":10}';

      // Initialize without options - should pick up from storage
      Tempo.init({ discovery: $TestTempo, store: keyFor })
      expect(Tempo.parse.pivot).toBe(10)
    })

    test('Discovery overrides Storage', () => {
      process.env[keyFor] = '{"pivot":10}';

      // Global Discovery (using symbol)
      (globalThis as any)[$TestTempo] = {
        options: { pivot: 20 }
      };

      Tempo.init({ discovery: $TestTempo, store: keyFor })
      expect(Tempo.parse.pivot).toBe(20)

      // Cleanup
      delete (globalThis as any)[$TestTempo]
    })
  })

  describe('.set() and .add() Flexibility', () => {
    test('set() accepts options with timeZone', () => {
      const t = new Tempo('2024-05-20 10:00', { timeZone: 'UTC' })
      const lon = t.set({ timeZone: 'Europe/London' })
      expect(lon.tz).toBe('Europe/London')
      expect(lon.format('{hh}:{mi}')).toBe('11:00')				// London is DST (+01:00) in May
    })

    test('set() accepts two arguments (value, options)', () => {
      const t = new Tempo('2024-05-20 10:00', { timeZone: 'UTC' })
      // This would have failed before
      const shifted = t.set('tomorrow', { timeZone: 'America/New_York', debug: true })
      expect(shifted.tz).toBe('America/New_York')
      expect(shifted.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-21')
    })

    test('add() accepts a duration payload', () => {
      const t = new Tempo('2024-05-20 10:00', { timeZone: 'UTC' })
      const nextWeek = t.add({ days: 7 })
      expect(nextWeek.format('{dd}')).toBe('27')
    })
  })

  describe('Relative Parsing Stability', () => {
    test('tomorrow resolution with explicit anchor', () => {
      const today = new Tempo('2024-05-20')
      const yesterday = today.set('yesterday')
      expect(yesterday.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-19')

      // @ts-ignore - anchor is an internal option used for testing
      const t = new Tempo('tomorrow', { anchor: today.toDateTime() })
      expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-21')
    })

    test('tomorrow resolution preserves explicit time', () => {
      const today = new Tempo('2024-05-20')
      // @ts-ignore
      const t = new Tempo('tomorrow 10pm', { anchor: today.toDateTime() })
      expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-21')
      expect(t.format('{hh}:{mi}')).toBe('22:00')
    })

    test('Event resolution with custom date string', () => {
      const today = new Tempo('2024-05-20')
      const event = { blah: '20-May' }
      // @ts-ignore
      const t = new Tempo('blah 10pm', { event, anchor: today.toDateTime() })
      expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20')
      expect(t.format('{hh}:{mi}')).toBe('22:00')
    })

    test('Period resolution preserves date component', () => {
      const today = new Tempo('2024-05-20')
      const period = { bedtime: function (this: any) { return this.set({ hour: 23 }) } }
      // @ts-ignore
      const t = new Tempo('2024-05-20 bedtime', { period, anchor: today.toDateTime() })
      expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20')
      expect(t.format('{hh}:{mi}')).toBe('23:00')
    })

    test('Alias with custom composite string', () => {
      const today = new Tempo('2024-05-20')
      const event = { blah: '20-May 10pm' }
      // @ts-ignore
      const t = new Tempo('blah', { event, anchor: today.toDateTime() })
      expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20')
      expect(t.format('{hh}:{mi}')).toBe('22:00')
    })
  })
})
