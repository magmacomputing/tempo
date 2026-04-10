import { $Target } from '#library/symbol.library.js';
import { Tempo } from '#tempo';
import { registryUpdate } from '#tempo/tempo.enum.js';

describe('Discovery Security (Direct Registry Check)', () => {

	test('registryUpdate protects core NUMBER keys from overwrite', () => {
		// Attempt to overwrite 'one' via direct registryUpdate (which discovery uses)
		registryUpdate('NUMBER', { one: 99, eleven: 11 });

		expect(Tempo.NUMBER.one).toBe(1);
		expect(Tempo.NUMBER.one).not.toBe(99);
		expect((Tempo.NUMBER as any).eleven).toBe(11);
	});

	test('registryUpdate protects core TIMEZONE keys from overwrite', () => {
		// Attempt to overwrite 'utc' alias
		registryUpdate('TIMEZONE', { utc: 'Broken/Zone', myzone: 'Pacific/Auckland' });

		expect(Tempo.TIMEZONE.utc).toBe('UTC');
		expect(Tempo.TIMEZONE.utc).not.toBe('Broken/Zone');
		expect((Tempo.TIMEZONE as any).myzone).toBe('Pacific/Auckland');
	});

	test('registryUpdate protects core FORMAT keys from overwrite', () => {
		// Attempt to overwrite 'date' format
		const originalDate = Tempo.FORMAT.date;
		registryUpdate('FORMAT', { date: 'BROKEN', custom: 'YYYY' });

		expect(Tempo.FORMAT.date).toBe(originalDate);
		expect((Tempo.FORMAT as any).custom).toBe('YYYY');
	});

	test('registries are read-only to the public (Soft Freeze check)', () => {
		try {
			(Tempo.NUMBER as any).one = 42;
		} catch (e) {
			// expected
		}
		expect(Tempo.NUMBER.one).toBe(1);
	});

	afterAll(() => {
		// Cleanup added keys to keep environment clean for other tests
		const numTarget = (Tempo.NUMBER as any)[$Target];
		if (numTarget) {
			delete numTarget.eleven;
		}

		const fmtTarget = (Tempo.FORMAT as any)[$Target];
		if (fmtTarget) {
			delete fmtTarget.custom;
		}

		const tzTarget = (Tempo.TIMEZONE as any)[$Target];
		if (tzTarget) {
			delete tzTarget.myzone;
		}
	});
});
