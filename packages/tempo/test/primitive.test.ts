import { stringify, objectify } from '#library/serialize.library.js';
import { Tempo } from '#tempo/tempo.class.js';

describe('Tempo [Symbol.toPrimitive]', () => {
	const iso = '2024-05-20T10:00:00Z';
	const t = new Tempo(iso);

	it('should return ISO string for string hint', () => {
		expect(String(t)).toBe(t.toString());
		expect(`${t}`).toBe(t.toString());
	})

	it('should return epoch milliseconds for number hint', () => {
		expect(Number(t)).toBe(t.epoch.ms);
		expect(+t).toBe(t.epoch.ms);
	})

	it('should return BigInt nanoseconds for default hint', () => {
		// Arithmetic with BigInt or no hint defaults to 'default' which gives BigInt nano
		expect((t as any) + BigInt(0)).toBe(t.nano);						// triggers 'default' hint
		expect((t as any) == t.nano).toBe(true);								// triggers 'default' hint
	})

	it('should round-trip through stringify and objectify', async () => {
		const json = stringify(t);
		const revived = objectify<Tempo>(json);

		expect(revived instanceof Tempo).toBe(true);
		expect(revived.toString()).toBe(t.toString());
		expect(revived.config.timeZone).toBe(t.config.timeZone);
	})
})
