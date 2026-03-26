# Extending Tempo with Plugins

Tempo is designed with a "lean core" philosophy. While it provides robust date-time manipulation and parsing out of the box, advanced functionality—like reactive tickers or domain-specific business logic—is added through a flexible **Plugin System**.

## The `Tempo.extend()` API

To register a plugin, use the static `extend` method. This can be called multiple times to stack different feature sets.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { MyPlugin } from './my-plugin.js';

Tempo.extend(MyPlugin);
```

---

## Writing a Plugin

A Tempo plugin is a function that receives the `Tempo` environment and attaches new capabilities to the `Tempo` class or its prototype.

### Plugin Signature

```typescript
export const MyPlugin: Tempo.Plugin = (options, TempoClass, factory) => {
  /**
   * options:    The global configuration object
   * TempoClass: The internal Tempo class (for static methods)
   * factory:    A helper to create new Tempo instances without 'new'
   */

  // 1. Add a static method
  TempoClass.myStaticMethod = () => { ... };

  // 2. Add an instance method (on the prototype)
  // Note: Most Tempo instance methods should be IMMUTABLE and return a new instance.
  TempoClass.prototype.toHoliday = function() {
    return factory(this.add({ days: 1 }));
  };
};
```

### Type Safety (TypeScript)

To ensure your plugin is discoverable by the IDE, use **Module Augmentation** to extend the `Tempo` namespace and the `Tempo` class interface.

```typescript
declare module '@magmacomputing/tempo' {
  namespace Tempo {
    // 1. Define new types/interfaces here
    interface HolidayOptions { ... }

    // 2. Add static methods to the Tempo namespace
    function myStaticMethod(): void;
  }

  interface Tempo {
    // 3. Add instance methods to the Tempo class
    toHoliday(): Tempo;
  }
}
```

> [!WARNING]
> **Avoid Circular Dependencies**: When writing a plugin, **never** import the `Tempo` class directly from `@magmacomputing/tempo`. Doing so will create a circular dependency that breaks the library initialization. Instead, always use `import type { Tempo }` for type checking, and rely on the `TempoClass` argument passed to your plugin function for static method access.
---

## Self-Registering Plugins (Side-Effects)

To simplify developer setup, many plugins support **self-registration** via side-effect imports. This allows a plugin to register itself with the global Tempo registry as soon as it's imported.

```typescript
import '@magmacomputing/tempo/plugins/ticker.js';
import { Tempo } from '@magmacomputing/tempo';
```

> [!IMPORTANT]
> **Import Order Matters**: To ensure self-registered plugins are processed by the automatic `Tempo.init()` at startup, the side-effect import must appear **above** the `Tempo` class import. If imported later, you must call `Tempo.init()` manually to refresh the internal registry.

---

## Best Practices

### 1. Selective Immobility
The core methods of Tempo (like `add`, `set`, `format`) are **protected**. The `extend()` system will prevent you from accidentally overwriting these essential behaviors, ensuring the library remains stable even when heavily customized.

### 2. Immutability
When adding instance methods that "modify" the date, always follow the Tempo pattern of returning a **new instance**. Use the provided `factory` function to wrap the resulting `Temporal` object back into a `Tempo` instance.

### 3. Namespace Respect
When adding many related methods, consider grouping them under a single property (e.g., `tempo.term.xyz` or `tempo.it.abc`) to keep the root `Tempo` interface clean and avoid collisions with future core updates.

## Distributing Your Plugin

To make your plugin available to the community, package it as a standard NPM module. 

### Plugin Factories (with Options)
If your plugin requires its own configuration, export a **factory function** that returns the `Tempo.Plugin` function. This is the cleanest pattern for "marketplace" plugins.

```typescript
// tempo-plugin-holiday/index.ts
export const HolidayPlugin = (pluginOptions = {}) => {
  return (tempoOptions, TempoClass, factory) => {
    // ... use pluginOptions here ...
  };
};
```

---

## Consuming a Plugin

For developers using your extension, the process should be as simple as a single import and one call to `extend()`.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { HolidayPlugin } from 'tempo-plugin-holiday';

// Initialize the plugin with its own options and register it with Tempo
Tempo.extend(HolidayPlugin({ 
  region: 'US-NY' 
}));
```

---

## Examples---

## 🤝 Need Help Writing a Plugin?

If you have a complex business requirement or need a high-performance plugin built to professional standards, we can help. Our team can design, implement, and verify custom Tempo extensions tailored to your specific domain.

**[Contact Magma Computing](https://github.com/magmacomputing)** to discuss your requirements.

- [Tempo Ticker Guide](./tempo.ticker.md): A deep dive into an "Async Generator" based plugin.
- [Tempo Terms Guide](./tempo.terms.md): Documentation on the "Memoized Lookup" pattern for business logic.
