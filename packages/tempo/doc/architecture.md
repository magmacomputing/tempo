# 🏗️ Tempo Architecture: Internal Protection & Performance

Tempo employs two distinct methodologies for protecting its internal state. These strategies are complementary, each tailored to a specific scope (Instance vs. Global) and performance requirement.

---

## 🧭 Methodology Comparison

| Feature | **Lazy Evaluation (Shadowing)** | **Soft Freeze (Proxy)** |
| :--- | :--- | :--- |
| **Primary Target** | `Tempo.#term`, `Tempo.#fmt` (Instance State) | `NUMBER`, `FORMAT` (Global Registries) |
| **Scope** | **Instance-Specific**: Unique to every separate `new Tempo()` call. | **Global-Shared**: One single source of truth used by all instances. |
| **Primary Goal** | **Performance**: Avoid computing expensive terms (like `qtr` or `szn`) until needed. | **Extensibility**: Allow plugins to safely "append" new data to registries at runtime. |
| **Mechanism** | `Object.create(proto)` + Prototype Shadowing. | `new Proxy(target)` + Symbol-bypass. |
| **Why this one?** | **Memory Efficiency**: Thousands of instances share the same base prototype. | **Reference Stability**: Shared registries must stay at the same object reference. |

---

## 🔁 Iteration & Enumerability (The Shadowing Chain)

When using prototype shadowing, the JavaScript behavior for property inspection changes significantly. This is a trade-off for the performance gains.

### ⚠️ The `Object.keys()` Warning
`Object.keys(instance.fmt)` only returns the **enumerable own properties** of the current link in the shadowing chain.
- **Initially**: Returns `[]` (all evaluated getters are non-enumerable on the base).
- **After 1st Access** (e.g., `.date`): Returns `['date']`.
- **After 2nd Access** (e.g., `.time`): Returns `['time']`. The `.date` property is now located on the **immediate prototype** of the current object.

### 🛡️ The Flattening Iterator
To ensure that tools like `for...in` loops, spread operators, and `Object.fromEntries(t)` work correctly, Tempo implements a **Flattening Iterator** on the instance.
- **`[Symbol.iterator]`**: Traverses the entire shadowing chain (using `Object.getPrototypeOf`) to collect all evaluated properties across all links.
- **`Tempo.formats` & `Tempo.terms`**: Static getters provide a registry-wide view of **available** keys, regardless of whether they have been evaluated on a specific instance.

---

## 1. Lazy Evaluation (Shadowing)
Used for: `Tempo.#term`, `Tempo.#fmt`

The **Instance Shadowing** pattern is designed for massive scale. When a library is used heavily, creating thousands of `new Proxy()` objects adds significant memory overhead. Instead, Tempo leverages the native JavaScript prototype chain.

### How it works:
- **Stage 0**: All instances initially point to the same base `#term` object containing un-evaluated getters.
- **Stage 1**: When a term (e.g., `.qtr`) is accessed, the value is computed once.
- **Stage 2**: Tempo creates a *new* frozen object containing that literal value and sets its `__proto__` to the original base object.
- **Result**: The JS engine optimizes this via "Inline Caches," making lookups nearly as fast as raw property access while keeping the state strictly immutable.

> [!TIP]
> For more implementation details, see [Lazy Evaluation Pattern](./lazy-evaluation-pattern.md).

---

## 2. Soft Freeze Strategy (Proxy)
Used for: `Tempo.NUMBER`, `Tempo.FORMAT`, `Tempo.config`

Global registries must be **live**. If a plugin adds a new timezone alias or date format, every existing `Tempo` instance in the application needs to see that change immediately.

### How it works:
- **The User**: Sees a read-only Proxy that appears and behaves like a frozen object (silent failure on `set`).
- **The Library**: Uses a private `Symbol` (`$Target`) to "unwrap" the proxy and perform a mutable merge on the source of truth.
- **Result**: The object reference remains constant across the entire lifecycle of the application, ensuring consistency for all consumers.

> [!TIP]
> For more implementation details, see [Soft Freeze Strategy](./soft_freeze_strategy.md).

---

## ⚡ 3. Master Guard (Fast-Fail Sync Point)
Used for: `new Tempo(string | number)`

To maintain extreme performance even with invalid or complex inputs, Tempo employs a **Master Guard** regex that acts as a gatekeeper for the parsing engine.

### How it works:
1.  **Sync Point**: Before the engine attempts to iterate over dozens of registered layouts and snippets, it runs a single `O(1)` pass using `static #guard`.
2.  **Character Validation**: The guard checks if the input string contains only characters known to be part of valid date-time representations (digits, common symbols like `-:./`, and letters A-Z).
3.  **Fast-Fail**: If the string contains "exotic" characters (like emojis, special symbols, or non-Latin alphabets not registered in terms), the guard rejects it instantly.
4.  **Result**: This prevents the expensive overhead of full regex parsing for obviously invalid strings, ensuring the "Zero-Cost Constructor" goal is met even for negative cases.

> [!WARNING]
> **Character Whitelist**: The Master Guard is strictly configured to digits, symbols (`-`, `:`, `.`, `T`, `Z`, `/`, `+`, `#`), and standard Latin characters. If you are extending Tempo with custom terms in a non-Latin script, you may need to ensure your terms are either registered as regex snippets or that the guard is updated to accommodate the character set.

---

## 🚀 4. Performance Benchmarks

The O(1) complexity of the constructor and the efficiency of the Master Guard have been validated via local benchmarking.

- **Zero-Cost Constructor**: instantiation takes ~523µs on average.
- **Master Guard Fast-Fail**: Rejected inputs are handled in ~359µs.

> [!TIP]
> For detailed timing results and methodology, see [Performance Benchmarks](./tempo.benchmarks.md).

---

## ⚖️ Summary
The Tempo architecture follows the principle of **"Right Tool for the Job"**:
- **Shadowing** provides the extreme performance and memory efficiency required for **per-instance computed state**.
- **Proxies** provide the reference stability and controlled extensibility required for **global system registries**.
