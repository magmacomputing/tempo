# 🆚 Tempo vs. Native Temporal

While `Temporal` provides an excellent, mathematically sound foundation for dates in JavaScript, it is designed to be highly explicit and strict. **Tempo** acts as a developer-friendly wrapper that eliminates boilerplate and makes common tasks effortless, while still giving you the rock-solid reliability of Temporal under the hood.

To enhance (not replace) Temporal's strictness, Tempo adds:
* flexibility (through its parsing engine and output formatting),
* convenience (through its many getters and methods),
* extensibility (through its dynamic options (events, periods)),
* business logic (through its lazy-loaded   plugin system (terms))

Here is a side-by-side comparison of how you achieve the same outcomes, as well as things Tempo can do that native Temporal cannot easily.

### 1. Parsing: Strict vs. Flexible

Temporal only accepts strict ISO 8601 strings. If you have user input, database dumps, or human-readable dates, you have to write your own parser first. Tempo handles it out-of-the-box.

**Native Temporal ❌**
```javascript
// Throws RangeError: invalid ISO 8601 string
Temporal.PlainDate.from('2026/01/24'); 
// Throws RangeError
Temporal.PlainDate.from('next Friday');
```

**Tempo ✅**
```javascript
// Parses perfectly
new Tempo('2026/01/24'); 
// Parses relative natural language perfectly
new Tempo('next Friday');
```

### 2. Formatting: Verbose vs. Simple Tokens

Temporal relies on the `Intl.DateTimeFormat` API for formatting. While powerful for localization, it is incredibly verbose for simple, specific string outputs.

**Native Temporal 🐢**
```javascript
const date = Temporal.Now.plainDateISO();
// Output: "24 Jan 2026"
date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
```

**Tempo 🚀**
```javascript
const t = new Tempo();
// Output: "24 Jan 2026"
t.format('{dd} {mmm} {yyyy}');
// Pre-built getters for common formats
t.fmt.date; // "2026-01-24"
```

### 3. Business Logic & Complex Terms

Native Temporal deals with standard calendar units (days, months, years). Tempo extends this with business-aware concepts, relative querying, and rich getters.

**Native Temporal 🐢**
```javascript
const date = Temporal.Now.plainDateISO();
// To find if it's a weekend, you need:
const isWeekend = date.dayOfWeek === 6 || date.dayOfWeek === 7;

// To find the fiscal/calendar quarter... write your own math logic
```

**Tempo 🚀**
This is a perfect example of where Tempo adds business logic (something that Temporal does not do).
To add a 'term' that defines 'isWeekend' to Tempo, you would write a plugin that defines the term.  
From that point, the plugin is available to new Tempo instances.

See the section on [plugins](tempo.terms.md) for more information.


```typescript
const t = new Tempo();
const isWeekend = t.term.isWeekend (through plugins)

// Built-in complex terms via plugins
t.term.qtr; // returns calculated 'fiscal quarter' based on current instance (date and hemisphere) e.g., 'Q1'
t.term.szn; // returns calculated 'season' based on current instance (date and hemisphere) e.g., 'Summer'

// Time since/until (native Temporal only returns Duration objects, not strings)

t.until('3pm','minutes'); // 5.046264992345"
t.until('xmas', 'days'); // "289.58470466349036"
t.until('xmas'); // if not 'unit' provided, then duration object "{years:0, months:9, ..., iso: 'P9M14DT14H1M0.656862748S'}"

t.since('yesterday', 'days'); // unit-argument determines granularity "1d ago"
t.since('yesterday afternoon'); //  if no 'unit' provided, then duration string "-P1DT9H32M19.402536059S"
```