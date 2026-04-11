import { Tempo } from '../src/tempo.class.js';

describe('Tempo TimeZone Offset', () => {
	beforeEach(() => {
		Tempo.init()
	})

	it('should accept +HH:MM syntax for timeZone', () => {
		const t = new Tempo('2024-01-01T12:00:00', { timeZone: '+05:00' });
		expect(t.config.timeZone).toBe('+05:00');                   // verify config
		// 12:00 at +05:00 is 07:00 UTC
		expect(t.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss} {tz}')).toContain('+05:00'); // verify format
	});

	it('should accept -HH:MM syntax for timeZone', () => {
		const t = new Tempo('2024-01-01T12:00:00', { timeZone: '-05:00' });
		expect(t.config.timeZone).toBe('-05:00');
		expect(t.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss} {tz}')).toContain('-05:00');
	});

	it('should handle timeZone in constructor options', () => {
		const t = new Tempo({ value: '2024-01-01T12:00:00', timeZone: '+10:30' });
		expect(t.config.timeZone).toBe('+10:30');
	});
});
