# 🏗️ Core Architecture

Tempo v2.0.1 introduces several industry-leading architectural patterns designed for maximum resilience in complex Monorepo and Proxy-wrapped environments.

## 🌐 Shared Global Registry
To solve the "Split-Brain" issue inherent in monorepo development (where multiple instances of the same library might be loaded), Tempo utilizes a **Shared Global Registry**. By leveraging `Symbol.for('magmacomputing/library/registry')` on `globalThis`, all versions of the Tempo and Library packages share a unified type-identification engine. This ensures that classes are correctly identified as constructors even when loaded across different module boundaries.

## 🛡️ Hardened Functional Resolution
Tempo implements a "Fail-Safe" execution pattern for functional inputs. The **Hardened Functional Resolution** engine automatically detects and recovers from misidentified types—such as ES6 classes wrapped in defensive Proxies.
- **Defensive Execution**: All plugin and factory invocations are wrapped in recursive `try/catch` blocks.
- **Automatic Recovery**: If a class constructor is accidentally invoked as a function, Tempo catches the `TypeError`, downgrades it to a diagnostic warning, and returns the original constructor to ensure the library remains operational.
- **Deep Identification**: A three-tiered identification strategy (Reference, Tag, and Name matching) ensures "Perfect Identification" of constructors across all module boundaries.

## 🏗️ Tempo Architecture: Internal Protection & Performance

Tempo employs two distinct methodologies for protecting its internal state. These strategies are complementary, each tailored to a specific scope (Instance vs. Global) and performance requirement.

---

## 🧭 Methodology Comparison

| Feature | **Lazy Evaluation (Shadowing)** | **Soft Freeze (Proxy)** |
| :--- | :--- | :--- |
| **Primary Target** | `Tempo.#term`, `Tempo.#fmt` (Instance State) | `NUMBER`, `FORMAT` (Global Registries) |
| **Scope** | **Instance-Specific**: Unique to every separate `new Tempo()` call. | **Global-Shared**: One single source of truth used by all instances. |
| **Primary Goal** | **Performance**: Avoid computing expensive terms (like `qtr` or `szn`) until needed. | **Extensibility**: Allow plugin to safely "append" new data to registries at runtime. |
| **Mechanism** | `Object.create(proto)` + Prototype Shadowing. | `new Proxy(target)` + Symbol-bypass. |
| **Why this one?** | **Memory Efficiency**: Thousands of instances share the same base prototype. | **Reference Stability**: Shared registries must stay at the same object reference. |

---

## ⚡ The "Zero-Cost Constructor" Objective
Tempo is built with a **"Performance First"** mindset, specifically targeting the overhead of the class constructor. In high-frequency applications (like Tickers or real-time Dashboards), creating thousands of objects must be nearly as cheap as a primitive assignment.

