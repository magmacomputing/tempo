import '#library/temporal.polyfill.js';
import { isNumeric } from '#library/coercion.library.js';
import { Match } from '../../tempo.default.js';
import { TemporalObject, TypeValue, isInstant, isZonedDateTime, isPlainDate, isPlainDateTime, isTempo } from '#library/type.library.js';
import type { Tempo } from '#tempo/tempo.class.js';

/**
 * Logic to compose various input types into a Temporal.ZonedDateTime.  
 * Extracted from Tempo.#parse to reduce core class complexity.
 */
export function compose(
	{ type, value }: TypeValue<any>,
	today: Temporal.ZonedDateTime,
	tz: Temporal.TimeZoneLike,
	targetTz: string,
	targetCal: string
): { dateTime: Temporal.ZonedDateTime, timeZone?: string | undefined } {
	let res: TemporalObject | Tempo = today;
	let timeZone: string | undefined;
	let dateTime: Temporal.ZonedDateTime;

	switch (type) {
		case 'Void':
		case 'Empty':
		case 'Undefined':
			res = today;
			break;

		case 'String':
			try {
				const str = value.replace(/Z$/, '');
				const zdt = Temporal.ZonedDateTime.from(`${str}[${tz}]`);
				timeZone = zdt.timeZoneId;
				res = zdt;
			} catch (err) {
				if (Match.date.test(value)) {
					try {
						res = Temporal.PlainDate.from(value);
						break;
					} catch { /* ignore and fallback */ }
				}

				try {
					res = Temporal.PlainDateTime.from(value);
				} catch (err2) {
					const date = new Date(value.toString());
					if (isNaN(date.getTime())) {
						throw new Error(`Cannot parse Date: "${value}"`);
					} else {
						res = Temporal.Instant.fromEpochMilliseconds(date.getTime());
					}
				}
			}
			break;

		case 'Temporal.ZonedDateTime':
		case 'Temporal.PlainDate':
		case 'Temporal.PlainDateTime':
		case 'Temporal.Instant':
		case 'Tempo':
			res = value;
			break;

		case 'Temporal.PlainTime':
			res = today.withPlainTime(value);
			break;

		case 'Temporal.PlainYearMonth':
			res = value.toPlainDate({ day: Math.min(today.day, value.daysInMonth) });
			break;

		case 'Temporal.PlainMonthDay':
			res = value.toPlainDate({ year: today.year });
			break;

		case 'Date':
			res = Temporal.Instant.fromEpochMilliseconds(value.getTime());
			break;

		case 'Number':
			{
				if (Number.isNaN(value) || !Number.isFinite(value))
					throw new RangeError(`Invalid Tempo number: ${value}`);

				const negative = value < 0;
				const [seconds = BigInt(0), suffix = BigInt(0)] = value.toString().split('.').map(v => isNumeric(v) ? BigInt(v) : BigInt(0));
				let nano = BigInt(suffix.toString().substring(0, 9).padEnd(9, '0'));
				if (negative && nano > 0n) nano = -nano;

				res = Temporal.Instant.fromEpochNanoseconds(seconds * BigInt(1_000_000_000) + nano);
				break;
			}

		case 'BigInt':
			res = Temporal.Instant.fromEpochNanoseconds(value);
			break;

		default:
			break;
	}

	// now analyze what kind of Temporal Object we have and convert to ZonedDateTime
	switch (true) {
		case isZonedDateTime(res):
			dateTime = res.withCalendar(targetCal);
			break;

		case isInstant(res):
			dateTime = res.toZonedDateTimeISO(targetTz).withCalendar(targetCal);
			break;

		case isPlainDate(res) || isPlainDateTime(res):
			dateTime = res.toZonedDateTime(targetTz).withCalendar(targetCal);
			break;

		case isTempo(res):
			dateTime = res.toDateTime().withCalendar(targetCal);
			break;

		default:
			throw new Error(`Cannot convert ${type} (value: ${String(res)}) to ZonedDateTime`);
	}

	return { dateTime, timeZone };
}
