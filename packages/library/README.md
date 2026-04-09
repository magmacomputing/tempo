# <img src="https://raw.githubusercontent.com/google/material-design-icons/master/png/action/book/materialicons/48dp/2x/baseline_book_black_48dp.png" width="48px" style="vertical-align:middle;"> <span style="font-size:2.5em; vertical-align:middle;">Magma Library</span>

**@magmacomputing/library** is a premium, high-performance, and platform-agnostic utility belt. It provides a comprehensive suite of tools for type-safe development, advanced data manipulation, and secure operations across Browser and Node.js environments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript Ready](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Native ESM](https://img.shields.io/badge/Native-ESM-green)](https://nodejs.org/api/esm.html)

---

## 🚀 Key Modules

The library is organized into specialized modules, each designed for maximum efficiency and tree-shakability.

| Module | Description |
| :--- | :--- |
| **Type System** | Advanced runtime type detection (`getType`), strict type-guards, and complex TS utility types. |
| **Array** | Sorted insertion, multi-key sorting, grouping (`byKey`), and cartesian products. |
| **String** | Proper-casing, pluralization helpers, sprintf-style formatting, and template evaluation. |
| **Serialization** | JSON-compatible stabilization with deep support for **Temporal**, **BigInt**, and custom Classes. |
| **Cipher** | Simple, secure class-based encryption and decryption wrappers. |
| **Pledge** | A robust wrapper for native Promises with settled-state tracking and timeout support. |
| **Reflection** | Clean access to own-properties, values, and entries without prototype pollution. |
| **Temporal** | Lightweight helpers and polyfill integration for the native `Temporal` API. |

---

## ✨ Quick Start

### Runtime Type Detection
The `getType` utility provides human-readable, proper-cased type names, even for custom classes that have been registered.

```typescript
import { getType, isType } from '@magmacomputing/library/common';

getType([]);            // "Array"
getType(new Map());     // "Map"
getType(42n);           // "BigInt"

if (isType(val, 'String', 'Number')) {
  // val is now narrowed to string | number
}
```

### Advanced Array Sorting
Sort complex collections of objects by multiple fields with ease.

```typescript
import { sortKey } from '@magmacomputing/library/common/array';

const users = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Alice', age: 22 }
];

// Sort by name (ASC) then age (DESC)
const sorted = sortKey(users, 'name', { field: 'age', dir: 'desc' });
```

### Secure Serialization
Unlike standard `JSON.stringify`, Magma's serialization handles complex types like `Temporal` and `BigInt` out of the box.

```typescript
import { stringify, parse } from '@magmacomputing/library/common/serialize';

const data = {
  at: Temporal.Now.instant(),
  count: 100n,
  pattern: /abc/gi
};

const json = stringify(data);
const restored = parse(json); // Fully restored types!
```

---

## 📚 Documentation

For deep dives into specific APIs, please refer to the internal documentation:

- **Common Utilities**: [packages/library/doc/common/](./doc/common/)
- **Browser-Specific**: [packages/library/doc/browser/](./doc/browser/)
- **Server/Node.js**: [packages/library/doc/server/](./doc/server/)

---

## 💬 Contact & Support

If you have questions, need architectural consulting, or want to report a bug, please reach out to us:

- **Email**: [hello@magmacomputing.com.au](mailto:hello@magmacomputing.com.au)
- **Issues**: [GitHub Issues](https://github.com/magmacomputing/magma/issues)
- **Discussions**: [GitHub Discussions](https://github.com/magmacomputing/magma/discussions)

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

© 2026 Magma Computing.
