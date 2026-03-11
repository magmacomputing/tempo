import { Tempo } from '#core/shared/tempo.class.js';

describe('Meridiem (AM/PM) parsing and formatting', () => {

	describe('Formatting', () => {
		test('lowercase meridiem {mer}', () => {
			expect(new Tempo('2024-05-20 03:00').format('{mer}')).toBe('am');
			expect(new Tempo('2024-05-20 15:00').format('{mer}')).toBe('pm');
		})

		test('uppercase meridiem {MER}', () => {
			expect(new Tempo('2024-05-20 03:00').format('{MER}')).toBe('AM');
			expect(new Tempo('2024-05-20 15:00').format('{MER}')).toBe('PM');
		})

		test('12-hour clock with meridiem', () => {
			const t1 = new Tempo('2024-05-20 00:00'); // Midnight
			expect(t1.format('{HH}{mer}')).toBe('12am');

			const t2 = new Tempo('2024-05-20 12:00'); // Midday
			expect(t2.format('{HH}{mer}')).toBe('12pm');
		})
	})

	describe('Parsing (#conform)', () => {
		test('parse am/pm case-insensitive', () => {
			expect(new Tempo('03:30am').hh).toBe(3);
			expect(new Tempo('03:30AM').hh).toBe(3);
			expect(new Tempo('03:30pm').hh).toBe(15);
			expect(new Tempo('03:30PM').hh).toBe(15);
		})

		test('parse midnight/midday', () => {
			expect(new Tempo('12:00am').hh).toBe(0);
			expect(new Tempo('12:00pm').hh).toBe(12);
			expect(new Tempo('12am').hh).toBe(0);
			expect(new Tempo('12pm').hh).toBe(12);
		})

		test('parse with space before meridiem', () => {
			expect(new Tempo('03:30 am').hh).toBe(3);
			expect(new Tempo('03:30 PM').hh).toBe(15);
		})
	})

})
