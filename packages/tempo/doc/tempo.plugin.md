# Extending Tempo with Plugin

Tempo is designed with a "lean core" philosophy. Whilst it provides robust date-time manipulation and parsing out of the box, advanced functionality (like reactive tickers or domain-specific business logic) is added through a flexible **Plugin System**.

To manually register a plugin, use the static `extend` method. This is typically used for "opt-in" features or when you need to provide specific configuration to a plugin factory.

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { MyPlugin } from './my-plugin.js';
import { HolidayModule } from './my-holiday-plugin.js';

// Manual registration
Tempo.extend(MyPlugin);

// Registration with a Factory (providing options)
Tempo.extend(HolidayModule({ region: 'US-NY' }));
```

---

The most efficient way to author a plugin is using the `definePlugin` factory. This helper automatically handles the internal registration logic, making your plugin available as soon as it is imported (via side effect).

## Example Plugin

```typescript
import { definePlugin } from '@magmacomputing/tempo/plugin';

export const MyPlugin = definePlugin((options, TempoClass, factory) => {
  /**
   * options:    The global configuration object
   * TempoClass: The internal Tempo class (for static methods)
   * factory:    A helper to create new Tempo instances without 'new'
   */

  // 1. Add a static method
  TempoClass.myStaticMethod = () => { /* ... */ };

  // 2. Add an instance method (on the prototype)
  TempoClass.prototype.toHoliday = function() {
    return factory(this.add({ days: 1 }));
  };
});
```

## Manual Registration Pattern
If you prefer not to use the factory (e.g. for plugin that should *not* self-register), you can export a plain function with the `Tempo.Plugin` signature:

```typescript
import type { Tempo } from '@magmacomputing/tempo/core';

