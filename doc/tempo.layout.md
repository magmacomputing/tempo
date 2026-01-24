# Custom Layout Patterns

`Tempo` uses a powerful, template-based parsing engine. While it comes with several built-in layouts for standard date and time formats, you can easily define your own to support custom string patterns.

## What is a Layout?

A **Layout** is a string or array of strings that combines pre-defined **Components** (placeholders) into a pattern. When you provide a layout to `Tempo`, it is translated into an anchored, case-insensitive Regular Expression used to match and extract date-time values.

## Available Components

Components are placeholders wrapped in curly braces `{}`. They represent specific date or time units:

| Component | Description | Regex Match (approx) |
| :--- | :--- | :--- |
| `{yy}` | Year (2 or 4 digits) | `(\d{2})?\d{2}` |
| `{mm}` | Month (01-12, Jan-Dec, January-December) | `01-12` or names |
| `{dd}` | Day (01-31) | `01-31` |
| `{hh}` | Hour (00-24) | `00-24` |
| `{mi}` | Minute (prefixed by `:`) | `:[0-5]\d` |
| `{ss}` | Second (prefixed by `:`) | `:[0-5]\d` |
| `{ff}` | Fraction (prefixed by `.`) | `\.\d{1,9}` |
| `{www}` | Weekday (Mon-Sun, Monday-Sunday) | Name strings |
| `{mer}` | Meridiem (AM/PM) | `am` or `pm` |
| `{sep}` | Separator character | `/`, `-`, `.`, `,`, or ` ` |
| `{mod}` | Modifier and optional count | `+`, `-`, `<`, `>`, `next`, `prev`, etc. |
| `{sfx}` | Time suffix | Matches `T` or a space followed by a time pattern |

### Composite Components

Some components are built from others:

- `{evt}`: Matches any defined **Event** alias (e.g., `xmas`, `nye`).
- `{per}`: Matches any defined **Period** alias (e.g., `midnight`, `noon`).
- `{dt}`: Matches a date (e.g., `{dd}{sep}{mm}`) OR an event alias `{evt}`.
- `{tm}`: Matches a time (e.g., `{hh}{mi}`) OR a period alias `{per}`.

## Built-in Layouts
| Key | Layout | Description |
| :--- | :--- | :--- |
| `dt` | `{dt}` | Calendar or event |
| `tm` | `{tm}` | Clock or period |
| `www` | `{mod}?{www}{sfx}?` | Weekday name |
| `dtm` | `({dt}){sfx}?` | Calendar/event and clock/period |
| `dmy` | `{www}?{dd}{sep}?{mm}({sep}{yy})?{sfx}?` | Day-month(-year) |
| `mdy` | `{www}?{mm}{sep}?{dd}({sep}{yy})?{sfx}?` | Month-day(-year) |
| `ymd` | `{www}?{yy}{sep}?{mm}({sep}{dd})?{sfx}?` | Year-month(-day) |
| `evt` | `{evt}` | Event only |
| `per` | `{per}` | Period only |

## Creating a Layout

To create a layout, arrange the components in the order they appear in your input string.

### Example: `YYYYMMDD`
If you have a string like `20240520`, your layout would be:
`{yy}{mm}{dd}`

### Example: `MMM-DD-YYYY`
For a string like `May-20-2024`, use:
`{mm}{sep}{dd}{sep}{yy}`

## Using Custom Layouts

You can register custom layouts globally or use them for a specific instance.

### Global Registration

Use `Tempo.init()` to add layouts that should be available to all new instances.

```typescript
import { Tempo } from '@magma/tempo';

Tempo.init({
  layout: {
    'myCustomFormat': '{dd}{sep}{mm}{sep}{yy}'
  }
});

const t = new Tempo('20-05-2024'); // Parsed using 'myCustomFormat'
```

### Instance-Specific Layout

Pass a layout directly to the `Tempo` constructor.

```typescript
// Using a string
const t1 = new Tempo('20240520', { layout: '{yy}{mm}{dd}' });

// Using an array for a complex layout
const t2 = new Tempo('Monday, 20 May 2024', { 
  layout: ['{www}', '{sep}', ' ', '{dd}', ' ', '{mm}', ' ', '{yy}'] 
});
```

## Advanced: Regex Layouts

If the built-in components aren't enough, you can provide a raw Regular Expression or a mixture:

```typescript
const t = new Tempo('Year 2024 Day 20', { 
  layout: [/Year /, '{yy}', / Day /, '{dd}'] 
});
```

> [!NOTE]
> All layouts are automatically anchored with `^` and `$` and set to case-insensitive (`i`) when processed by the parsing engine.
