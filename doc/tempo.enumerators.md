# Tempo Enumerators (`enumify`)

Tempo uses a custom `enumify` utility to define enumerations rather than relying on native TypeScript `enum`s. This gives consumers of the library access to a robust set of iteration and lookup methods out-of-the-box.

This guide explains how they are defined, how you use them as a consumer of the `Tempo` library, and why this design pattern was chosen.

---

## 1. How Tempo Enums are Defined

Tempo's core enumerators (like Weekdays, Months, Seasons) are built using the exported `enumify` function. 

This utility takes either an Array or an Object and returns a heavily-protected `Proxy`-like object.

### Array-based Definitions
When you pass an array to `enumify`, the strings become the **keys**, and the **values** are their zero-indexed positions:

```typescript
export const WEEKDAY = enumify(['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
// Result: { All: 0, Mon: 1, Tue: 2 ... }
```

### Object-based Definitions
When you need specific string-to-string mappings, you pass an object literal directly:

```typescript
export const SEASON = enumify({ Summer: 'summer', Autumn: 'autumn', Winter: 'winter', Spring: 'spring' });
```

### Type Inference
After defining the enumify object, simple TypeScript helper aliases pull out the types so you can use them reliably in function signatures:

```typescript
export type SEASON = ValueOf<typeof SEASON>; // Type: 'summer' | 'autumn' | 'winter' | 'spring'
```

---

## 2. Using Enums Outside of Tempo

For consumers of the library, these enumerations are exposed cleanly as **static getters** on the core `Tempo` class. 

You can use the values directly as arguments:

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Direct Value access
const direction = Tempo.COMPASS.North; // 'north'
const monthIndex = Tempo.MONTH.Feb;    // 2 (since 'All' was index 0)
```

Because `enumify` attaches a rich prototype, consumers can iterate through, validate, and query the enum structure easily. These are operations that are painfully clunky with standard TypeScript `enums`.

```typescript
// Iterating over properties
const days = Tempo.WEEKDAY.keys();                   // ['All', 'Mon', 'Tue', 'Wed', ...]
const entries = Tempo.WEEKDAY.entries();            // [['All', 0], ['Mon', 1], ...]

// Validation
if (Tempo.SEASON.has('Spring')) { ... }             // true if 'Spring' is a key
if (Tempo.SEASON.has(Tempo.SEASON.Spring)) { ... }  // true if 'Spring' is a key (using the enum value)
if (Tempo.SEASON.includes('spring')) { ... }        // true if 'spring' is a value

// Reverse lookups! Get the Key Name from the Value
const keyName = Tempo.MONTH.keyOf(2);               // 'Feb'

// Array manipulation built right in
const customStrings = Tempo.WEEKDAY.map(([key, val]) => `${key} is day ${val}`);
```

---

## 3. How They Are Used Inside Tempo

Internally, the `Tempo` logic relies heavily on these enumerators. This gives the parsing and formatting engines guaranteed type-safety and robust lookup dictionaries.

For instance, the `.format()` logic can map tokens efficiently, and parser configuration (e.g., regex `Snippet` mapping) loops through them safely without manually declaring `Object.keys()` combinations everywhere.

The overarching design ensures the library stays strongly typed, internally consistent, and protected against accidental runtime mutation via `Object.freeze()`.

---

## 4. `enumify` vs. TypeScript `enum` (The Trade-Offs)

TypeScript's native `enum` is one of the few TS features that generates structural runtime JavaScript, and it has known friction points in the JavaScript community. 

Using `enumify` is a deliberate choice for high-quality library design.

### The Wins for `enumify`
* **Rich API (Methods):** Native TS enums are plain JavaScript objects at runtime. To get the keys, you must write `Object.keys(MyEnum)`. The `enumify` wrapper gives developers `.keys()`, `.values()`, `.has()`, `.includes()`, `.map()`, `.filter()`, and native iteration (`[Symbol.iterator]`).
* **Predictable Serialization:** TypeScript numeric enums generate strange "reverse mappings" in compiled JS (e.g., `{ 0: "Up", "Up": 0 }`). This makes iterating over them or stringifying them to JSON very messy. `enumify` objects serialize cleanly and safely.
* **Immutability:** `enumify` freezes the object at runtime (`Object.freeze`). Standard TS enums can technically be mutated at runtime by malicious or sloppy ES code.
* **NodeJS/ESM Compatibility:** standard TS enums can cause friction with isolated module compilers (like Vite or esbuild) or when importing into vanilla JS. `enumify` generates 100% standard ES2015 JavaScript.

### The Losses (Trade-offs) for `enumify`
* **Slightly More Boilerplate Definition:** Defining an `enumify` dictionary takes 2-3 lines of code (exporting the const, then exporting the `type` alias). TS native enums do both (value and type) as part of the `enum` keyword. 
* **Missing Nominal Typing:** TypeScript native enums offer "nominal" typing (e.g., `enum A { X }` cannot be passed to a function expecting `enum B { X }` even if the keys/structures match). `enumify` relies on structural typing (union of literals), meaning TypeScript allows passing the raw string `'spring'` into a function rather than forcing you to strictly use `Tempo.SEASON.Spring`. 
* **Slight Runtime Overhead:** Instantiating the proxy/prototype wrapper and freezing it adds a microscopic runtime cost compared to evaluating a plain object literal, though parsing the library is typically a one-time engine cost.
* **More Verbose Setup:** TypeScript's enum can use auto-incrementing numeric values, but `enumify` requires explicit values for each key.
