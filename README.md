# <img src="./img/hourglass-svgrepo-com.svg" width="100px"> <span style="font-size:4em;">Tempo</span>

**Tempo** is a premium, high-performance wrapper around the JavaScript `Temporal` API, providing a fluent and intuitive interface for date-time manipulation and flexible parsing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Temporal](https://img.shields.io/badge/Temporal-Stage%203-blue)](https://tc39.es/proposal-temporal/)

## 🚀 Overview

Working with dates in JavaScript has historically been painful. The new `Temporal` proposal (Stage 3) fixes this, but it can be verbose and strict when parsing strings. 

**Tempo** bridges that gap by providing:
- **Flexible Parsing**: Interprets almost any date string, including relative ones like "next Friday".
- **Fluent API**: Chainable methods for adding, subtracting, and setting date-times.
- **Formatting**: Use custom tokens to format date-times in a way that is both intuitive and flexible.
- **Built-in Plugins**: Access complex date ranges (Quarters, Seasons, Fiscal Years) easily.
- **Immutable**: operations (like 'set', and 'add') return a new `Tempo` instance, ensuring thread safety and predictability.

## 📦 Installation

```bash
npm install @magmacomputing/tempo
```

### 💻 Node.js (Server-Side)
Tempo is a native ESM package. In Node.js (20+), simply import the class:

```javascript
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('next Friday');
console.log(t.format('{dd} {mon} {yyyy}'));
```

### 🌐 Browser (Import Maps)
Since Tempo is a native ESM package, you can use it directly in modern browsers using `importmap`:

```html
<script type="importmap">
{
  "imports": {
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/index.js"
  }
}
</script>
<script type="module">
  import { Tempo } from '@magmacomputing/tempo';
  const t = new Tempo('next friday');
  console.log(t.format('{mon} {day}'));
</script>
```

### 📦 Browser (Script Tag)
For environments without `importmap` support or simple prototypes, use the bundled version:

```html
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/dist/tempo.bundle.js"></script>
<script>
  const t = new Tempo('tomorrow');
  console.log(t.toString());
</script>
```

## 🛠️ Quick Start

```javascript
import { Tempo } from '@magmacomputing/tempo';

// Instantiate 
const now = new Tempo(); 
const birthday = new Tempo('20-May-1990');
const nextWeek = new Tempo('next Monday');

// Manipulate
const later = now.add({ days: 3, hours: 2 });
const startOfMonth = now.set({ start: 'month' });

// Format
console.log(now.format('{dd} {mmm} {yyyy}')); // using custom format with tokens: "24 Jan 2026"
console.log(now.fmt.date);                    // using pre-built formats: "2026-01-24"
```

## 📚 Documentation

For detailed technical guides, please refer to:
- [Vision & Value Proposition](./doc/vision.md)
- [Tempo vs. Native Temporal](./doc/tempo-vs-temporal.md)
- [Tempo vs. The Competition](./doc/comparison.md)
- [Tempo Class Documentation](./doc/Tempo.md)
- [Data In ~ Parsing Engine](./doc/Tempo.md#parsing)
- [Data Out ~ Formatting Tokens](./doc/Tempo.md#formatting)
- [Plugin System (Terms)](./doc/Tempo.md#plugins-terms)
- [Configuration Guide](./doc/tempo.config.md)
- [Commercial Support & Consulting](./doc/commercial.md)

## 💖 Support the Project

If you find **Tempo** useful and want to support its development, please consider sponsoring me on GitHub! Your support helps keep the project active and premium.

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/magmacomputing)

## 💬 Contact & Support

If you have a question, find a bug, or want to suggest a new feature:

1. **Bug Reports & Features**: Please open an [Issue](https://github.com/magmacomputing/tempo/issues).
2. **Questions & Ideas**: Start a thread in [Discussions](https://github.com/magmacomputing/tempo/discussions).
3. **Direct Contact**: You can reach me at `hello@magmacomputing.com.au`.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
