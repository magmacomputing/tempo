# Custom Patterns

`Tempo` will create a Regular Expressions from **Layout** strings.  It will use these patterns to attempt to match and extract date-time values from an input-string.

## What is a Snippet?

A **Snippet** is a pre-defined regex pattern that can be combined with other snippets to create a **Layout**.

## What is a Layout?

A **Layout** is a string that combines pre-defined **Snippets** and strings. When you provide a layout to `Tempo`, it is translated into an anchored, case-insensitive Regular Expression used to match and extract date-time values.

## Available Snippets

Snippets are simple regex patterns that can be composed into a layout.  They represent specific date or time units:

| Snippet | Description | Regex Match (approx) |
| :--- | :--- | :--- |
| `{yy}` | Year (2 or 4 digits) | `([0-9]{2})?[0-9]{2}` |
| `{mm}` | Month (01-12, Jan-Dec, January-December) | `01-12` or names |
| `{dd}` | Day (01-31) | `01-31` |
| `{hh}` | Hour (00-24) | `00-24` |
| `{mi}` | Minute (prefixed by `:`) | `:[0-5][0-9]` |
| `{ss}` | Second (prefixed by `:`) | `:[0-5][0-9]` |
| `{ff}` | Fraction (prefixed by `.`) | `\.[0-9]{1,9}` |
| `{wkd}` | Weekday (Mon-Sun, Monday-Sunday) | Name strings |
| `{tzd}` | Time zone offset | `Z` or `±hh:mm` |
| `{mer}` | Meridiem (AM/PM) | `am` or `pm` |
| `{sep}` | Separator character | `/`, `-`, `.`, `,`, or ` ` |
| `{mod}` | Modifier and optional count | `+`, `-`, `<`, `>`, `next`, `prev`, etc. |
| `{nbr}` | Generic number (e.g., for counts) | `[0-9]*` |
| `{unt}` | Time units (year, month, week, etc.) | `year(s)`, `day(s)`, etc. |
| `{afx}` | Affix modifier | `ago` or `hence` |
| `{sfx}` | Time suffix | Matches `T` or a space followed by a time pattern |

### Composite Snippets

Some snippets are auto-built from others:

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
| `wkd` | `'{mod}?{wkd}{afx}?{sfx}?'` | Weekday name |
| `dtm` | `({dt}){sfx}?` | Calendar/event and clock/period |
| `dmy` | `{www}?{dd}{sep}?{mm}({sep}{yy})?{sfx}?` | Day-month(-year) |
| `mdy` | `{www}?{mm}{sep}?{dd}({sep}{yy})?{sfx}?` | Month-day(-year) |
| `ymd` | `{www}?{yy}{sep}?{mm}({sep}{dd})?{sfx}?` | Year-month(-day) |
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
`{mm}{sep}?{dd}{sep}?{yy}`  or `{dd}{sep}?{mm}{sep}?{yy}`
Either layout will match the string, as Tempo is timeZone-aware and will attempt to use whichever pattern returns a result.

## Using Custom Layouts

You can register custom layouts globally or use them just for a specific instance.

### Global Registration

Use `Tempo.init()` to add layouts that should be available to all new instances.
> [!NOTE]
> Assigning a 'name' to a Layout is optional and is auto-generated if not provided.
> It is used internally-only to identify the layout when parsing a string.

```typescript
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

// Using an array for a multiple layouts to match against a dateTime string
const t2 = new Tempo('Monday, 20 May 2024', { 
  layout: ['{wkd}{sep}?{dd}{sep}?{mm}{sep}?{yy}', '{dd}{sep}?{mm}{sep}?{yy}'] 
})
```

## Advanced: Regex Layouts

If the built-in snippets aren't enough, you can provide a raw Regular Expression or a mixture:

```typescript
const t = new Tempo('Year 2024 Day 20', { 
  layout: 'Year {yy}, Day {dd}' 
})
```

To aid in designing a new Layout, use the static `Tempo.regexp()` method.
It will return a Regular Expression that can be used to debug the layout against a string.

```typescript
let regex = Tempo.regexp('{yy}{sep}?{mm}{sep}?{dd}');
let match = regex.exec('20240520')?.groups;
// { yy: '2024', mm: '05', dd: '20' }
```

To aid in designing a new Snippet, use the static `Tempo.regexp()` method, with the snippet as the second argument.
```typescript
// first create Symbols for the snippet keys
const innerSym = Tempo.getSymbol('inner_test');
const outerSym = Tempo.getSymbol('outer_test');

// create the snippet
const snippet = {
  [innerSym]: /(?<inner>bar)/,
  [outerSym]: /(?<outer>foo{inner_test}baz)/,
}

// create the regex
let regex = Tempo.regexp('{outer_test}', snippet);
let match = regex.exec('foobarbaz')?.groups;
// { outer: 'foobarbaz', inner: 'bar' }
```

> [!NOTE]
> All layouts are automatically anchored with `^` and `$` and set to case-insensitive (`i`) when processed by the parsing engine.
