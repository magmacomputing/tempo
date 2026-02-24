# Custom Layout Patterns

`Tempo` uses a powerful, template-based parsing engine. While it comes with several built-in layouts for standard date and time formats, you can easily define your own to support custom string patterns.

## What is a Layout?

A **Layout** is a string that combines pre-defined **Snippets** and strings into a pattern. When you provide a layout to `Tempo`, it is translated into an anchored, case-insensitive Regular Expression used to match and extract date-time values.

## Available Snippets

Snippets are simple regex patterns that can be composed into a layout.  They represent specific date or time units:

| Snippet | Description | Regex Match (approx) |
| :--- | :--- | :--- |
| `{yy}` | Year (2 or 4 digits) | `(\d{2})?\d{2}` |
| `{mm}` | Month (01-12, Jan-Dec, January-December) | `01-12` or names |
| `{dd}` | Day (01-31) | `01-31` |
| `{hh}` | Hour (00-24) | `00-24` |
| `{mi}` | Minute (prefixed by `:`) | `:[0-5]\d` |
| `{ss}` | Second (prefixed by `:`) | `:[0-5]\d` |
| `{ff}` | Fraction (prefixed by `.`) | `\.\d{1,9}` |
| `{www}` | Weekday (Mon-Sun, Monday-Sunday) | Name strings |
| `{tzd}` | Time zone offset | `Z` or `±hh:mm` |
| `{mer}` | Meridiem (AM/PM) | `am` or `pm` |
| `{sep}` | Separator character | `/`, `-`, `.`, `,`, or ` ` |
| `{mod}` | Modifier and optional count | `+`, `-`, `<`, `>`, `next`, `prev`, etc. |
| `{nbr}` | Generic number (e.g., for counts) | `\d*` |
| `{unt}` | Time units (year, month, week, etc.) | `year(s)`, `day(s)`, etc. |
| `{afx}` | Affix modifier | `ago` or `hence` |
| `{sfx}` | Time suffix | Matches `T` or a space followed by a time pattern |

### Composite Snippets

Some snippets are built from others:

- `{evt}`: Matches any defined **Event** alias (e.g., `xmas`, `nye`).
- `{per}`: Matches any defined **Period** alias (e.g., `midnight`, `noon`).
- `{dt}`: Matches a date (e.g., `{dd}{sep}{mm}`) OR an event alias `{evt}`.
- `{tm}`: Matches a time (e.g., `{hh}{mi}`) OR a period alias `{per}`.

## Built-in Layouts

Snippets are wrapped in curly braces `{}` and can be combined to create a layout.

| Key | Layout | Description |
| :--- | :--- | :--- |
| `dt` | `{dt}` | Calendar or event |
| `tm` | `{tm}` | Clock or period |
| `wkd` | `{mod}?{www}{sfx}?` | Weekday name |
| `dtm` | `({dt}){sfx}?` | Calendar/event and clock/period |
| `dmy` | `{www}?{dd}{sep}?{mm}({sep}{yy})?{sfx}?` | Day-month(-year) |
| `mdy` | `{www}?{mm}{sep}?{dd}({sep}{yy})?{sfx}?` | Month-day(-year) |
| `ymd` | `{www}?{yy}{sep}?{mm}({sep}{dd})?{sfx}?` | Year-month(-day) |
| `rdt` | `yesterday`, `tomorrow`, `today` | Recent date |
| `unt` | `{nbr}{sep}?{unt}{sep}?{afx}` | Relative duration |
| `evt` | `{evt}` | Event only |
| `per` | `{per}` | Period only |

## Creating a Layout

To create a layout, arrange the snippets in the order they appear in your input string.

### Example: `YYYYMMDD`
If you have a string like `20240520`, your layout could be:
`{yy}{sep}?{mm}{sep}?{dd}`

### Example: `MMM-DD-YYYY`
For a string like `May-20-2024`, your layout could be:
`{mm}{sep}?{dd}{sep}?{yy}`

## Using Custom Layouts

You can register custom layouts globally or use them for a specific instance.

### Global Registration

Use `Tempo.init()` to add layouts that should be available to all new instances.
> [!NOTE]
> Assigning a 'name' to a Layout is optional and is auto-generated if not provided.
> It is used internally-only to identify the layout when parsing a string.

```typescript
import { Tempo } from '@magmacomputing/tempo';

Tempo.init({
  layout: {
    'myCustomFormat': '{dd}{sep}?{mm}{sep}?{yy}'
  }
});

const t = new Tempo('20-05-2024'); // Parsed using 'myCustomFormat'
```

### Instance-Specific Layout

Pass a layout directly to the `Tempo` constructor.

```typescript
// Using a string
const t1 = new Tempo('20240520', { layout: '{yy}{mm}{dd}' });

// Using an array for a multiple layouts to try against a dateTime string
const t2 = new Tempo('Monday, 20 May 2024', { 
  layout: ['{wkd}{sep}?{dd}{sep}?{mm}{sep}?{yy}', '{dd}{sep}?{mm}{sep}?{yy}'] 
});
```

## Advanced: Regex Layouts

If the built-in snippets aren't enough, you can provide a raw Regular Expression or a mixture:

```typescript
const t = new Tempo('Year 2024 Day 20', { 
  layout: 'Year {yy}, Day {dd}' 
});
```

> [!NOTE]
> All layouts are automatically anchored with `^` and `$` and set to case-insensitive (`i`) when processed by the parsing engine.
