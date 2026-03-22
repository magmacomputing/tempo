import type { Temporal as TemporalNamespace } from '@js-temporal/polyfill';

declare global {
	/** Global Temporal API */
	var Temporal: typeof TemporalNamespace;

	/** Temporal Namespace Types */
	namespace Temporal {
		type Instant = TemporalNamespace.Instant;
		type ZonedDateTime = TemporalNamespace.ZonedDateTime;
		type ZonedDateTimeLike = TemporalNamespace.ZonedDateTimeLike;
		type PlainDateTime = TemporalNamespace.PlainDateTime;
		type PlainDate = TemporalNamespace.PlainDate;
		type PlainTime = TemporalNamespace.PlainTime;
		type PlainYearMonth = TemporalNamespace.PlainYearMonth;
		type PlainMonthDay = TemporalNamespace.PlainMonthDay;
		type Duration = TemporalNamespace.Duration;
		type DurationLike = TemporalNamespace.DurationLike;
		type TimeZone = TemporalNamespace.TimeZone;
		type TimeZoneLike = TemporalNamespace.TimeZoneLike;
		type Calendar = TemporalNamespace.Calendar;
		type CalendarLike = TemporalNamespace.CalendarLike;
		type DateUnit = TemporalNamespace.DateUnit;
		type TimeUnit = TemporalNamespace.TimeUnit;

		interface DateLikeObject {
			year?: number | undefined;
			era?: string | undefined;
			eraYear?: number | undefined;
			month?: number | undefined;
			monthCode?: string | undefined;
			day?: number | undefined;
			calendar?: CalendarLike;
		}
		interface TimeLikeObject {
			hour?: number | undefined;
			minute?: number | undefined;
			second?: number | undefined;
			millisecond?: number | undefined;
			microsecond?: number | undefined;
			nanosecond?: number | undefined;
		}
		interface DurationLikeObject {
			years?: number | undefined;
			months?: number | undefined;
			weeks?: number | undefined;
			days?: number | undefined;
			hours?: number | undefined;
			minutes?: number | undefined;
			seconds?: number | undefined;
			milliseconds?: number | undefined;
			microseconds?: number | undefined;
			nanoseconds?: number | undefined;
		}
		interface DateTimeLikeObject extends DateLikeObject, TimeLikeObject { }
		interface ZonedDateTimeLikeObject extends DateTimeLikeObject {
			timeZone: TimeZoneLike;
			offset?: string | undefined;
		}
	}
}
