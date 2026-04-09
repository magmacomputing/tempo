import { Tempo } from '#tempo/tempo.class.js'

describe('Tempo Infinite Loop Protection', () => {
  beforeEach(() => {
    Tempo.init()
  })

  test('cyclic alias resolution (A -> B -> A) is broken by resolvingKeys', () => {
    const event = {
      loopA: 'loopB',
      loopB: 'loopA'
    }
    const t = new Tempo('loopA', { event, catch: true })
    expect(t.toString()).toBe('loopA')
  })

  test('deep alias chain is broken by MAX_DEPTH', () => {
    const event: Record<string, string> = {}
    for (let i = 0; i < 60; i++) {
      event[`step${i}`] = `step${i + 1}`
    }

    const t = new Tempo('step0', { event, catch: true })
    expect(t.toString()).toBe('step0')
  })
})
