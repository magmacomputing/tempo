# Tempo Technical Documentation

`Tempo` is a modern JavaScript utility class designed to simplify work with dates and times by wrapping the `Temporal` API.

This project came about due to the need for a simple, yet powerful, way to parse (and manipulate) dates and times in JavaScript.
`Date.parse()` was not a good solution, as it is not locale-aware, does not handle relative strings well, does not handle time zones well, and is not implemented in a standard way across all JavaScript runtimes.

## Table of Contents
1. [Installation](#installation)
2. [Parsing](#parsing)
3. [Formatting](#formatting)
4. [Manipulation](#manipulation)
5. [Plugins (Extending Tempo)](#plugin-system)
6. [Ticker (Optional Plugin)](#ticker-clocks)
7. [Terms (Built-in Plugins)](#plugins-terms)
7. [Context & Configuration](#context--configuration)
8. [Library Functionality](#library-functionality)
9. [API Reference](./tempo.api.md)
10. [Cookbook](./tempo.cookbook.md)

---

### Browser (Import Maps)

Tempo is an ESM-first library. You can use it in the browser without a build step using an `importmap`:

```html
<script type="importmap">
{
  "imports": {
    "@magmacomputing/tempo": "/path/to/tempo/dist/index.js"
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

> [!IMPORTANT]
> `Tempo` requires an environment with native `Temporal` support (Node.js 20+, modern browsers). 
> If your environment is older, you must provide your own polyfill.

### Build Target

Tempo is compiled to **ES2022**. This target supports modern JavaScript features like **Private Class Fields** (`#property`) while maintaining compatibility with the vast majority of modern browsers and Node.js environments (Node 20+).

### Polyfilling (if required)

If you need to support older environments, we recommend `@js-temporal/polyfill`:

```bash
npm install @js-temporal/polyfill
```

Then, import it at the very top of your application entry point:

```typescript
import '@js-temporal/polyfill';
```

### 💻 Node.js (Server-Side)

`Tempo` is a native ESM package. In Node.js (20+), simply import the class:

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
Tempo.init({
  event: {
    'birthday': '20 May',
    'tomorrow': function () { return this.toPlainDate().add({ days: 1 }) },
  }
});
```

- [Layout Patterns Guide](./tempo.layout.md): Details on creating custom parsing patterns and using relative units.

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
| `{wy}` | 4-digit ISO Date year | `2024` |
| `{yy}` | 2-digit year | `24` |
| `{mm}` | 2-digit month | `05` |
| `{mon}` | Full month name | `June` |
| `{mmm}` | 3-character month name | `Jun` |
| `{dd}` | 2-digit day | `20` |
| `{day}` | Day of month (numeric) | `20` |
| `{wkd}` | Full weekday name | `Monday` |
| `{www}` | 3-character weekday name | `Mon` |
| `{dow}` | Day of week (1-7) | `1` |
| `{ww}` | Week of year (1-53) | `21` |
| `{hh}` | Hour (0-24) | `14` |
| `{HH}` | Hour (0-12 with meridiem) | `02pm` |
| `{mi}` | 2-digit minutes | `05` |
| `{ss}` | 2-digit seconds | `05` |
| `{ms}` | 3-digit milliseconds | `005` |
| `{us}` | 3-digit microseconds | `000` |
| `{ns}` | 3-digit nanoseconds | `000` |
| `{ff}` | 9-digit fractional seconds | `005000000` |
| `{ts}` | Unix timestamp | `1716163200000` |
| `{term.name}` | Term value | eg. `{term.qtr}` returns the current quarter as Q1, Q2, Q3 or Q4 |

*(Note: `{wy}` represents the ISO week year, which may differ from `{yyyy}` at the start or end of a calendar year if the current date belongs to an ISO week from the adjacent year.)*

### ISO 8601 Week Dates

Tempo supports the **ISO 8601 Week Date** system, which is commonly used in business and logistics for unambiguous weekly scheduling.

- **`{ww}`**: Represents the ISO week number (01–53).
- **`{wy}`**: Represents the ISO week-numbering year.

A week in this system always starts on a **Monday**. Week 01 is defined as the week with the year's first Thursday (or the week containing January 4th).

To format a standard ISO week date (e.g., `2024-W21`), use both placeholders together:
```typescript
const t = new Tempo('2024-05-20');
t.format('{wy}-W{ww}');         // "2024-W21"
```

Example:
```typescript
const t = new Tempo();
t.format('{dd} {mon} {yyyy}');  // "24 January 2026"
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
import { TickerPlugin } from '@magmacomputing/tempo/plugins/ticker';

Tempo.extend(TickerPlugin);
```

> [!NOTE]
> **Selective Immobility**: When you extend Tempo, the core methods (like `format`, `add`, `set`) are protected. You can add NEW functionality, but you cannot overwrite the essential behavior of the library.

---

## Ticker (Optional Plugin)

`Tempo.ticker` creates a reactive stream of `Tempo` instances, making it easy to build clocks or countdowns. 
**Note**: This requires the `TickerPlugin` to be installed first.

```typescript
// Pattern: Async Generator
for await (const t of Tempo.ticker(1000)) {
  console.log(t.format('{hh}:{mi}:{ss}'));
}
```

See the [Tempo Ticker guide](./tempo.ticker.md) for full details and API signatures.

---

## Plugins (Terms)

`Tempo` can be extended with "terms" – plugins that calculate complex date ranges. These are accessible via the `t.term` getter.

Common terms include:
- `t.term.qtr`: Returns the current fiscal calendar quarter.
- `t.term.szn`: Returns the current meteorological season (North/South hemisphere-aware).

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
- *(...and several others. See [`tempo.default.ts`](./tempo.config.md#timezone-aliases) for the complete `TimeZone` registry.)*

Instances can also be created with specific options:
```typescript
new Tempo('2024-05-20', { timeZone: 'AEST', debug: true });
```

---

## Library Functionality

While Tempo is primarily a Date-Time engine, it relies on several robust custom utilities under the hood to handle data structures and persistence safely. 

These utilities are exported as public API methods for use within your own application logic.

- [Tempo Library Functionality](./tempo.library.md): An index of custom utilities built into Tempo, including robust **Enumerators** (`enumify`) and **Serialization** (`stringify`, `objectify`, `cloneify`).

---

## Refer to the [API Reference](./tempo.api.md) for a complete list of methods and properties, or browse the [Cookbook](./tempo.cookbook.md) for common usage patterns.
