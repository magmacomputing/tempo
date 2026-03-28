# Tempo Library Functionality

While Tempo is primarily a Date-Time engine, it relies on several custom utilities under the hood to handle data structures, deep cloning, and serialization safely. 

These utilities are robust enough that they are exported as public API methods for use within your own application logic.

This document serves as an index summarizing these core library features.

<br>

## 1. Enumerators (`enumify`)

Tempo uses a custom utility called `enumify` to create heavily-protected, iteratable enum-like objects instead of relying on native TypeScript enums.

This allows for structural typing, easy iteration (`.keys()`, `.values()`), and runtime safety without the overhead or compilation quirks of standard TS Enums.

It is heavily used internally for concepts like `Weekdays`, `Months`, `Compass cardinal points` and `Meteorological Seasons`.

👉 **[Read the full Enumerators Guide](./tempo.enumerators.md)** for details on definition, methods, and a comparison with native enums.

<br>

## 2. Serialization (`stringify`, `objectify`, `cloneify`)

Native JSON methods (`JSON.stringify` and `JSON.parse`) often fail or destructively mutate rich JavaScript data types like `BigInt`, `Map`, `Set`, `Symbol`, and `Date`.

To ensure safe data persistence across `localStorage`, `IndexedDB`, or network boundaries, Tempo implements its own serialization suite:

*   **`stringify()`:** Safely serializes rich objects, protecting circular references and complex types.
*   **`objectify()`:** Safely reconstructs objects previously serialized by `stringify()`.
*   **`cloneify()`:** Performs a deep-copy of an object, preserving all rich data types.

👉 **[Read the full Serializers Guide](./tempo.serializers.md)** for detailed usage, benefits, and trade-offs compared to native `JSON` methods or `structuredClone`.

<br>

## 3. Decorators (`@Immutable`, `@Serializable`, `@Static`)

Tempo utilizes several custom TypeScript class decorators internally to enforce class behaviors such as strict immutability and preventing instantiation.

Because Tempo's build target is currently ES2022, this decorator functionality is transpiled away into standard Javascript functions by the compiler rather than using native ECMAScript decorators. Our aim is to transition these to first-class native features once Javascript engines natively support the ECMAScript decorator proposal.

👉 **[Read the full Decorators Guide](./tempo.decorators.md)** for details on the specific decorators used within the codebase.

<br>

## 4. Deferred Promises (`Pledge`)

Tempo provides a specialized wrapper around `Promise.withResolvers()` called `Pledge`. It is designed to simplify modern asynchronous patterns where you need to manage a promise's lifecycle externally.

### Key Features
*   **State Tracking:** Transparent access to `isPending`, `isResolved`, and `isRejected` flags.
*   **Custom Lifecycle Hooks:** Support for `onResolve`, `onReject`, and `onSettle` callbacks.
*   **Immutable Shell:** Once created, the Pledge instance is frozen, ensuring the promise reference cannot be swapped.
*   **Resource Management:** Implements `Symbol.dispose` to automatically reject pending promises when they go out of scope, preventing deadlocks or memory leaks.

👉 **[Read the full Pledge Guide](./tempo.pledge.md)** for advanced usage with callbacks, debugging tags, and lifecycle management.
---
