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

## ⚡ The "Zero-Cost Constructor" Objective
Tempo is built with a **"Performance First"** mindset, specifically targeting the overhead of the class constructor. In high-frequency applications (like Tickers or real-time Dashboards), creating thousands of objects must be nearly as cheap as a primitive assignment.

This objective is achieved through two primary architectural pillars:
1.  **Lazy Evaluation ([Section 1](#1-lazy-evaluation-shadowing))**: Deferring the expensive work of string parsing and term computation until the first property access.
2.  **Master Guard ([Section 3](#3-master-guard-fast-fail-sync-point))**: Implementing a high-speed "fast-fail" gatekeeper to instantly reject invalid inputs when parsing *is* eventually triggered.

Together, these ensure that `new Tempo()` maintains an $O(1)$ complexity, regardless of how many plugins or custom terms are registered in the global system.

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

## ⚡ 3. Master Guard (Guarded-Lazy Strategy)
Used for: `new Tempo(string | number)`

The **Guarded-Lazy** strategy is the final pillar of the "Zero-Cost Constructor". It ensures that even with massive extensibility, the entry point remains nearly instantaneous.

### How it works:
1.  **High-Speed Gatekeeper**: Before the engine attempts to iterate over dozens of registered layouts, it runs a single $O(1)$ pass using a static `Master Guard` regex.
2.  **Fast-Fail**: If the input contains obviously invalid characters (emojis, non-Latin scripts not registered, etc.), it fails immediately.
3.  **Auto-Lazy**: If the input *passes* the guard, the constructor automatically switches the instance to `lazy: true` mode (even if the default was `false`). This defers the expensive $O(N)$ full-parse operation until the first property access.
4.  **Sync Point**: This "Guarded-Lazy" approach ensures that valid inputs pay NO penalty at instantiation, while invalid inputs are caught early enough to maintain library robustness.

### 📈 Validation & Performance
The efficiency of the Master Guard and the success of the Zero-Cost objective have been validated via local benchmarking:

- **Instantiation Overhead**: ~523µs on average (passing the Master Guard).
- **Fast-Fail Rejection**: ~359µs on average (failing the Master Guard).

> [!TIP]
> For detailed timing results and methodology, see [Performance Benchmarks](./tempo.benchmarks.md).

---

## ⚖️ Summary
The Tempo architecture follows the principle of **"Right Tool for the Job"**:
- **Shadowing** provides the extreme performance and memory efficiency required for **per-instance computed state**.
- **Proxies** provide the reference stability and controlled extensibility required for **global system registries**.
- **Master Guard** ensures that even with massive extensibility, the entry point remains a "Zero-Cost Constructor".
