# Tempo Technical Documentation

`Tempo` is a modern JavaScript utility class designed to simplify work with dates and times by wrapping the `Temporal` API.

This project came about due to the need for a simple, yet powerful, way to parse (and manipulate) dates and times in JavaScript.
`Date.parse()` was not a good solution, as it is not locale-aware, does not handle relative strings well, does not handle time zones well, and is not implemented in a standard way across all JavaScript runtimes.

## Table of Contents
1. [Installation](#installation)
2. [Parsing](#parsing)
3. [Formatting](#formatting)
4. [Manipulation](#manipulation)
5. [Plugin System](#plugin-system)
6. [Ticker (Optional Plugin)](#ticker-optional-plugin)
7. [Terms (Built-in Plugin)](#plugin-terms)
8. [Context & Configuration](#context--configuration)
9. [Library Functionality](#library-functionality)
10. [API Reference](./tempo.api.md)
11. [Cookbook](./tempo.cookbook.md)
12. [Debugging](./tempo.debugging.md)

---

### Browser (Import Maps)

Tempo is an ESM-first library. You can use it in the browser without a build step using a suggested `importmap`. We provide an [importmap.json](../importmap.json) artifact in the package root for automated tools, or you can cut-and-paste the following into your HTML:

```html
<script type="importmap">
{
  "imports": {
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/tempo.index.js",
    "@magmacomputing/tempo/core": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/core.index.js",
    "@magmacomputing/tempo/ticker": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/plugin/extend/extend.ticker.js",
    "@magmacomputing/tempo/duration": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/plugin/module/module.duration.js",
    "@magmacomputing/tempo/format": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/plugin/module/module.format.js",
    "@magmacomputing/tempo/plugin": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/plugin/plugin.util.js",
    "@magmacomputing/tempo/enums": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/tempo.enum.js",
    "@magmacomputing/tempo/library": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/library.index.js",
    "@magmacomputing/library": "https://cdn.jsdelivr.net/npm/@magmacomputing/library/dist/common/index.js",
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.4.4/dist/index.esm.min.js"
  }
}
</script>
```

### Browser (Script Tag)

For legacy environments or simple prototypes, use the single-file bundle:

```html
<script src="/path/to/tempo/dist/tempo.bundle.js"></script>
<script>
  const t = new Tempo();
</script>
```

---

## Installation

```bash
npm install @magmacomputing/tempo
```

---

## ✨ What's New in v2.0.1 (Stabilized)
The **v2.0.1** release focus is on internal hardening, security, and developer ergonomics:

- **Parsing Engine Stabilization**: Re-engineered pattern generation for $O(1)$ instance creation and fixed a bug where local layout literals were being destroyed during state synchronization.
- **Registry Security (Soft Freeze)**: Core registries (`TIMEZONE`, `NUMBER`, `FORMAT`) are now protected by a proxy-based "Soft Freeze" layer. They are read-only for public consumers while remaining extensible via the primary public API **`Tempo.extend({ timeZones, formats, ... })`**.
- **Ticker & Registry Hardening**: Fully synchronized `pulse()` and `next()` logic to ensure consistent pulse counts ($N$ pulses for `limit: N`); resolved async generator hangs and cold-start scheduling issues, ensuring 100% reliability for long-running reactive streams.
- **Project Structure Refactoring**: Internal tooling moved from `#tempo/bin` to `#tempo/scripts` for better ESM/TS integration.

---

> [!IMPORTANT]
> `Tempo` requires an environment with native `Temporal` support (Modern Runtimes like Node.js 20+, Deno, or Bun).
> If your environment is older, you must provide your own polyfill.

### Build Target

Tempo is compiled to **ES2022**. This target supports modern JavaScript features like **Private Class Fields** (`#property`) while maintaining compatibility with the vast majority of modern browsers and server-side runtimes (Node 20+, Deno, Bun).

### Polyfilling (if required)

If you need to support older environments, we recommend `@js-temporal/polyfill`:

```bash
npm install @js-temporal/polyfill
```

Then, import it at the very top of your application entry point:

```typescript
import '@js-temporal/polyfill';
```

### 💻 Server-Side (Node.js, Deno, Bun)

`Tempo` is a native ESM package. In modern runtimes, simply import the class:

```typescript
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('next Friday');
console.log(t.format('{dd} {mon} {yyyy}'));
```

### 🌐 Browser (Import Maps)

`Tempo` is an ESM-first library and can be used directly in modern browsers using [Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap). This is a great way to use `Tempo` without a build step.

```html
<script type="importmap">
  {
    "imports": {
      "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/index.js",
      "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.4.4/dist/index.esm.min.js"
    }
  }
</script>

<script type="module">
  // Optional: Import polyfill if not natively supported
  if (!globalThis.Temporal) {
    await import('@js-temporal/polyfill');
  }

  import { Tempo } from '@magmacomputing/tempo';

  const t = new Tempo();
  console.log(t.format('{dd} {mon} {yyyy}'));
</script>
```
---

## Parsing

`Tempo`'s strongest feature is its flexible parsing engine. It can interpret:

- **ISO Strings**: `2024-05-20T10:00:00Z`
- **Short Dates**: `20-May`, `May 20` (locale-aware)
- **Relative Strings**: `next Monday`, `last Friday`, `2 days ago`
- **Numbers/BigInt**: Unix timestamps in milliseconds or nanoseconds
- **Temporal Objects**: `ZonedDateTime`, `PlainDate`, etc.

### Snippets & Layouts
The parsing engine uses a library of RegEx patterns.
You can extend these patterns a) globally (via `Tempo.init()`) or b) per instance (via options to `new Tempo`.

`Tempo` also supports **Event** and **Period** aliases. These can be simple strings or functions that return a value to be parsed. When using functions, ensure you use the `function` keyword to maintain proper `this` binding to the `Tempo` instance.

```typescript
Tempo.extend({
  event: {
    'birthday': '20 May',
    'tomorrow': function () { return this.add({ days: 1 }) },
  }
});
```

- [Layout Patterns Guide](./tempo.layout.md): Details on creating custom parsing patterns and using relative units.
- [Weekday Parsing Guide](./tempo.weekday.md): Deep dive into relative weekday expressions (e.g., "next Monday").
- [Custom Patterns & Snippets](./tempo.pattern.md): Advanced guide on how Tempo translates layouts into regex.

### US-Style Dates (Ambiguous Digits)
When parsing dates comprised entirely of digits (e.g., `04012026`), the input can be visually ambiguous: Is it `04-Jan-2026` (Day-Month-Year) or `Apr-01-2026` (Month-Day-Year)?

Tempo solves this elegantly using **reasonable defaults and TimeZone awareness**:
1. **TimeZone Detection**: 
   Tempo will (if not provided) infer the timeZone from the runtime environment.
   If you do provide a `timeZone` it should be an IANA timezone identifier or an "±hh:mm" offset.
   If the timeZone is associated with one of the locales that suggest month-day-year order (which defaults to `en-US`), it assumes the input is US-style  (Tempo.parse.mdyLocales)
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
*(Note: This logic only applies to **Parsing** digits-only input. **Formatting** US-style output remains dependent on the `{mm}{dd}{yyyy}` layout string you choose to output.)*

---

## Formatting

Formatting uses a placeholder syntax similar to many template engines:

| Placeholder | Description | Type | Range | Example |
| :--- | :--- | :--- | :--- | :--- |
| `{yyyy}` | Year | `4-digit` | `0001-9999` | `2024` |
| `{yw}` | ISO Week-numbering Year | `4-digit` | `0001-9999` | `2024` |
| `{yy}` | Year | `2-digit` | `00-99` | `24` |
| `{mm}` | Month | `2-digit` | `01-12` | `05` |
| `{mon}` | Full Month Name | `string` | `January - December` | `June` |
| `{mmm}` | Month Name | `3-char string` | `Jan - Dec` | `Jun` |
| `{dd}` | Day of Month | `2-digit` | `01-31` | `20` |
| `{day}` | Day of Month | `1-2 digit` | `1-31` | `20` |
| `{wkd}` | Full Weekday Name | `string` | `Monday - Sunday` | `Monday` |
| `{www}` | Weekday Name | `3-char string` | `Mon - Sun` | `Mon` |
| `{dow}` | Day of Week (Mon-Sun) | `1-digit` | `1-7` | `1` |
| `{ww}` | Week of Year | `1-2 digit` | `1-53` | `21` |
| `{hh}` | Hour | `1-2 digit` | `0-24` | `14` |
| `{HH}` | Hour (with meridiem) | `1-2 digit` | `1-12` | `02pm` |
| `{mi}` | Minutes | `2-digit` | `00-59` | `05` |
| `{ss}` | Seconds | `2-digit` | `00-59` | `05` |
| `{ms}` | Milliseconds | `3-digit` | `000-999` | `005` |
| `{us}` | Microseconds | `3-digit` | `000-999` | `000` |
| `{ns}` | Nanoseconds | `3-digit` | `000-999` | `000` |
| `{ff}` | Fractional Seconds | `9-digit` | `0-999999999` | `005000000` |
| `{ts}` | Unix Timestamp | `digits` | `n/a` | `1716163200000` |
| `{#term}` | Unified Term Identity | `string` | `n/a` | `{#qtr}` or `{#quarter}` |

Example:
```typescript
const t = new Tempo();
t.format('{dd} {mon} {yyyy}');  // "24 January 2026"
```

### ISO 8601 Week Dates
*(Note: `{yw}` represents the ISO week year, which may differ from `{yyyy}` at the start or end of a calendar year if the current date belongs to an ISO week from the adjacent year.)*

Tempo supports the **ISO 8601 Week Date** system, which is commonly used in business and logistics for unambiguous weekly scheduling.

- **`{ww}`**: Represents the ISO week number (01–53).
- **`{yw}`**: Represents the ISO week-numbering year.

A week in this system always starts on a **Monday**. Week 01 is defined as the week with the year's first Thursday (or the week containing January 4th).

To format a standard ISO week date (e.g., `2024-W21`), use both placeholders together:
```typescript
const t = new Tempo('2024-05-20');
t.format('{yw}-W{ww}');         // "2024-W21"
```

---

## Manipulation

`Tempo` instances are **immutable**. Methods like `add` and `set` return a *new* `Tempo` instance.

### `add(payload, options?)`
Adds a duration (positive or negative) or a date-time payload to the instance.
```typescript
t.add({ days: -1, hours: 2 });
t.add('tomorrow');
```

### `set(payload, options?)`
Sets the instance to a specific point or relative position.
```typescript
t.set({ hour: 0 }); // Midnight
t.set({ start: 'month' }); // Start of the current month
t.set({ end: '#quarter' }); // End of the current fiscal quarter
```

### `until(dateTime, unit?)`
Calculates the duration until another date-time.
```typescript
t.until('2024-12-25', 'days'); // Returns number of days
t.until('2024-12-25'); // Returns Temporal.Duration object, with an 'iso' property (ISO 8601 duration format)
```

### `since(dateTime, unit?)`
Calculates the elapsed time since another date-time (returns a human-readable string).
```typescript
t.since('yesterday', 'days'); // "1d ago"
t.add({days:-2}).set({period:'afternoon'}).since(); // Returns ISO 8601 duration format (e.g. 'P1DT20H59M49.290589287S')
```

### `compare(t1, t2)`
Static method which can be used to sort Tempo's across different timeZones
```typescript
const t1 = new Tempo('2024-05-20', { timeZone: 'America/New_York' });
const t2 = new Tempo('2024-05-20', { timeZone: 'Europe/London' });
[t1,t2].sort(Tempo.compare).forEach(t => console.log('timeZone: ', t.config.timeZone));
// timeZone:  Europe/London
// timeZone:  America/New_York
```
or to compare `Tempo` instances as "before" (-1), "same-as" (0), or "after" (1)
```typescript
const t1 = new Tempo('2024-05-20', { timeZone: 'America/New_York' });
const t2 = new Tempo('2024-05-20', { timeZone: 'Europe/London' });
Tempo.compare(t1, t2); // 1, meaning t1 is 'later than' t2
```

---

## Plugin System

Tempo is designed to be lean. Non-core features like the `ticker` or advanced business logic can be added via the plugin system.

### Extending Tempo
To add a plugin, use the static `extend()` method. 

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '@magmacomputing/tempo/ticker';

Tempo.extend(TickerPlugin);
```

- [Plugin Development Guide](./tempo.plugin.md): A detailed overview of the `Tempo.extend()` API and best practices for creating custom extensions.

> [!NOTE]
> **Selective Immobility**: When you extend Tempo, the core methods (like `format`, `add`, `set`) are protected. You can add NEW functionality, but you cannot overwrite the essential behavior of the library.

---

## Ticker (Optional Plugin)

`Tempo.ticker` creates a reactive stream of `Tempo` instances, making it easy to build clocks or countdowns. 
**Note**: This requires the `TickerPlugin` to be installed first.

```typescript
// Pattern: Async Generator, which emits a new Tempo instance every second
for await (const t of Tempo.ticker()) {
  console.log(t.format('{hh}:{mi}:{ss}'));
}
```

See the [Tempo Ticker guide](./tempo.ticker.md) for full details and API signatures.

---

## Plugin (Terms)

`Tempo` can be extended with "terms" – plugin that calculate complex date ranges. 

### Unified Term Logic (v2.0.0)

Terms are now fully integrated into the core `set()` and `format()` methods via the `#` indicator:

1. **Anchored Mutations**: Jump to the `start`, `mid`, or `end` of any term:
   ```typescript
   t.set({ start: '#quarter' }); // April 1st (if in Q2)
   t.set({ end: '#season' });    // Nov 30th (if in Autumn)
   ```
2. **Identity Placeholders**: Embed term identities into formatting strings:
   - `{#qtr}`: Returns the technical key (e.g., `"Q2"`).
   - `{#quarter}`: Returns the semantic label (e.g., `"Second Quarter"`), falling back to the key if no label exists.

3. **Term Traversal (Math)**: Shift the date by semantic "steps" using `#term` units in `.add()`:
   ```typescript
   t.add({ '#quarter': 1 });  // Move to the same day/time in the NEXT quarter
   t.add({ '#season': -1 });   // Move back one season
   t.add({ '#morning': 1 });   // Jump across gaps to the next morning period
   ```
   *Note: Relational math preserves your relative duration from the start of the term and applies overflow constraints.*

### Persistent Access
Terms remain accessible via the `t.term` getter for programmatic use. The `start` and `end` boundaries are returned as **fluent, immutable Tempo instances**:
- `t.term.qtr`: Current fiscal calendar quarter object.
- `t.term.szn`: Current meteorological season (North/South hemisphere-aware).
- `t.term.zdc`: Current Western/Chinese astrological sign.

```typescript
const q = t.term.qtr;
console.log(q.start.format('{dd} {mmm}')); // Fluent formatting directly from the term!
console.log(q.end.since(t, 'days'));        // Calculate days remaining in the quarter
```

See the [Tempo Terms guide](./tempo.term.md) for full details and plugin development.

---

## Context & Configuration

Global settings can be configured using [`Tempo.init()`](./tempo.config.md).
This will affect any new Tempo instances created (but not affect any existing instances).

```typescript
Tempo.init({
  timeZone: 'Europe/London',
  locale: 'en-GB'
});
```

### TIMEZONE Aliases
For convenience, `timeZone` configurations accept both strict IANA identifiers (e.g., `Australia/Sydney`) and common abbreviations.
Tempo will automatically translate these abbreviations before passing them to the underlying engine (e.g., `utc` -> `UTC`, `pst` -> `America/Los_Angeles`).

These are stored in the `Tempo.TIMEZONE` registry, which is protected by **Soft Freeze** but remains extensible via `Tempo.registryUpdate()`. 

See the [Configuration Guide](./tempo.config.md#timezone-registry) for the complete list of default aliases.

Instances can also be created with specific options:
```typescript
new Tempo('2024-05-20', { timeZone: 'AEST', debug: true });
```

---

## Debugging

Tempo includes a robust debugging mode that tracks internal mutations and parsing decisions.

See the [Tempo Debugging guide](./tempo.debugging.md) for full details on using the `debug: true` flag and the `tempo.log` getter.

---

## Technical References
- [API Reference](./tempo.api.md)
- [Cookbook](./tempo.cookbook.md)
- [Library Functionality](./tempo.library.md)
- [Architecture & Internal Protection](./architecture.md)