export const ManualPlugin: Tempo.Plugin = (options, TempoClass, factory) => {
  // ... implementation ...
};
```

## Type Safety (TypeScript)

To ensure your plugin is discoverable by the IDE, use **Module Augmentation** to extend the `Tempo` namespace and the `Tempo` class interface.

```typescript
declare module '@magmacomputing/tempo/core' {
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

> **Understanding Tempo Versions**:
> - **`@magmacomputing/tempo/core` (Lite)**: A bare-bones engine with zero side-effects. This is the recommended choice for production builds and plugin authoring.
> - **`@magmacomputing/tempo` (Full)**: The "Batteries Included" version which automatically imports and registers all standard modules.
>
> **Avoid Circular Dependencies**: When authoring a plugin, **never** import the `Tempo` class directly from the **Full** version (`@magmacomputing/tempo`). Doing so triggers the library's automatic registration sequence in a recursive loop, which will break your application's initialization. 
> 
> Instead:
> 1. **Use types**: `import type { Tempo } from '@magmacomputing/tempo/core'`.
> 2. **Use the argument**: Rely on the `TempoClass` argument passed into your plugin function for static method access.
> 3. **Use the engine**: If you need a class reference (e.g., for `instanceof` checks), import only from the **Lite** engine (`@magmacomputing/tempo/core`).

---

Modern Tempo plugin are designed to be "plug-and-play." By using the `definePlugin` factory, a plugin registers itself with the global Tempo registry as soon as it's imported.

```typescript
import '@magmacomputing/tempo/ticker';                // 1. Module self-registers via side-effect
import { Tempo } from '@magmacomputing/tempo/core';   // 2. Load the `lite` engine

Tempo.init();                                         // 3. Discover and activate all imported plugin

// Ticker is now available on the core Tempo class!
const pulse = Tempo.ticker(1); 
```

> [!NOTE]
> **Import Order**: While older versions of Tempo were sensitive to import order, current versions handle sequencing robustly. `Tempo.init()` is automatically called during bootstrap to ensure all discovered plugin are integrated. If you dynamically load plugin later, you can call `Tempo.init()` manually to refresh the registry.

---

## Best Practices

### 1. Selective Immobility
The core methods of Tempo (like `add`, `set`, `format`) are **protected**. The `extend()` system will prevent you from accidentally overwriting these essential behaviors, ensuring the library remains stable even when heavily customized.

### 2. Immutability
When adding instance methods that "modify" the date, always follow the Tempo pattern of returning a **new instance**. Use the provided `factory` function to wrap the resulting `Temporal` object back into a `Tempo` instance.

### 3. Namespace Respect
When adding many related methods, consider grouping them under a single property (e.g., `tempo.term.xyz` or `tempo.it.abc`) to keep the root `Tempo` interface clean and avoid collisions with future core updates.

### 4. Extending Core Registries
As of **v2.0.1**, Tempo's core registries (`NUMBER`, `TIMEZONE`, `FORMAT`) are protected by a **Soft Freeze** layer. You cannot directly assign new values to them (e.g., `Tempo.TIMEZONE.myZone = '...'` will fail).

Instead, use **`Tempo.extend()`** to add new data. This is the only supported way to add custom options, formats, or several timezone aliases at once.

```typescript
Tempo.extend({
  timeZones: { 'UTC+13': 'Pacific/Auckland' },
  formats: { 'myCode': '{yy}{mm}{dd}' }
});
```

Using `Tempo.extend()` ensures that the library safely bypasses the "Soft Freeze" protection and that all internal caches (like the Master Guard) are correctly synchronized.

### 5. Error Handling & The Logify Pattern
When building plugin that perform complex parsing or logic, follow Tempo's **"Fail-fast by Default"** principle.

- **Strict Mode (Default)**: If your plugin encounters a terminal error (e.g., invalid input that cannot be recovered), you should `throw` a descriptive error.
- **Catch Mode**: Respect the user's `catch` configuration. If `this.config.catch` is `true`, instead of throwing, you should log a warning using `this.warn()` and return a sensible fallback (or the original input).

```typescript
// Example within a plugin instance method
if (errorCondition) {
  const msg = `Custom Error: ${details}`;
  if (this.config.catch === true) {
    this.warn(msg);
    return this; // or a fallback value
  }
  throw new Error(msg);
}
```

This pattern ensures that Tempo remains robust in production environments while providing strict validation during development.

## Advanced Pattern: Stateful Classes & Callable Proxies

For complex plugin (like the **Ticker**) that need to maintain internal state across multiple calls or provide both a class interface and a "shortcut" function, use the **Stateful Class + Proxy** pattern.

### 1. Define a Dedicated Types Namespace
Avoid polluting the global `Tempo` namespace. Instead, create a dedicated `Types` namespace for your plugin's internal and public signatures. This prevents "Used before declaration" errors and name-shading.

```typescript
export namespace MyPluginTypes {
  export type Options = { ... }
  export interface Descriptor extends AsyncGenerator<Tempo, any> {
    doSomething(): void;
  }
  // The final public interface (callable as a function)
  export interface Instance extends Descriptor {
    (): void
  }
}
```

### 2. Implement the Logic in a Class
Use a standard class to manage your state. This keeps your logic decoupled from the Proxy and the core engine.

```typescript
class MyPluginInstance implements MyPluginTypes.Descriptor {
  #self!: MyPluginTypes.Instance;
  
  bootstrap(proxy: MyPluginTypes.Instance) {
    this.#self = proxy;
    return this.#self;
  }
  // ... implement Descriptor methods ...
}
```

### 3. Wrap with a Proxy in the Factory
Use a `Proxy` in your `definePlugin` factory to handle the callability trap. This allows your plugin to act as a function (the shortcut) and an object (the stateful class) simultaneously.

```typescript
export const MyPlugin = definePlugin((options, TempoClass, factory) => {
  (TempoClass as any).myTool = function(arg1: any): MyPluginTypes.Instance {
    const instance = new MyPluginInstance(arg1);
    
    const proxy = new Proxy((() => instance.doSomething()) as any, {
      get: (_, prop) => {
        // Map proxy properties to instance methods
        if (prop in instance) return (instance as any)[prop].bind(instance);
        return (instance as any)[prop];
      },
      apply: (target) => target()
    }) as unknown as MyPluginTypes.Instance;

    return instance.bootstrap(proxy);
  };
});
```

---

## Distributing Your Plugin

To make your plugin available to the community, package it as a standard NPM module. 

### Plugin Factories (with Options)
If your plugin requires its own configuration, export a **factory function** that returns the `Tempo.Plugin` function. This is the cleanest pattern for "marketplace" plugin.

```typescript
// tempo-plugin-holiday/index.ts
import { defineModule } from '@magmacomputing/tempo/plugin';

export const HolidayModule = (pluginOptions = {}) => {
  return defineModule((tempoOptions, TempoClass, factory) => {
    // ... use pluginOptions here ...
  });
};
```

### The Module Aggregator Pattern
If your plugin provides multiple related components (like the `TermsModule`), wrap them in an aggregator module to provide a uniform activation experience for the user.

```typescript
// index.ts
import { defineModule } from '@magmacomputing/tempo/plugin';
import { PluginA } from './plugin.a.js';
import { PluginB } from './plugin.b.js';

export const MyFeatureModule = defineModule((options, TempoClass) => {
  TempoClass.extend([PluginA, PluginB]);
});
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

## Bulk Registration

`Tempo.extend()` supports **rest parameters** and **arrays**, allowing you to register multiple plugin in a single call. If the last argument is a plain object (and not a plugin/term), it is treated as a shared configuration for all plugin in that batch.

```ts
// Mix and match arrays and individual arguments
Tempo.extend(
  [PluginA, PluginB], 
  PluginC, 
  { debug: true } // applied to A, B, and C
);
```

---

## 🤝 Need Help Writing a Plugin?

If you have a complex business requirement or need a high-performance plugin built to professional standards, we can help. Our team can design, implement, and verify custom Tempo extensions tailored to your specific domain.

**[Contact Magma Computing](https://github.com/magmacomputing)** to discuss your requirements.

- [Tempo Ticker Guide](./tempo.ticker.md): A deep dive into an "Async Generator" based plugin.
- [Tempo Terms Guide](./tempo.term.md): Documentation on the "Memoized Lookup" pattern for business logic.
