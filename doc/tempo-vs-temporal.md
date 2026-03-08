# 🆚 Tempo vs. Native Temporal

While `Temporal` provides an excellent, mathematically sound foundation for dates in JavaScript, it is designed to be highly explicit and strict. **Tempo** acts as a developer-friendly wrapper that eliminates boilerplate and makes common tasks effortless, while still giving you the rock-solid reliability of Temporal under the hood.

To enhance (not replace) Temporal's strictness, Tempo adds:
* flexibility (through its parsing engine and formatting outputs),
* convenience (through its many getters and methods),
* extensibility (through its dynamic options (layouts, events, periods)),
* business logic (through its plugin system (terms))

Here is a side-by-side comparison of how you achieve the same outcomes, as well as things Tempo can do that native Temporal cannot (without writing your own utility functions).

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
```javascript
const t = new Tempo();
const isWeekend = ['Sat','Sun'].includes(t.www) // true/false
or
const isWeekend = t.dow >= Tempo.WEEKDAY.Sat
or
const isWeekend = t.term.isWeekend (through plugins)

// Built-in complex terms via plugins
t.term.qtr; // returns calculated 'fiscal quarter' based on current instance (date and config.sphere) e.g., 'Q1'
t.term.szn;  // returns calculated 'season' based on current instance (date and config.sphere) e.g., 'Summer'

// Time since/until (native Temporal only returns Duration objects, not strings)
t.since('yesterday'); // "1 day ago"
```
