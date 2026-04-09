import * as t from '#library/type.library.js';
import '#library/temporal.polyfill.js';

describe('Temporal Type Guards', () => {
	it('should identify Temporal.Instant', () => {
		const instant = Temporal.Instant.from('2024-01-01T00:00:00Z');
		expect(t.isInstant(instant)).toBe(true);
		expect(t.isTemporal(instant)).toBe(true);
		expect(t.isZonedDateTime(instant)).toBe(false);
	});

	it('should identify Temporal.ZonedDateTime', () => {
		const zdt = Temporal.ZonedDateTime.from('2024-01-01T00:00:00Z[UTC]');
		expect(t.isZonedDateTime(zdt)).toBe(true);
		expect(t.isTemporal(zdt)).toBe(true);
		expect(t.isPlainDate(zdt)).toBe(false);
	});

	it('should identify Temporal.PlainDate', () => {
		const date = Temporal.PlainDate.from('2024-01-01');
		expect(t.isPlainDate(date)).toBe(true);
		expect(t.isTemporal(date)).toBe(true);
	});

	it('should identify Temporal.PlainTime', () => {
		const time = Temporal.PlainTime.from('12:00:00');
		expect(t.isPlainTime(time)).toBe(true);
		expect(t.isTemporal(time)).toBe(true);
	});

	it('should identify Temporal.PlainDateTime', () => {
		const pdt = Temporal.PlainDateTime.from('2024-01-01T12:00:00');
		expect(t.isPlainDateTime(pdt)).toBe(true);
		expect(t.isTemporal(pdt)).toBe(true);
	});

	it('should identify Temporal.Duration', () => {
		const dur = Temporal.Duration.from({ hours: 1 });
		expect(t.isDuration(dur)).toBe(true);
		expect(t.isTemporal(dur)).toBe(true);
	});

	it('should identify Temporal.PlainYearMonth', () => {
		const ym = Temporal.PlainYearMonth.from('2024-01');
		expect(t.isPlainYearMonth(ym)).toBe(true);
		expect(t.isTemporal(ym)).toBe(true);
	});

	it('should identify Temporal.PlainMonthDay', () => {
		const md = Temporal.PlainMonthDay.from('01-01');
		expect(t.isPlainMonthDay(md)).toBe(true);
		expect(t.isTemporal(md)).toBe(true);
	});

	it('should reject non-Temporal objects', () => {
		expect(t.isTemporal({})).toBe(false);
		expect(t.isTemporal(new Date())).toBe(false);
		expect(t.isInstant('2024-01-01T00:00:00Z')).toBe(false);
	});
});
