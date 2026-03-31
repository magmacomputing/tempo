# <img src="./img/hourglass-svgrepo-com.svg" width="100px"> <span style="font-size:4em;">Tempo</span>

**Tempo** is a premium, high-performance wrapper around the JavaScript `Temporal` API. It provides a modern, **immutable**, and **fluent** interface for date-time manipulation, and flexible parsing. It's designed as a better-performing, type-safe alternative to legacy libraries like **Moment.js**, **Day.js**, and **Luxon**.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Temporal](https://img.shields.io/badge/Temporal-Stage%204-green)](https://tc39.es/proposal-temporal/)
[![TypeScript Ready](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Native ESM](https://img.shields.io/badge/Native-ESM-green)](https://nodejs.org/api/esm.html)

## 🚀 Overview

Working with dates in JavaScript has historically been painful. The new `Temporal` standard (Stage 4) fixes this, but it can be verbose and strict when parsing strings. 

**Tempo** bridges that gap by providing:
- **Flexible Parsing**: Interprets almost any date string, including relative ones like "next Friday".
- **Fluent API**: Chainable methods for adding, subtracting, and setting date-times (similar to Moment.js).
- **Formatting**: Use custom tokens to format date-times in a way that is both intuitive and flexible.
- **Plugins**: Extend core functionality safely with `Tempo.extend()` (e.g. `TickerPlugin`).
- **Natural Language**: Supports word-based numbers (0-10) in relative parsing (e.g., "two days ago").
- **Terms**: Access complex date ranges (Quarters, Seasons, Fiscal Years) easily.
- **Immutable**: Operations (like `set` and `add`) return a new `Tempo` instance, ensuring thread safety and predictability.

## ✨ New in v2.0.0

Tempo v2.0.0 is a major milestone, delivering a more reactive architecture and rock-solid stability.

- **Side-Effect Registration**: Plugins and Terms now support self-registration. Simply importing a plugin is now sufficient to extend the Tempo core automatically.
- **100% Reliability**: The engine now passes 304/304 regression tests, ensuring complete stability across all parsing, calculation, and formatting routines.
- **Unified Term Logic**: Terms (like Quarters and Seasons) are now fully integrated. Use `#` in `set()` to jump to boundaries, and `{#term}` in `format()` to embed semantic labels (e.g. "Second Quarter") directly into strings.
- **Relational Term Math**: A category-first feature. Shift dates by semantic "steps" with `.add({ '#quarter': 1 })`. Tempo preserves your relative duration within the term, jumping across gaps and handling overflows with mathematical precision.
- **Fluent Immutable Boundaries**: Term ranges now return fully-functional, frozen `Tempo` instances for `start` and `end`, allowing for seamless chaining like `t.term.qtr.start.format('{dd} {mmm}')`.
- **Enhanced Parsing**: Significant refinements to the natural language engine for even more intuitive relative-date handling.

## ⚠️ Migrating from v1.x

If you are upgrading from a previous version, please note the following change in plugin handling:

**Plugin Registration**: You no longer need to manually call `Tempo.extend()`. Registration now happens automatically upon import:

```javascript
// v2.0.0 - Automatic registration via side-effect import
import '@magmacomputing/tempo/plugins/ticker';
```

## 🤔 Why Tempo?

If you're looking for a **modern date library** that leverages the native power of the browser's `Temporal` API, Tempo is for you.

- **Type Safety**: Built from the ground up with TypeScript.
- **Performance**: High-performance wrapper with minimal overhead.
- **Familiarity**: If you like the fluent syntax of **Moment** or **Day.js**, you'll feel right at home.
- **Future-Proof**: Built on the TC39 `Temporal` standard.

## 🎯 Target Audience
Tempo is built for **modern JavaScript developers** who require a premium, type-safe, and developer-friendly interface over the native Temporal API. It is ideal for those migrating from legacy libraries like **Moment.js**, **Day.js**, or **Luxon**, as well as teams building complex, time-sensitive applications that demand reliability, immutability, and high-performance parsing.

## 📦 Installation

```bash
npm install @magmacomputing/tempo
```

### 💻 Node.js (Server-Side)
Tempo is a native ESM package. In Node.js (20+), simply import the class.
> [!NOTE]
> Tempo uses native Node.js subpath imports (e.g. `#tempo/*`). This requires Node.js 14.6+ or 12.19+ in server-side environments.

In Node.js:

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
- [Plugin System (Extending Tempo)](./doc/Tempo.md#plugin-system)
- [Terms (Calculation Plugins)](./doc/Tempo.md#plugins-terms)
- [Configuration Guide](./doc/tempo.config.md)
- [Architecture & Internal Protection](./architecture.md)
- [Commercial Support & Consulting](./doc/commercial.md)

## 💖 Support the Project

If you find **Tempo** useful and want to support its development, please consider sponsoring me on GitHub! Your support helps keep the project active and premium.

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/magmacomputing)

## 💬 Contact & Support

If you have a question, find a bug, or want to suggest a new feature:

1. **Bug Reports & Features**: Please open an [Issue](https://github.com/magmacomputing/magma/issues).
2. **Questions & Ideas**: Start a thread in [Discussions](https://github.com/magmacomputing/magma/discussions).
3. **Direct Contact**: You can reach me at `hello@magmacomputing.com.au`.

## 🛡️ Privacy & Transparency

We value your privacy. **Tempo** does not include any runtime telemetry or "phone-home" features. To understand adoption and prioritize features, we use [Scarf](https://scarf.sh/) to aggregate anonymous download statistics. 

- **No Runtime Tracking**: Tempo will never make network requests from your application.
- **Anonymous Data**: We only see aggregated metadata (e.g., download volume, general geographic region) provided by the registry gateway.
- **Opt-out**: You can opt-out of Scarf's tracking by following their [opt-out instructions](https://scarf.sh/privacy-policy#opt-out).

## 🗳️ Feedback & Reactions

How are we doing? Let us know with a simple reaction!  
*(This will open a pre-filled GitHub Issue)*

[🚀 Premium!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🚀%20Premium!) &nbsp; | &nbsp; 
[⭐ Loving it!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20⭐%20Loving%20it!) &nbsp; | &nbsp; 
[💡 Needs work](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20💡%20Needs%20work) &nbsp; | &nbsp; 
[🐞 Found a bug](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🐞%20Found%20a%20bug)

### ⚡ Quick Reactions
*(Native reactions available in [Discussions](https://github.com/magmacomputing/magma/discussions/categories/feedback))*

[👍 Like](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[❤️ Love](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[😄 Haha](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[😮 Wow](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[😢 Sad](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[😡 Angry](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[💩 Poop](https://github.com/magmacomputing/magma/discussions/categories/feedback)

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
