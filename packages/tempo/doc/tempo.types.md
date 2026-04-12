# TypeScript Types Reference

This document provides a reference for the core TypeScript types and interfaces used within the `Tempo` namespace. These types define the valid inputs, configuration options, and manipulation arguments for the library.

---

## `Tempo.DateTime`
The primary type used for arguments representing a point in time. `Tempo` is extremely flexible and can interpret a wide range of formats. It also provides methods to extract these back as `Temporal` objects (e.g., `toPlainDate()`, `toInstant()`, etc.).

```typescript
type DateTime = 
  | string                      // ISO strings, relative strings ('next Friday'), etc.
  | number                      // Unix timestamp in milliseconds
  | bigint                      // Unix timestamp in nanoseconds
  | Date                        // Standard JavaScript Date object
  | Tempo                       // Another Tempo instance (cloning)
  | Function                    // Dynamic resolution (max depth 5)
  | Temporal.ZonedDateTimeLike  // Temporal ZonedDateTime object or property bag
  | undefined | null            // Interpreted as "now"
```

---

## `Tempo.Options`
Configuration options that can be passed to `Tempo.init()` or the `Tempo` constructor.

```typescript
interface Options {
  timeZone?: string;            // IANA zone (e.g., 'UTC', 'America/New_York') or alias
  locale?: string;              // BCP 47 language tag (e.g., 'en-US', 'en-AU')
  calendar?: string;            // Calendar system (default: 'iso8601')
  pivot?: number;               // Cutoff for 2-digit years (default: 75)
  debug?: boolean;              // Enable internal log tracking
  catch?: boolean;              // If true, invalid inputs return a Void instance
  store?: string;               // Key for persistent storage (e.g., localStorage)
  sphere?: 'north' | 'south';   // Hemisphere for seasonal plugin
  timeStamp?: 'ms' | 'ns';      // Precision for numeric timestamps
  [key: string]: any;           // Allows for custom configuration shared with plugin
}
```

---

## `Tempo.Add`
Used by the `.add()` method to specify a duration to add or subtract.

```typescript
type Add = Partial<Record<Tempo.Unit, number>>;

// Example:
t.add({ days: 5, hours: -2 });
```

---

## `Tempo.Set`
Used by the `.set()` method to move to a specific unit boundary or date-time alias.

```typescript
type Set = Partial<
  Record<'start' | 'mid' | 'end', Tempo.Unit> &
  Record<'date' | 'time' | 'event' | 'period', string>
>;

// Examples:
t.set({ start: 'month' });    // Start of the month
t.set({ event: 'xmas' });     // Relative or absolute event alias
t.set({ time: '14:30' });     // Specific time string
```

---

## `Tempo.Unit`
Valid date and time unit strings used throughout the API.

```typescript
type Unit = 
  | 'year' | 'month' | 'week' | 'day' 
  | 'hour' | 'minute' | 'second' 
  | 'millisecond' | 'microsecond' | 'nanosecond'
  | 'years' | 'months' | 'weeks' | 'days' // Plurals are also supported
  // ... etc.
```

---

## `Tempo.Until`
The argument passed to `.until()` and `.since()`.

```typescript
type Until = 
  | (Tempo.Options & { unit?: Tempo.Unit }) 
  | Tempo.Unit;

// Examples:
t.until('2025-01-01', 'days');
t.since('yesterday', { timeZone: 'UTC' });
```

---

## `Tempo.Discovery`
The contract for global discovery via `Symbol.for($Tempo)`.

```typescript
interface Discovery {
  options?: Options | (() => Options);
  timeZones?: Record<string, string>;
  terms?: TermPlugin | TermPlugin[];
  plugin?: Plugin | Plugin[];
  numbers?: Record<string, number>;
  formats?: Record<string, string>;
}
```

---

## `Tempo.TermPlugin`
The interface for defining custom business-logic plugin.

```typescript
type TermPlugin = {
  key: string;                  // Short name on t.term (e.g., 'qtr')
  scope?: string;               // Full name for range object (e.g., 'quarter')
  description: string;          // Human-readable description
  define: (this: Tempo, keyOnly?: boolean) => any;
}
```
---

## `Tempo.TickerOptions`
Advanced configuration for `Tempo.ticker()`. Extends `Temporal.DurationLike` (plural keys only).

```typescript
type TickerOptions = Partial<Temporal.DurationLike> & {
  interval?: number | string | bigint;    // Scalar interval (seconds if number)
  limit?: number;                         // Total number of ticks to emit
  until?: Tempo.DateTime;                 // Virtual deadline (inclusive)
  seed?: Tempo.DateTime | Tempo.Options;  // Starting point for virtual clock
}
```
