# Tempo Serializers (`stringify`, `objectify`, `cloneify`)

Tempo includes a custom serialization suite designed to succeed where standard native `JSON` methods fail. Complex JavaScript types like `Map`, `Set`, `BigInt`, `Symbol`, and `Date` routinely break or mangle when passed through standard `JSON.stringify()`.

This guide explains what the serialization tools do, their benefits over native methods, how they are used inside the library, and their trade-offs.

---

## 1. The Core Functions

The serializers are heavily utilized under the hood but are also exposed for robust data handling.

### `stringify(obj)`
Serializes variables, primitives, and rich objects into string-safe representations. Unlike standard JSON, it detects complex types and translates them into identifiable single key:value structures (e.g., `{"$BigInt":"123"}`).

```typescript
import { stringify } from '@magmacomputing/tempo';

const richData = new Map([
  ['time', new Date()],
  ['id', Symbol.for('session')],
  ['count', 100n]
]);

const safeString = stringify(richData);
// Safely serialized, preserving Map, Date, Symbol, and BigInt topologies
```

### `objectify(str, sentinel?)`
The inverse of `stringify`. It rebuilds an object from its stringified representation, parsing the specialized `{ $Type: value }` signatures back into their native JavaScript object instances.

```typescript
import { objectify } from '@magmacomputing/tempo';

const restored = objectify(safeString);
// restored instance is a true Map, containing true Date, Symbol, and BigInt primitives
```

### `cloneify(obj, sentinel?)`
Creates a deep-copy of an object by piping it through `stringify` and immediately back through `objectify`. This results in a detached, deeply cloned object that retains its rich types. 

```typescript
import { cloneify } from '@magmacomputing/tempo';

const detachedCopy = cloneify(richData);
```

*Note: Both `objectify` and `cloneify` accept an optional `sentinel` function, which allows you to dynamically replace `undefined` values during the rebuild phase.*

---

## 2. Selling the Benefits

Why not just use `JSON.parse(JSON.stringify(obj))` or `structuredClone()`?

* **Preservation of Rich Types:** `JSON.stringify()` instantly throws a `TypeError` if it encounters a `BigInt`. It silently strips `undefined`, reduces `Date` to a dumb string, and mangles `Set`/`Map` into empty `{}` objects. Tempo's `stringify` preserves all of these.
* **Fallback for `structuredClone`:** While `structuredClone` is great, it is not universally available in older environments and still drops functions. `cloneify` gives you a guaranteed deep-clone that resurrects your precise types reliably.
* **Safe Encoding:** Strings are natively URI-encoded for control characters, ensuring safe stashing in fragile WebStorage or cache environments without injection/corruption vulnerabilities.
* **Class Registration:** User-defined classes can be resurrected after stringification if they are decorated with Tempo's `@Serialize()` registry.

---

## 3. How They Are Used Inside Tempo

Internally, these robust guarantees allow Tempo to safely toss memory-heavy or complex objects around asynchronously:

* **Caching & Storage (`storage.library.ts`):** Used to safely serialize and deserialize internal state and user settings to `localStorage`, `sessionStorage`, or NodeJS `process.env`.
* **Cryptography (`cipher.class.ts`):** Complex payloads are reliably stringified prior to hashing and encryption, guaranteeing that decrypting the payload yields the exact original JavaScript topology.
* **Deep Cloning Templates (`term.season.ts`, etc):** Core plugins define fixed objects or arrays (like meteorological date boundaries). `cloneify` is used extensively to serve detached copies of those arrays to standard operations, ensuring that the original base configuration can never be accidentally mutated by reference.

---

## 4. Drawbacks (Over JSON Methods)

* **Performance / Execution Speed:** Operations that map, inspect, and safely cast specialized strings are slower than the highly-optimized C++ engine driving the native `JSON` namespace. If you only have raw text and numbers, standard `JSON.stringify` will be faster.
* **Payload Size:** Because unsupported types are wrapped in identifier signatures (e.g., `Set` -> `{"$Set":"[1,2,3]"}`), the resulting string weight can be slightly heavier than stripped-down raw JSON.
* **Unsupported Memory Types:** Just like JSON, `stringify` cannot safely serialize transient memory references. Standard JS `Function`, `AsyncFunction`, `WeakMap`, `WeakSet`, and `WeakRef` are ignored/bypassed.
