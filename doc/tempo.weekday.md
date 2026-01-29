# Weekday Parsing

Tempo provides a flexible way to parse Weekday inputs, allowing you to specify dates relative to the current day or a specific base date. This is particularly useful for phrases like "next Monday" or "3 Wednesdays ago".

## Supported Formats

Weekday inputs typically consist of a **modifier** (optional), a **count** (optional), and the **Weekday name**.

### 1. Simple Weekday Names
You can provide the short or long name of a Weekday.
- `Mon`, `Monday`
- `Wed`, `Wednesday`
- `Sun`, `Sunday`

When no modifier is provided, Tempo defaults to the Weekday in the **current week**.

### 2. Symbolic Modifiers
Symbols can be used to indicate relative weeks or specific directions in time.

| Modifier | Meaning | Example | Results in... |
| :--- | :--- | :--- | :--- |
| `+` | Next week | `+Mon` | Monday of next week |
| `-` | Previous week | `-Tue` | Tuesday of last week |
| `<=` | Prior to | `<=Wed` | The Wednesday immediately preceding (or equal to) today |
| `<` | Prior to (strict) | `<Thu` | The Thursday strictly before today |
| `>=` | Subsequent to | `>=Fri` | The Friday immediately following (or equal to) today |
| `>` | Subsequent to (strict) | `>Sat` | The Saturday strictly after today |

### 3. Keyword Modifiers
Keywords can be used for more natural language-like inputs.

| Keyword | Meaning | Example |
| :--- | :--- | :--- |
| `this` | Current week | `this Wed` |
| `next` | Next week | `next Monday` |
| `prev` | Previous week | `prev Fri` |
| `last` | Last week | `last Sunday` |

### 4. Indexed Modifiers
You can specify a number of weeks to jump by adding a digit before or after the modifier.
- `-3Wed`: Three Wednesdays ago
- `+2Mon`: Two Mondays from now

## Time Suffixes
You can append time information to a Weekday string. Tempo will parse the Weekday first and then apply the time to that specific date.

- `Mon 10:00am`
- `Friday noon`
- `Wed 15:30:00`

## How it Works
1. **Normalization**: Weekday names are normalized to their 3-letter proper-case prefix (e.g., `monday` -> `Mon`).
2. **Anchor**: If no time-zone or base date is provided, Tempo uses "now" as the anchor.
3. **Calculation**: The modifier and count determine the number of weeks to add or subtract from the anchor date to find the target Weekday.
4. **Constraint**: If time components are provided, they are set on the calculated date. Otherwise, the time defaults to `00:00:00` if it's the first parsing pass.
