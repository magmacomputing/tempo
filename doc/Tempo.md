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
npm install @js-temporal/polyfill
```

`Tempo` requires a `Temporal` polyfill if your environment does not yet support it natively.

---

## Parsing

`Tempo`'s strongest feature is its flexible parsing engine. It can interpret:

- **ISO Strings**: `2024-05-20T10:00:00Z`
- **Short Dates**: `20-May`, `May 20` (locale-aware)
- **Relative Strings**: `next Monday`, `3 days ago`, `yesterday`
- **Numbers/BigInt**: Unix timestamps in milliseconds or nanoseconds
- **Temporal Objects**: `ZonedDateTime`, `PlainDate`, etc.

### Patterns & Layouts
The parsing engine uses a library of RegEx patterns. You can extend these patterns globally via `Tempo.init()` or per instance.

---

## Formatting

Formatting uses a placeholder syntax similar to many template engines:

| Placeholder | Description | Example |
| :--- | :--- | :--- |
| `{yy}` | 4-digit year | `2024` |
| `{mm}` | 2-digit month | `05` |
| `{dd}` | 2-digit day | `20` |
| `{mon}` | Long month name | `May` |
| `{mmm}` | Short month name | `May` |
| `{wkd}` | Full weekday name | `Monday` |
| `{hh}` | 24-hour hour | `14` |
| `{mi}` | Minutes | `05` |

Example:
```typescript
const t = new Tempo();
t.format('{dd} {mon} {yy}'); // "24 January 2026"
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
