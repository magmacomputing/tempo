import { Tempo } from '#tempo/index.js'

describe('Tempo Static Options', () => {
    // Unique symbol for test discovery
    const $TestTempo = Symbol('TestStaticOptionsDiscovery')

    beforeEach(() => {
        delete (globalThis as any)[$TestTempo]
        Tempo.init()
    })

    test('static options are reactive to discovery changes', () => {
        expect(Tempo.options.timeZone).toBeDefined()

        const myDiscovery = {
            options: { timeZone: 'Pacific/Auckland' }
        }

        // Register discovery
        Tempo.extend(myDiscovery, $TestTempo)

        expect(Tempo.options.timeZone).toBe('Pacific/Auckland')
    })
})
