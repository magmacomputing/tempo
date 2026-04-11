# Tempo Terms

## Overview

The **Terms** system is Tempo's extensible plugin mechanism for attaching business-logic to a date-time instance, without adding to the _profile_ (memory footprint) of a `Tempo` object.

Because a `Tempo` instance is designed to be as lean as possible, `term` properties are **lazy-loaded**: their lookup function is not executed until the property is first accessed.  
Once evaluated, the result is memoised — subsequent reads of the same property return the cached value directly, with no further computation.

```
new Tempo('25-Dec-2024').term.season     // ← computed on first access, cached thereafter
```

> [!TIP]
> **Transparent Discovery**: As of **v2.0.1**, all term properties are **enumerable**. This means a single `console.log(t.term)` will trigger the eager evaluation of *every* registered term at once—providing a full snapshot of the instance's grammar state. To prevent terminal noise during these full-eval events (e.g. for invalid dates), initialize Tempo with **`silent: true`**.

---

## What a Term Does

A term plugin answers a single question:

> *"Where does this `Tempo` instance sit within a pre-defined date-time range?"*

Each plugin holds a static list of **range boundaries** (e.g. the start of each meteorological season) and a **`define` function** that is called — with the `Tempo` instance as its `this` context — to determine into which boundary the instance falls.

Plugins expose two views of that result via the `Tempo.term` object:

| Property | Returns |
|---|---|
| `tempo.term.<key>` | A short identifier string (e.g. `'qtr'`, `'szn'`, `'zdc'`) |
| `tempo.term.<scope>` | The full matching range object, with all metadata fields (e.g. `key`, `day`, `month`, `year`, `sphere`, etc.) |
The `<key>` and `<scope>` are defined by the plugin author, where the intent of the `<key>` is to provide a short identifier value, and the intent of the `<scope>` is to provide the full matching range object.
---

## Provided Plugins

### `qtr` / `quarter` — Fiscal Quarters

Divides the calendar year into four fiscal quarters.  
Hemisphere-aware: southern-hemisphere configs shift the quarter boundaries by six months.

```ts
const t = new Tempo('15-Feb-2025');

t.term.qtr      // → 'Q1'
t.term.quarter  // → { key: 'Q1', day: 1, month: 1, fiscal: 2025, sphere: 'North' }
```

```ts
const t = new Tempo('15-Feb-2025', { sphere: 'south' });

t.term.qtr      // → 'Q3'  (southern hemisphere)
```

---

### `szn` / `season` — Meteorological Seasons

Maps the current date to the appropriate meteorological season.  
Hemisphere-aware (northern / southern boundaries differ), and the full `season` scope additionally includes the corresponding **Chinese season** for the date.

```ts
const t = new Tempo('01-Jul-2025');

t.term.szn      // → 'Winter'  (northern hemisphere)
t.term.season
// → { key: 'Winter', day: 22, month: 12, symbol: 'Snowflake', sphere: 'North', CN: { key: 'Summer', ... } }
```

```ts
const t = new Tempo('01-Jul-2025', { sphere: 'south' });

t.term.szn      // → 'Winter'  (southern hemisphere, different boundary dates)
```

---

### `zdc` / `zodiac` — Astrological Zodiac

Determines the Western astrological sign for the date.  
The full `zodiac` scope also includes the **Chinese zodiac** (animal, element, Yin/Yang) derived from the year.

```ts
const t = new Tempo('14-Mar-2025');

t.term.zdc      // → 'Pisces'
t.term.zodiac
// → { key: 'Pisces', day: 19, month: 2, symbol: 'Fish', longitude: 330, planet: 'Neptune',
//     CN: { animal: 'Snake', traits: 'Wise, intuitive', element: 'Wood', yinYang: 'Yin' } }
```

---

### `per` / `period` — Daily Time Periods

Classifies the time of day into a named period based on a pre-defined range.

| Key | Starts at |
|---|---|
| `midnight` | 00:00 |
| `early` | 04:00 |
| `morning` | 08:00 |
| `midmorning` | 10:00 |
| `midday` | 12:00 |
| `afternoon` | 15:30 |
| `evening` | 18:00 |
| `night` | 20:00 |

```ts
const t = new Tempo('1pm');

t.term.per      // → 'midday'
t.term.period   // → { key: 'midday', hour: 12 }
```

---

## Inspecting Registered Terms

The static `Tempo.terms` getter returns a read-only list of all registered plugins:

```ts
Tempo.terms
// → [
//     { key: 'qtr', scope: 'quarter',  description: 'Fiscal Quarter' },
//     { key: 'szn', scope: 'season',   description: 'Meteorological season' },
//     { key: 'zdc', scope: 'zodiac',   description: 'Astrological Zodiac sign' },
//     { key: 'per', scope: 'period',   description: 'Daily time period' },
//   ]
```

---

## How to Define a Term Plugin

A term plugin is ideally created using the **`defineTerm`** factory function provided by the library. This ensures correct type-inference and automatically handles registration during the discovery phase.

### Plugin Definition

