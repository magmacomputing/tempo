# Tempo Technical Documentation

`Tempo` is a modern JavaScript utility class designed to simplify work with dates and times by wrapping the `Temporal` API.

## Table of Contents
1. [Installation](#installation)
2. [Parsing](#parsing)
3. [Formatting](#formatting)
4. [Manipulation](#manipulation)
5. [Plugins (Terms)](#plugins-terms)
6. [Context & Configuration](#context--configuration)

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
You can extend these patterns globally via `Tempo.init()` or per instance.

`Tempo` also supports **Event** and **Period** aliases. These can be simple strings or functions that return a value to be parsed. When using functions, ensure you use the `function` keyword to maintain proper `this` binding to the `Tempo` instance.

```typescript
Tempo.init({
  event: {
    birthday: function() { return '20-May'; }
  }
});
```

- [Layout Patterns Guide](file:///home/michael/Project/tempo/doc/tempo.layout.md): Details on creating custom parsing patterns and using relative units.

---

## Formatting

Formatting uses a placeholder syntax similar to many template engines:

| Placeholder | Description | Example |
| :--- | :--- | :--- |
| `yyyy` | 4-digit year | `2024` |
| `yy` | 2-digit year (alias for `yyyy`) | `24` |
| `mm` | 2-digit month | `05` |
| `mon` | Long month name | `May` |
| `mmm` | Short month name | `May` |
| `dd` | 2-digit day | `20` |
| `day` | Day of month (numeric) | `20` |
| `www` | Short weekday name | `Mon` |
| `wkd` | Full weekday name | `Monday` |
| `dow` | Day of week (1-7) | `1` |
| `ww` | Week of year | `21` |
| `hh` | 24-hour hour | `14` |
| `HH` | 12-hour hour (with Meridiem) | `02PM` |
| `mi` | Minutes | `05` |
| `ss` | Seconds | `05` |
| `ms` | Milliseconds | `005` |
| `us` | Microseconds | `000` |
| `ns` | Nanoseconds | `000` |
| `ff` | Fractional seconds (9-digits) | `005000000` |
| `f2` | Fractional seconds (alias) | `005000000` |
| `ts` | Unix timestamp | `1716163200000` |

Example:
```typescript
const t = new Tempo();
t.format('dd mon yyyy'); // "24 January 2026"
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
Static method to compare a `Tempo` instance as before, or same-as, or after a second `Tempo` instance
```typescript
Tempo.compare(t1, t2); // -1, 0, or 1
```

---

## Plugins (Terms)

`Tempo` can be extended with "terms" – plugins that calculate complex date ranges. These are accessible via the `t.term` getter.

Common terms include:
- `t.term.quarter`: Returns the current calendar quarter.
- `t.term.season`: Returns the current season (North/South hemisphere aware).

---

## Context & Configuration

Global settings can be configured using `Tempo.init()`:

```typescript
Tempo.init({
  timeZone: 'Europe/London',
  locale: 'en-GB'
});
```

Instances can also be created with specific options:
```typescript
new Tempo('2024-05-20', { debug: true });
```
