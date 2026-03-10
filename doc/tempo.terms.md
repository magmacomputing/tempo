# Tempo Terms

## Overview

The **Terms** system is Tempo's extensible plugin mechanism for attaching business-logic to a date-time instance, without adding to the _profile_ (memory footprint) of a `Tempo` object.

Because a `Tempo` instance is designed to be as lean as possible, `term` properties are **lazy-loaded**: their lookup function is not executed until the property is first accessed.  
Once evaluated, the result is memoised — subsequent reads of the same property return the cached value directly, with no further computation.

```
new Tempo('25-Dec-2024').term.season     // ← computed on first access, cached thereafter
```

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

A term plugin is a TypeScript module that exports four named members and follows a simple contract.

### Plugin shape

```ts
import { getTermRange, type Range } from 'tempo/plugins/term.utils';
import type { Tempo } from 'tempo';

/** 1. The range boundaries (static — defined once at import time) */
const ranges = [
  { key: 'Low',  month: 1 },
  { key: 'Mid',  month: 5 },
  { key: 'High', month: 9 },
] as Range[];

/** 2. Short identifier used as the property name on `tempo.term` */
export const key = 'rng';

/** 3. Long name used as the scope property name on `tempo.term` */
export const scope = 'range';

/** 4. Human-readable description (surfaced via Tempo.terms) */
export const description = 'Custom seasonal range';

/**
 * 5. The lookup function.
 *    - `this` is bound to the Tempo instance at call time.
 *    - `keyOnly = true`  → called when accessing `tempo.term.<key>`   → return the key string
 *    - `keyOnly = false` → called when accessing `tempo.term.<scope>` → return the full range object
 */
export function define(this: Tempo, keyOnly?: boolean) {
  return getTermRange(this, ranges, keyOnly);
}
```

### `Range` fields

A `Range` object must include a `key` and any subset of the date-time fields below.  
`getTermRange` sorts ranges in descending chronological order and returns the **first range whose boundary the instance has reached or passed**.

```ts
type Range = {
  key: PropertyKey;   // identifier returned when keyOnly = true
  year?:   number;
  month?:  number;
  day?:    number;
  hour?:   number;
  minute?: number;
  second?: number;
  [extra: PropertyKey]: any;  // any additional metadata fields
}
```

### Registering the plugin

To make your plugin persist within the library, add it to `tempo.config/plugins/term.import.ts` within the `registerTerms` function:

```ts
import * as rng from './term.myrange.js';

export default function registerTerms() {
  return [
    // ... existing plugins ...
    { key: rng.key, scope: rng.scope, description: rng.description, define: rng.define },
  ]
}
```

Be aware that the above will only make your plugin available after Tempo has been initialized. See `Tempo.init()`.
If you want it to also be available dynamically, you will need to register it at runtime using the static `Tempo.addTerm` method. See `On-the-fly registration` below.

### On-the-fly registration

You can also register a term plugin dynamically at runtime using the static `Tempo.addTerm` method. This is useful for ad-hoc business logic that doesn't need to be part of the core library configuration.

```ts
Tempo.addTerm({
  key: 'era',
  scope: 'era',
  description: 'Historical Era',
  define: function(this: Tempo, keyOnly?: boolean) {
    return this.yy < 1000 ? 'Ancient' : this.yy < 1900 ? 'Medieval' : 'Modern';
  }
});
```

Every `Tempo` instance created after that point will have the dynamic term available.

### Using Custom Configuration in Terms

Since `Tempo` preserves non-standard configuration options in its internal `config` object, you can use `Tempo.init()` to provide values that your custom term plugins can later reference.

```ts
// 1. Initialize with a custom 'business' config option
Tempo.init({ 
  fiscalYearStart: 7 // e.g., July
});

// 2. Define a term that uses this custom option
Tempo.addTerm({
  key: 'cfy',
  scope: 'fiscal',
  description: 'Custom Fiscal Year',
  define: function(this: Tempo, keyOnly?: boolean) {
    const startMonth = this.config.fiscalYearStart ?? 1;
    const isPastStart = this.mm >= startMonth;
    const year = isPastStart ? this.yy : this.yy - 1;
    
    return keyOnly ? `FY${year}` : { key: `FY${year}`, year, startMonth };
  }
});

const t = new Tempo('2025-02-15');
console.log(t.term.fys); // → "FY2024" (because it's before July 2025)
```