```ts
import { defineTerm, defineRange, getTermRange, type Range } from '@magmacomputing/tempo/plugins';
import { enums, type Tempo } from '@magmacomputing/tempo';

/** 1. The range boundaries (flattened and self-documenting) */
const { ranges, groups } = defineRange([
  { key: 'Spring', month: 3,  group: 'season', sphere: enums.COMPASS.North },
  { key: 'Summer', month: 6,  group: 'season', sphere: enums.COMPASS.North },
  { key: 'Autumn', month: 9,  group: 'season', sphere: enums.COMPASS.North },
  { key: 'Winter', month: 12, group: 'season', sphere: enums.COMPASS.North },
  
  { key: 'Dry',    month: 1,  group: 'tropical' },
  { key: 'Wet',    month: 5,  group: 'tropical' },
], 'group', 'sphere');

/** 2. The Plugin Object */
export const MySeasonTerm = defineTerm({
    key: 'szn',
    scope: 'season',
    description: 'Custom seasonal range',
    ranges,

    /**
     * 3. The lookup function.
     *    - `this` is bound to the Tempo instance at call time.
     *    - `keyOnly = true`  → return the key string
     *    - `keyOnly = false` → return the full range object
     */
    define(this: Tempo, keyOnly?: boolean) {
      // Use pre-grouped results for instantaneous lookup!
      const list = groups[`season.${this.config.sphere}`] ?? [];

      return getTermRange(this, list, keyOnly);
    }
});
```

### `Range` fields

A `Range` object must include a `key` and any subset of the date-time fields below.  
`getTermRange` sorts ranges in descending chronological order and returns the **first range whose boundary the instance has reached or passed**.

```ts
type Range = {
  key: PropertyKey;                // identifier returned when keyOnly = true
  year?:   number;
  month?:  number;
  day?:    number;
  hour?:   number;
  minute?: number;
  second?: number;
  group?:  string;                 // categorization marker (e.g. 'fiscal', 'western')
  [extra: PropertyKey]: any;       // any additional term-dependent metadata (e.g. 'sphere')
}
```

### Registering the plugin

Use the static **`Tempo.extend()`** (or `Tempo.addTerm()`) method. This allows you to add terms dynamically without modifying the library source.

```ts
import { Tempo } from '@magmacomputing/tempo';
import { MySeasonTerm } from './term.myseason.js';

// Register the term plugin
Tempo.extend(MySeasonTerm);
```

Every `Tempo` instance created after that point will have the custom term available.

### Using Custom Configuration in Terms

Since `Tempo` preserves non-standard configuration options in its internal `config` object, you can use `Tempo.init()` to provide values that your custom term plugins can later reference.

```ts
// 1. Initialize with a custom 'business' config option
Tempo.init({ 
  fiscalYearStart: 7 // e.g., July
});

// 2. Define a term that uses this custom option
Tempo.extend({
  key: 'cfy',
  scope: 'fiscal',
  description: 'Custom Fiscal Year',
  define: function(this: Tempo, keyOnly?: boolean) {
    const startMonth = this.config.fiscalYearStart ?? 1;
    const isPastStart = this.mm >= startMonth;
    const year = `FY${this.yy - Number(!isPastStart)}`;
    
    return keyOnly
      ? year
      : { key: year, year, startMonth };
  }
});

const t = new Tempo('2025-02-15');
console.log(t.term.cfy); // → "FY2024" (because it's before July 2025)
```

---

## 🧭 Writing Math-Aware Terms

To unlock Tempo's advanced **Term Traversal** (e.g., `t.add({ '#quarter': 1 })`) and **Ticker Syncing**, a plugin must provide semantic **boundaries** (`start` and `end`). 

### The `getTermRange` Helper
The library provides a specialized helper that calculates these boundaries automatically based on your `ranges` array.

```ts
import { getTermRange } from '@magmacomputing/tempo/plugins';

export function define(this: Tempo, keyOnly?: boolean) {
  // Finds the current range, then injects 'start' and 'end' (as Tempo instances)
  // into the result object before returning it to the user.
  return getTermRange(this, ranges, keyOnly);
}
```

### Manual Boundaries
If you choose not to use `getTermRange`, you must manually include `start` and `end` (as `Tempo` instances) in your scope object:

```ts
return keyOnly ? 'MyTerm' : {
  key: 'MyTerm',
  start: this.set({ hour: 0 }),
  end: this.set({ hour: 23, mi: 59 })
};
```

---

## 🕒 Terms in Tickers
Any term that provides `start` and `end` boundaries can be used to drive a `Tempo.ticker`. This is ideal for logic that doesn't follow a fixed duration (like seasons or fiscal quarters).

```ts
// Pulse every time a new fiscal quarter begins
await using quarterly = Tempo.ticker({ '#quarter': 1 });

for await (const t of quarterly) {
  console.log(`Pulsing at Quarter Start: ${t.format('{yyyy}-{#qtr}')}`);
}
```

---

## 🛠️ Developer Guide: Best Practices

To ensure a custom `Term` plugin integrates fully with Tempo, follow these guidelines:

1.  **Static `ranges` Export**: Always include the `ranges` property in your `defineTerm` configuration. This enables **programmatic discovery** via `Tempo.terms` and allows the Ticker to automatically calculate next-pulse intervals.
2.  **Metadata-First Boundaries**: If your plugin handles multiple sets (e.g. hemispheres or cultural calendars), avoid using array indices like `ranges[0]`. Instead, add marker fields like **`sphere`** or **`group`** to each range object and use `.filter()` inside your `define` function.
3.  **Memoization Safety**: Keep the `define` function pure. It will only be called once per instance access.
4.  **Math Readiness**: Always use `getTermRange` or provide boundaries. Without them, users cannot use your term in `add()`, `set()`, or `ticker()`.
5.  **Key consistency**: Ensure the `key` property you return in the `define` function's scope object matches the `key` definition of your plugin.

---

## 🧭 Best Practices: Idempotency & Side-Effects

> [!IMPORTANT]
> Because term lookups are **memoized** (cached) on the instance, the `define` function must be **pure and idempotent**. It should only depend on the current `Tempo` instance state and its configuration (`this.config`).
>
> **Never apply side-effects** or modify external state within a term definition. The function is only guaranteed to run once per instance access; subsequent reads will return the cached value directly without re-executing your logic.
