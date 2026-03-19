# Layout Patterns Guide

Tempo's parsing engine is driven by regular expression patterns and named capture-groups. By understanding and extending these layouts, you can teach Tempo to understand entirely new terminology, formats, and relative units.

## Default Patterns

Tempo comes out-of-the-box with patterns to understand:
- **ISO 8601** (`2024-05-20T10:00:00Z`)
- **Dates** (`20-May`, `May 20`, `04/01/2026`)
- **Times** (`10am`, `14:30:00.123`)
- **Relative Events** (`today`, `tomorrow`, `yesterday`)
- **Relative Periods** (`morning`, `noon`, `afternoon`)

## Customizing Layouts

You can supply your own parsing tokens to Tempo globally via `Tempo.init()` or locally per-instance.

```typescript
Tempo.init({
  event: {
    'birthday': '20 May',
    'xmas': '25 Dec'
  }
});

const t = new Tempo('xmas'); // resolves to 25 Dec of the current year
```

## Advanced Capture Groups

When delving into Tempo's internal Regex patterns, the following named capture groups are utilized by the engine:
- `yy`, `mm`, `dd`: Year, Month, Day digits
- `hh`, `mi`, `ss`, `ff`: Hour, Minute, Second, Fractional digits
- `mer`: Meridiem (`am`, `pm`)
- `evt`: Event string offset
- `per`: Period string offset
- `unt`: Relative unit (e.g., `days`, `weeks`)
- `mod`, `nbr`, `afx`, `sfx`: Modifiers, numbers, affixes, and suffixes for relative computations (e.g. `2 days ago`, `next Friday`)

---

## Need a Custom Layout?

Tempo's layout engine can interpret almost any date or time imaginable, but crafting robust regular expressions with strict named capture-groups requires precision. 

If your project involves specialized terminology, complex financial calendars, medical intervals, or legacy application log formats, the **Magma Computing** team offers professional services to design, build, and comprehensively test custom `Tempo` Layouts optimized precisely for your business needs. 

Contact us at [Magma Computing](https://github.com/magmacomputing) to discuss extending Tempo for your organization.
