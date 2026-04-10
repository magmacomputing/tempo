import { Tempo } from '#tempo';
import type { Plugin } from '#tempo/tempo.type.js';

describe('Tempo Reactive Registration', () => {
	test('late-imported plugin is automatically registered', async () => {
		// Initially, the plugin-provided method should NOT exist if we haven't loaded it yet
		// (Assuming we haven't imported it in this test context yet)

		// Let's verify we are initialized
		expect(Tempo.config.scope).toBe('global')

		// Mock a late-registering plugin
		const $LateDiscovery = Symbol('LateDiscovery')
		const myLatePlugin: Plugin = (options, TempoClass) => {
			(TempoClass as any).lateMethod = () => 'it works!'
		}

		// Register it (simulating side-effect import)
		const { registerPlugin } = await import('#tempo/plugins/plugin.util.js')
		registerPlugin(myLatePlugin)

		// Now, WITHOUT manual Tempo.init(), it should still be there!
		expect((Tempo as any).lateMethod).toBeDefined()
		expect((Tempo as any).lateMethod()).toBe('it works!')

		// Cleanup
		delete (Tempo as any).lateMethod
	})
})
