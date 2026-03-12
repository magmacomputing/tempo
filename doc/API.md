# Tempo API Reference

This document provides a comprehensive technical reference for the `Tempo` class, including static methods, properties, and instance API.

---

## 🏗️ Static Entrypoints

### `Tempo.init(options?: Tempo.Options)`
Initializes the global default configuration for all subsequent `Tempo` instances.
- **Returns:** `Tempo.Config` (The resolved global config).
- **Note:** Settings are inherited from library defaults, persistent storage, and provided options.

### `Tempo.from(tempo?: Tempo.DateTime | Tempo.Options, options?: Tempo.Options)`
Creates a new `Tempo` instance. A static alternative to `new Tempo()`.
- **Returns:** `Tempo`

### `Tempo.compare(tempo1, tempo2?)`
Compares two `Tempo` instances or date-time values for sorting.
- **Returns:** `-1` (smaller), `0` (equal), or `1` (larger).

### `Tempo.addTerm(...plugins: Tempo.TermPlugin[])`
Registers new term plugins globally.

### `Tempo.now()`
Returns the current Unix epoch in nanoseconds as a `BigInt`.

### `Tempo.getSymbol(key?: string | symbol)`
Retrieves or registers a `Symbol` for internal token mapping.

### `Tempo.regexp(layout, snippet?)`
Translates a Tempo layout string into a compiled `RegExp`.

---

## ⚙️ Static Properties

### `Tempo.config`
Returns the current *global* configuration settings.

### `Tempo.default`
Returns the *initial* out-of-the-box library defaults.

### `Tempo.terms`
Returns an array of all currently registered term plugins.

### `Tempo.parse`
Returns the global parsing rules registry (snippets, layouts, events, etc.).

### `Tempo.properties`
Returns a list of all public static accessor names on the `Tempo` class.

### 🔢 Static Enumerators
Access to the internal dictionaries used by Tempo:
- `WEEKDAY` | `WEEKDAYS`
- `MONTH` | `MONTHS`
- `SEASON` | `COMPASS`
- `DURATION` | `DURATIONS`
- `ELEMENT` (Units map)
- `FORMAT` (Registry of pre-defined formats)
- `LIMIT` (Useful boundary dates)

---

## 🚀 Instance Entrypoints

### `tempo.add(mutate: Tempo.Add)`
Returns a **new** `Tempo` instance with the specified duration added.
- **Example:** `t.add({ days: 2 })`

### `tempo.set(offsets: Tempo.Set | Tempo.Add)`
Returns a **new** `Tempo` instance with specific values or relative alignments.
- **Example:** `t.set({ month: 5, hh: 12 })` or `t.set({ start: 'month' })`

### `tempo.format(fmt: string)`
Returns a formatted string or number based on the provided token or named format.

### `tempo.until(until, opts?)`
Calculates the duration until another date-time.
- **Returns:** `number` (if a unit is provided) or a `Tempo.Duration` object.

### `tempo.since(since, opts?)`
Returns a human-readable relative time string (e.g., "3 days ago").

### `tempo.isValid()`
Returns `true` if the instance represents a valid date-time.

### `tempo.toString()`
Returns the ISO 8601 string representation.

### `tempo.toDate()`
Returns a standard JavaScript `Date` object.

### `tempo.toDateTime()`
Returns the underlying `Temporal.ZonedDateTime` object.

### `tempo.toInstant()`
Returns the underlying `Temporal.Instant` object.

---

## 🔍 Instance Properties

### Date & Time Accessors
- `yy`: 4-digit year.
- `wy`: 4-digit ISO week-numbering year.
- `mm`: Month (1-12).
- `dd`: Day of month (1-31).
- `ww`: ISO week number (1-53).
- `hh`: Hour (0-23).
- `mi`: Minutes (0-59).
- `ss`: Seconds (0-59).
- `ms`: Milliseconds (0-999).
- `us`: Microseconds (0-999).
- `ns`: Nanoseconds (0-999).
- `ff`: Fractional seconds (decimal).

### Localization & Context
- `tz`: IANA Time Zone ID.
- `ts`: Unix timestamp (based on `config.timeStamp`).
- `mmm` / `mon`: Short/Full Month name.
- `www` / `wkd`: Short/Full Weekday name.
- `dow`: Day of week number (Mon=1, Sun=7).

### Lineage & Metadata
- `nano`: Epoch nanoseconds (`BigInt`).
- `epoch`: Object containing `ss`, `ms`, `us`, `ns` epoch values.
- `term`: Object containing results from all active term plugins.
- `fmt`: Registry of pre-calculated strings for all standard formats.
- `config`: The effective configuration for this specific instance.
- `parse`: The parsing rules and lineage for this instance.
