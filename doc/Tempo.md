# Tempo Technical Documentation

`Tempo` is a modern JavaScript utility class designed to simplify work with dates and times by wrapping the `Temporal` API.

This project came about due to the need for a simple, yet powerful, way to parse (and manipulate) dates and times in JavaScript.
`Date.parse()` was not a good solution, as it is not locale-aware, does not handle relative strings well, does not handle time zones well, and is not implemented in a standard way across all JavaScript runtimes.

## Table of Contents
1. [Installation](#installation)
2. [Parsing](#parsing)
3. [Formatting](#formatting)
4. [Manipulation](#manipulation)
5. [Plugins (Terms)](#plugins-terms)
6. [Context & Configuration](#context--configuration)
7. [Enumerators](#enumerators)

---

## Installation

```bash
npm install @magmacomputing/tempo
```

`Tempo` requires a `Temporal` polyfill if your environment does not yet support it natively.
```bash
npm install @js-temporal/polyfill
```
---

## Parsing

`Tempo`'s strongest feature is its flexible parsing engine. It can interpret:

- **ISO Strings**: `2024-05-20T10:00:00Z`
- **Short Dates**: `20-May`, `May 20` (locale-aware)
- **Relative Strings**: `next Monday`, `last Friday`
- **Relative Strings**: `next Monday`, `last Friday`, `2 days ago`
- **Numbers/BigInt**: Unix timestamps in milliseconds or nanoseconds
- **Temporal Objects**: `ZonedDateTime`, `PlainDate`, etc.

### Snippets & Layouts
The parsing engine uses a library of RegEx patterns.
You can extend these patterns a) globally (via `Tempo.init()`) or b) per instance (via options to `new Tempo`.

`Tempo` also supports **Event** and **Period** aliases. These can be simple strings or functions that return a value to be parsed. When using functions, ensure you use the `function` keyword to maintain proper `this` binding to the `Tempo` instance.

```typescript
Tempo.init({
  event: {
    'birthday': '20 May',
    'tomorrow': function () { return Temporal.Now.plainDateISO().add({ days: 1 }) },
  }
});
```

- [Layout Patterns Guide](file:///home/michael/Project/tempo/doc/tempo.layout.md): Details on creating custom parsing patterns and using relative units.

### US-Style Dates (Ambiguous Digits)
When parsing dates comprised entirely of digits (e.g., `04012026`), the input can be visually ambiguous: Is it `04-Jan-2026` (Day-Month-Year) or `Apr-01-2026` (Month-Day-Year)?

Tempo solves this elegantly using **reasonable defaults and TimeZone awareness**:
1. **TimeZone Detection**: 
   Tempo will (if not provided) infer the timeZone from the runtime environment.
   If you do provide a `timeZone` it should be an IANA timezone identifier or an "±hh:mm" offset.
   If the timeZone is associated with one of the `mdyLocales` (which defaults to `en-US`), it assumes the input is US-style  (Tempo.parse.mdyLocales)
2. **Prioritized Parsing**:
   - If the timeZone favors US-style, Tempo tries the inbuilt **Month-Day-Year (`mdy`)** parsing layout *first*.
   - If the timeZone favors the rest of the world, Tempo tries the inbuilt **Day-Month-Year (`dmy`)** parsing layout *first*.
3. **Automatic Fallback**:
   If the first layout fails (for example, reading `15012026` as `mdy` fails because there is no 15th month), Tempo will automatically "re-try" using the alternate layout.

You can configure what timeZone or specific layouts trigger this behavior in the configuration options:
```typescript
const usDate = new Tempo('04012026', { timeZone: 'America/New_York' }); // Parsed as Apr-01-2026
const ukDate = new Tempo('04012026', { timeZone: 'Europe/London' });    // Parsed as 04-Jan-2026
```
*(Note: This logic only applies to **parsing** digits-only input. Formatting US-style dates remains dependent on the `{mm}{dd}{yyyy}` layout string you choose to output.)*

---

## Formatting

Formatting uses a placeholder syntax similar to many template engines:

| Placeholder | Description | Example |
| :--- | :--- | :--- |
| `{yyyy}` | 4-digit year | `2024` |
| `{yy}` | 2-digit year | `24` |
| `{mm}` | 2-digit month | `05` |
| `{mon}` | Full month name | `June` |
| `{mmm}` | 3-character month name | `Jun` |
| `{dd}` | 2-digit day | `20` |
| `{day}` | Day of month (numeric) | `20` |
| `{wkd}` | Full weekday name | `Monday` |
| `{www}` | 3-character weekday name | `Mon` |
| `{dow}` | Day of week (1-7) | `1` |
| `{ww}` | Week of year | `21` |
| `{hh}` | 24-hour hour | `14` |
| `{HH}` | 12-hour hour (with meridiem) | `02pm` |
| `{mi}` | 2-digit minutes | `05` |
| `{ss}` | 2-digit seconds | `05` |
| `{ms}` | 3-digit milliseconds | `005` |
| `{us}` | 3-digit microseconds | `000` |
| `{ns}` | 3-digit nanoseconds | `000` |
| `{ff}` | 9-digit fractional seconds | `005000000` |
| `{ts}` | Unix timestamp | `1716163200000` |
| `{term.name}` | Term value | eg. `{term.qtr}` returns the current quarter as Q1, Q2, Q3 or Q4 |

Example:
```typescript
const t = new Tempo();
t.format('{dd} {mon} {yyyy}'); // "24 January 2026"
```

---

## Manipulation

`Tempo` instances are **immutable**. Methods like `add` and `set` return a *new* `Tempo` instance.

### `add(mutate)`
Adds a duration to the instance.
```typescript
t.add({ days: 1, hours: 2 });
```

### `set(offset)`
Sets the instance to a specific point or relative position.
```typescript
t.set({ hour: 0 }); // Midnight
t.set({ start: 'month' }); // Start of the current month
```

### `until(dateTime, unit?)`
Calculates the duration until another date-time.
```typescript
t.until('2024-12-25', 'days'); // Returns number of days
t.until('2024-12-25'); // Returns Temporal.Duration object
```

### `since(dateTime, unit?)`
Calculates the elapsed time since another date-time (returns a human-readable string).
```typescript
t.since('yesterday'); // "1 day ago"
```

### `compare(t1, t2)`
Static method to compare a `Tempo` instance as "before" (-1), "same-as" (0), or "after" (1) a second `Tempo` instance
```typescript
Tempo.compare(t1, t2); // -1, 0, or 1
```

---

## Plugins (Terms)

`Tempo` can be extended with "terms" – plugins that calculate complex date ranges. These are accessible via the `t.term` getter.

Common terms include:
- `t.term.quarter`: Returns the current calendar quarter.
- `t.term.season`: Returns the current season (North/South hemisphere-aware).

---

## Context & Configuration

Global settings can be configured using `Tempo.init()`.
This will affect any new Tempo instances created (but not affect any existing instances).

```typescript
Tempo.init({
  timeZone: 'Europe/London',
  locale: 'en-GB'
});
```

### TimeZone Aliases
For convenience, `timeZone` configurations accept both strict IANA identifiers (e.g., `Australia/Sydney`) as well as common abbreviations.
Tempo will automatically translate these abbreviations before passing them to the underlying engine:
- `utc` -> `UTC`
- `gmt` -> `Europe/London`
- `est` -> `America/New_York`
- `cst` -> `America/Chicago`
- `mst` -> `America/Denver`
- `pst` -> `America/Los_Angeles`
- `aest` -> `Australia/Sydney`
- *(...and several others. See `tempo.default.ts` for the complete `TimeZone` registry.)*

Instances can also be created with specific options:
```typescript
new Tempo('2024-05-20', { timeZone: 'AEST', debug: true });
```

---

## Enumerators

Tempo uses a custom `enumify` utility to define robust, iterable enumerations rather than relying on native TypeScript enums.

- [Tempo Enumerators Guide](./tempo.enumerators.md): Details on how enumerators are defined, used, and how they compare against standard TypeScript enums.
