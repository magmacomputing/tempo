import { Temporal as _Temporal } from '@js-temporal/polyfill';

declare global {
  var Temporal: typeof _Temporal;

  namespace Temporal {
    type Instant = _Temporal.Instant;
    type ZonedDateTime = _Temporal.ZonedDateTime;
    type PlainDateTime = _Temporal.PlainDateTime;
    type PlainDate = _Temporal.PlainDate;
    type PlainTime = _Temporal.PlainTime;
    type PlainYearMonth = _Temporal.PlainYearMonth;
    type PlainMonthDay = _Temporal.PlainMonthDay;
    type Duration = _Temporal.Duration;
    type DateUnit = _Temporal.DateUnit;
    type TimeUnit = _Temporal.TimeUnit;
    type RoundingMode = _Temporal.RoundingMode;
    type ComparisonResult = _Temporal.ComparisonResult;
    type DurationLike = _Temporal.DurationLike;
    type DurationLikeObject = _Temporal.DurationLike;
    type ZonedDateTimeLike = _Temporal.ZonedDateTimeLike;
    type ZonedDateTimeLikeObject = _Temporal.ZonedDateTimeLike;
  }
}