This objective is achieved through two primary architectural pillars:
1.  **Lazy Evaluation ([Section 1](#1-lazy-evaluation-shadowing))**: Deferring the expensive work of string parsing and term computation until the first property access.
2.  **Master Guard ([Section 3](#3-master-guard-fast-fail-sync-point))**: Implementing a high-speed "fast-fail" gatekeeper to instantly reject invalid inputs when parsing *is* eventually triggered.

Together, these ensure that `new Tempo()` maintains an O(1) constructor execution time by deferring O(N) full-parse work until the first property access, regardless of how many plugin or custom terms are registered in the global system.

---

## 🔁 Iteration & Enumerability (The Shadowing Chain)

When using prototype shadowing, the JavaScript behavior for property inspection changes significantly. This is a trade-off for the performance gains.

### ⚠️ The `Object.keys()` Warning
`Object.keys(instance.fmt)` only returns the **enumerable own properties** of the current link in the shadowing chain.
- **Initially**: Returns `[]` (all evaluated getters are non-enumerable on the base).
- **After 1st Access** (e.g., `.date`): Returns `['date']`.
- **After 2nd Access** (e.g., `.time`): Returns `['time']`. The `.date` property is now located on the **immediate prototype** of the current object.

### 🛡️ The Flattening Iterator
Tempo implements a **Flattening Iterator** via `[Symbol.iterator]` which enables iterable consumers like `for...of`, array spread (`[...instance]`), and `Object.fromEntries(instance)` to traverse the shadowing chain (using `Object.getPrototypeOf`) and collect evaluated property entries.

- **`[Symbol.iterator]`**: Traverses the shadowing chain to provide a flattened view of all computed state.
- **⚠️ Important**: `for...in` and object spread (`{...instance}`) **do not** use the iterator; instead, they rely on enumerable own/inherited properties and are not supported by the flattening logic.
- **`Tempo.formats` & `Tempo.terms`**: These static getters continue to provide a registry-wide view of **available** keys across the entire system, regardless of their evaluation state.

---

## 1. Lazy Evaluation (Shadowing)
Used for: `Tempo.#term`, `Tempo.#fmt`

The **Instance Shadowing** pattern is designed for massive scale. When a library is used heavily, creating thousands of `new Proxy()` objects adds significant memory overhead. Instead, Tempo leverages the native JavaScript prototype chain.

### How it works:
- **Stage 0**: All instances initially point to the same base `#term` object containing un-evaluated getters.
- **Stage 1**: When a term (e.g., `.qtr`) is accessed, the value is computed once.
- **Stage 2**: Tempo uses a **Generic Lazy Delegator** Proxy (via `getLazyDelegator`) which catches property access and evaluates it on-demand.
- **Result**: The JS engine executes lookups via an optimized Proxy handler, making lookups nearly as fast as raw property access while keeping the state strictly immutable.

> [!TIP]
> For more implementation details, see [Lazy Evaluation Pattern](./lazy-evaluation-pattern.md).

---

## 2. Soft Freeze Strategy (Proxy)
Used for: `Tempo.NUMBER`, `Tempo.FORMAT`, `Tempo.TIMEZONE`, `Tempo.config`

Global registries must be **live** but **secure**. As of **v2.0.1**, these are protected by a "Soft Freeze" layer to prevent accidental state corruption by third-party code.

### How it works:
- **The User**: Sees a read-only Proxy that behaves like a frozen object. Direct assignments are blocked to prevent "poisoning" the global state.
- **The Library**: Uses a private symbol bypass to perform "Transactional Updates" via `registryUpdate()`.
- **Result**: The object reference remains constant while allowing controlled extensibility. This ensures that internal caches (like the Master Guard) can be re-synchronized whenever a registry changes.

> [!TIP]
> For more implementation details, see [Soft Freeze Strategy](./soft_freeze_strategy.md).

---

<a id="3-master-guard-fast-fail-sync-point"></a>
## ⚡ 3. Master Guard (Guarded-Lazy Strategy)
Used for: `new Tempo(string | number)`

The **Guarded-Lazy** strategy ensures that even with hundreds of custom plugin, the entry point remains nearly instantaneous. In **v2.0.1**, this was refined for 100% matching reliability.

### How it works:
1.  **Length-Sorted Terms**: To prevent "partial matching" (e.g., matching `noon` inside `afternoon`), all registered terms are sorted by length (descending) before the Guard regex is built.
2.  **Automated Escaping**: All custom terms are escaped to prevent regex injection or character collision.
3.  **High-Speed Gatekeeper**: This single-pass $O(1)$ regex acts as the fast-fail gatekeeper.
4.  **Auto-Lazy**: Valid inputs that pass the guard automatically switch the instance to `mode: 'defer'` mode, deferring the $O(N)$ full-parse work until the first property access.

### 📈 Validation & Performance
The efficiency of the Master Guard and the success of the Zero-Cost objective have been validated via local benchmarking:

- **Instantiation Overhead**: ~523µs on average (passing the Master Guard). *(Node.js v24.14.1, 12th Gen Intel i7-1255U, Linux x86_64; steady-state measured after 1k warm-up runs, n=10k. Validates the Zero-Cost objective on this hardware.)*
- **Fast-Fail Rejection**: ~359µs on average (failing the Master Guard). *(Node.js v24.14.1, 12th Gen Intel i7-1255U, Linux x86_64; steady-state measured after 1k warm-up runs, n=10k. Demonstrates the Master Guard's low-latency rejection performance.)*

> [!TIP]
> For detailed timing results and methodology, see [Performance Benchmarks](./tempo.benchmarks.md).

---

## ⚖️ Summary
The Tempo architecture follows the principle of **"Right Tool for the Job"**:
- **Shadowing** provides the extreme performance and memory efficiency required for **per-instance computed state**.
- **Proxies** provide the reference stability and controlled extensibility required for **global system registries**.
- **Master Guard** ensures that even with massive extensibility, the entry point remains a "Zero-Cost Constructor".
