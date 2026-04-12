# Roadmap: Standalone `parse()` Utility

This document outlines the architectural requirements for extracting the Tempo parsing engine into a standalone, pure-function utility.

## 🎯 Objective
Enable users to perform complex date-time parsing without the overhead of the `Tempo` class wrapper.
Syntax: `import { parse } from '@magmacomputing/tempo/parse';`

## 🏗️ Current Challenges
The parsing engine in `tempo.class.ts` is currently "statefully tied" to the instance via several internal mechanisms:

### 1. The "Scratchpad" Problem
The orchestrator (`#parse` / `#conform`) uses the parent `Tempo` instance as a temporary scratchpad during recursive resolution (e.g., resolving `{event}` or `{period}`). 
It "hijacks" `this.#anchor` and `this.#zdt` to prime the instance for the next recursive cycle.

### 2. Match Accumulation
Parsing results (matches) are buffered into a private instance property `#matches`. A standalone version needs a way to return these results or manage a temporary buffer.

---

## 🛠️ Proposed Solution: Context Injection
We must transition from **Implicit Instance State** to **Explicit Context Injection**.

### 1. Define a `ParseContext`
```typescript
interface ParseContext {
    anchor: Temporal.ZonedDateTime;
    registry: Tempo.Registry;
    options: Tempo.Options;
    results: Internal.Match[];
    depth: number;
    resolvingKeys: Set<string>;
}
```

### 2. Refactor Internal Pipeline
The following methods must be converted from private methods to standalone functions that accept a `ParseContext`:
- `#conform` -> `conform(input, ctx)`
- `#parseLayout` -> `parseLayout(input, ctx)`
- `#parseGroups` -> `parseGroups(groups, ctx)`

### 3. Handle Recursive Lookups
Instead of "hijacking" a `this` context, nested lookups will pass a **Cloned Context** with an updated anchor.

---

## 🚦 v2 Implementation Merit
| Phase | Task | Complexity |
| :--- | :--- | :--- |
| **Phase 1** | Refactor `Tempo` class to use an internal `context` object for parsing instead of field-level properties. | Medium |
| **Phase 2** | Extract `context`-based functions into `plugin/module/module.orchestrator.ts`. | Low |
| **Phase 3** | Expose public `parse()` entry point and sub-path exports. | Low |

## ⚠️ Known Risks
- **Plugin Compatibility**: Plugins that rely on `this` inside their `define()` callback will need a shim or a breaking-change update to support the context object.
- **Overhead**: Passing context objects through every call in the inner loop must be optimized to ensure we don't regress on parsing performance.
