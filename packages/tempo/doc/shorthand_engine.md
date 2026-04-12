# Tempo Shorthand Engine

The Tempo Shorthand Engine provides a powerful, namespace-based syntax for resolving complex date/time ranges (Terms) such as fiscal quarters, daily periods, and zodiac signs.

## Syntax Overview

Shorthand follows the pattern: `#namespace.range`

- **Namespace**: The registered key of a Term Plugin (e.g., `qtr`, `period`, `zodiac`).
- **Range**: A specific range defined by that plugin (e.g., `q1`, `morning`, `aries`).

> [!IMPORTANT]
> Shorthand literals are **not** supported in the `Tempo` constructor. They are resolved relative to an existing instance and must be used via mutation methods (`.set()`, `.add()`) or the Ticker.


## Usage Patterns

### 1. Absolute Resolution (`.set()`)
Use shorthand with `.set()` to align the instance to the beginning of a specific range.

```typescript
// Resolve to the start of the current year's Aries
t.set('#zodiac.aries');			// e.g. 2026-03-21T00:00:00

// Resolve to the start of the current night
t.set('#period.night');			// e.g. 2026-06-01T20:00:00
```

### 2. Targeted Shifting (`.add()`)
Providing a shorthand string to `.add()` moves the instance to the beginning of the **next** occurrence of that specific range.

```typescript
// Move to the next Q1 (searching forward from current time)
t.add('#qtr.q1');						// Jump to next Jan 1st
```

### 3. Step Shifting (`.add()`)
Providing an object to `.add()` allows shifting by a specific number of "slots" or "steps" within the term's cycle.

```typescript
// SHORTHAND: Move two mornings ahead
t.add({ '#period.morning': 2 });	// 2026-06-03T08:00:00

// DESCRIPTIVE: Move one quarter ahead (relative to current position)
t.add({ '#quarter': 1 });					// Q1 -> Q2, or Q2 -> Q3
```

> [!TIP]
> **Step Shifting** with an integer value (e.g. `{ '#quarter': 1 }`) is the standard way to create recurring intervals in a **Ticker**.


## Advanced Behaviors

### Cycle Identity Preservation
The engine is "context-aware" across boundaries. When shifting by term, Tempo maintains the identity of the current state:
- If you are in **Q2 2026** and shift by `+1` Quarter, it resolves to **Q3 2026**.
- If you are in **morning** of Jan 1st and shift by `+1` Period, it resolves to the next registered period (e.g., `midmorning`).

### Multi-Day & Multi-Year Resolution
Terms automatically resolve across logical boundaries:
- **Daily Cycles**: (e.g., `#period`) resolve within a 3-day window (`yesterday`, `today`, `tomorrow`) to ensure smooth transit across midnight.
- **Yearly Cycles**: (e.g., `#qtr`, `#zodiac`) resolve within a 3-year window to handle boundary-crossing ranges (like North vs South fiscal years).

## Best Practices
- **Sphere Locking**: When working with hemisphere-dependent terms (like Quarters), ensure your Tempo instance has an explicit `sphere` config (`north` or `south`) for deterministic results.
- **Error Handling**: Use `{ catch: true }` in your Tempo config if you want to gracefully handle unknown shorthand without throwing.

```typescript
const t = new Tempo('now', { catch: true });
const res = t.set('#invalid.term');
if (!res.isValid) { 
	// handle resolution failure
}
```
