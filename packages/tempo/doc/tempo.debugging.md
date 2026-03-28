# Tempo Debugging & Introspection

Because Tempo encapsulates complex parsing logic and date-time permutations within an immutable class, understanding *why* a `Tempo` instance has arrived at its absolute `Temporal.ZonedDateTime` value can be critical.

This document outlines the various debugging and introspection mechanisms available to help trace and understand Tempo's behavior.

<br>

## Static Introspection

Before an instance is even created, you can inspect the static state of the `Tempo` class to understand the global configuration and available plugins.

### `Tempo.config`
Returns the current *global* configuration settings that act as the default for all new `Tempo` instances. This includes properties like the default `locale`, `timeZone`, and formatting layouts.

### `Tempo.default`
Returns the *initial*, out-of-the-box defaults that `Tempo` ships with, unaffected by any modifications made via [Global Discovery](../README.md#global-discovery) or [`Tempo.init()`](./tempo.config.md).

### `Tempo.terms`
Returns an array of all currently registered term plugins. This is useful to verify which plugins have been loaded via `Tempo.addTerm()`.

### `Tempo.properties`
Returns an array of the available static getters on the `Tempo` class.

### `Tempo.parse`
Returns the current *global* set of parsing rules. This includes the registry of regex patterns (`pattern`), snippets, and mapped `{event}` and `{period}` definitions.

---

## Instance Introspection

Once a `Tempo` instance is instantiated, you can inspect its internal state to understand how it was constructed and what logic was applied.

### `this.config`
Returns the specific configuration settings applied to *this instance*. This is a composite of the global `Tempo.config` and any specific `Tempo.Options` passed during instantiation.

### `this.parse.result`
This is arguably the most powerful debugging tool within Tempo. The `parse.result` property contains an array (a history lineage) of all the rule-matches that occurred to produce the current value.

Because `Tempo` is chainable (e.g., `new Tempo('xmas').set({ period: 'afternoon' })`), the `parse.result` array will contain an entry for *every* step in that chain, detailing:
*   `type`: The interpreted type of the input (e.g., `String`, `Temporal.ZonedDateTimeLike`).
*   `value`: The original argument passed to that step.
*   `match`: The specific regex pattern or symbol that successfully matched the input.
*   `groups`: The resolved components (`yy`, `mm`, `dd`, `hh`, etc.) extracted from the match.

### `this.term`
Returns an object containing the evaluated results of all registered term plugins for this specific instance.

### `this.fmt`
Returns an object containing the pre-calculated string outputs for all standard formatting codes (e.g., `this.fmt.iso8601`).

### Primitive Auditing
If you simply need to see the value represented in different primitive formats, `Tempo` implements `[Symbol.toPrimitive]`:
*   `${tempo}` (String coercion) outputs the ISO8601 string via `this.toString()`.
*   `+tempo` (Number coercion) outputs the Unix epoch in milliseconds.
*   `tempo.nano` outputs the Unix epoch in nanoseconds formatted as a `BigInt`.

---

## Debugging and Console Logging

Tempo has an internal logging utility (`Tempo.#dbg`) that responds to specific configuration flags.

### The `debug` Flag
When instantiating a `Tempo`, you can pass `{ debug: true }` in the options object.
```typescript
const t = new Tempo('next Friday', { debug: true });
```
When this flag is enabled, Tempo will output detailed `console.info` logs during instantiation, including:
*   The raw input being parsed.
*   The regex pattern that matched it.
*   The raw groups extracted before mutation logic.
*   The final, conformed groups applied to the `Temporal.ZonedDateTime`.

### The `catch` Flag
By default, `Tempo` is designed to be resilient. If it encounters parsing errors or invalid inputs, it will gracefully fallback.

However, if you want `Tempo` to *throw* `Error` objects instead of swallowing them (useful during development or in strict environments), you can pass `{ catch: false }` in the options:
```typescript
// Throws an Error instead of returning a fallback date
const t = new Tempo('invalid string', { catch: false });
```

### ⚡ Fast-Fail (Master Guard) Debugging

Tempo uses a **Master Guard** to avoid the expensive regex parsing phase for strings that are obviously not date-time inputs. If you find that a string is not being parsed as expected, it's possible that the guard is Rejecting it.

1.  **Check characters**: The guard only allows digits, common symbols (`-`, `:`, `.`, `T`, `Z`, `/`, `+`, `#`), space, and standard Latin characters.
2.  **Use `debug: true`**: If a string passes the guard but fails the parser, you will see "conformed groups" logs. If you see *nothing* and the input is returned as-is (falling back to a timestamp interpretation), then the guard likely rejected the string.
3.  **Invalid String fallback**: If the guard rejects a string and it cannot be parsed as a numeric timestamp, it will result in an Invalid instance (see below).

---

### Invalid Instances
If a `Tempo` instance completely fails to instantiate (and `{ catch: false }` is not set), it returns an empty object. You can check for this using the `isValid()` method:
```typescript
const t = new Tempo();
if (!t.isValid()) {
    console.error("Tempo failed to initialize properly");
}
```
