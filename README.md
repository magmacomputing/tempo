# <img src="./img/hourglass-svgrepo-com.svg" width="100px"> <span style="font-size:4em;">Tempo</span>

**Tempo** is a premium, high-performance wrapper around the JavaScript `Temporal` API, providing a fluent and intuitive interface for date-time manipulation and flexible parsing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Temporal](https://img.shields.io/badge/Temporal-Stage%203-blue)](https://tc39.es/proposal-temporal/)

## 🚀 Overview

Working with dates in JavaScript has historically been painful. The new `Temporal` proposal (Stage 3) fixes this, but it can be verbose and strict when parsing strings. 

**Tempo** bridges that gap by providing:
- **Flexible Parsing**: Interprets almost any date string, including relative ones like "next Friday".
- **Fluent API**: Chainable methods for adding, subtracting, and setting date-times.
- **Built-in Plugins**: Access complex date ranges (Quarters, Seasons, Fiscal Years) easily.
- **Immutable**: Every operation returns a new `Tempo` instance, ensuring thread safety and predictability.

## 📦 Installation

```bash
npm install @js-temporal/polyfill
```

## 🛠️ Quick Start

```javascript
import { Tempo } from './tempo.class.js';

// Instantiate 
const now = new Tempo(); 
const birthday = new Tempo('20-May-1990');
const nextWeek = new Tempo('next Monday');

// Manipulate
const later = now.add({ days: 3, hours: 2 });
const startOfMonth = now.set({ start: 'month' });

// Format
console.log(now.format('{dd} {mon} {yy}')); // "24 Jan 2026"
console.log(now.fmt.date); // "2026-01-24"
```

## 📚 Documentation

For detailed technical guides, please refer to:
- [Tempo Class Documentation](./doc/Tempo.md)
- [Parsing Engine](./doc/Tempo.md#parsing)
- [Formatting Specs](./doc/Tempo.md#formatting)
- [Plugin System (Terms)](./doc/Tempo.md#plugins-terms)

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
