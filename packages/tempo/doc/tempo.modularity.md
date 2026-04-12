# Tempo Modularity

Tempo is designed as a modular library, allowing you to include only the features you need. This reduces the core bundle size and prevents your application from being polluted with unused functionality.

## Core vs. Full

* **@magmacomputing/tempo/core**: The bare-bones Tempo engine. Includes parsing, basic getters, and internal state management.
* **@magmacomputing/tempo**: The "batteries included" version. Includes all standard modules (Duration, Format, Ticker, Term Registry, etc.).

## Available Modules

### Duration Module (@magmacomputing/tempo/duration)
Adds support for `.until()` and `.since()` instance methods, as well as the static `Tempo.duration()` factory.

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { DurationModule } from '@magmacomputing/tempo/duration';

Tempo.extend(DurationModule);

// Bulk extension is also supported!
Tempo.extend(DurationModule, FormatModule, TickerModule);
```

### Format Module (@magmacomputing/tempo/format)
Adds support for the `.format()` method and custom layout resolution.

### Ticker Module (@magmacomputing/tempo/ticker)
Adds support for reactive time-pulsing via the static `Tempo.ticker()` method.

### Terms Module (@magmacomputing/tempo/term)
Adds support for semantic terms like `qtr`, `szn`, and `fiscal`. There are three ways to enable terms:

#### 1. The Side-Effect (Standard Activation)
Fastest way to enable all standard terms in a Core environment.
```typescript
import '@magmacomputing/tempo/term/standard'; // One-line activation
```

#### 2. The Explicit Module (Uniform Sync)
Recommended for consistency with other modules.
```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { TermsModule } from '@magmacomputing/tempo/term';

Tempo.extend(TermsModule);
```

#### 3. The Surgical Strike (Data-Only)
Best for maximum bundle-size optimization by picking only what you need.
```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { QuarterTerm } from '@magmacomputing/tempo/term/quarter';

Tempo.extend(QuarterTerm);
```

## Custom Modules

You can create your own modules to extend Tempo's internal engine or its public API.

```typescript
import { defineModule } from '@magmacomputing/tempo/plugin';

export const MyModule = defineModule((options, TempoClass) => {
    // Add instance methods
    TempoClass.prototype.sayHello = function() { return 'Hello!'; };
    
    // Add static methods
    (TempoClass as any).greet = () => 'Greetings!';
});
```

> [!IMPORTANT]
> **Dual Module Hazard**: If you are using `@magmacomputing/tempo/core` and `@magmacomputing/tempo` in the same project, ensure you use the `development` condition or consistent import paths to avoid registering the same classes twice.

## ⚠️ The Registration "Gotcha"

There is a subtle but important distinction between how features are activated in Core mode:

*   **`Tempo.extend(Module)`**: This is **Immediate and Explicit**. It applies the module to the class exactly when the line is executed. This is the safest pattern for most users.
*   **`Tempo.init()`**: This is **Reactive Discovery**. It scans the global registry for any plugin that were imported via side-effects (e.g., `import '@magmacomputing/tempo/ticker'`) and applies them all at once.

> [!CAUTION]
> **The "Sledge-Hammer" Effect**: `Tempo.init()` does not just add new features; it performs a **full state refresh**. It resets the `Tempo` prototype back to its pristine default before re-applying all registered plugin. If you have manually modified the `Tempo` prototype (via monkey-patching or `Object.defineProperty`), **`Tempo.init()` will wipe out your modifications.** Always use `Tempo.extend()` or a formal plugin if you want your changes to survive an initialization sweep.

**The Trap**: If you import a side-effect plugin *after* you have already called `Tempo.init()`, the feature will **not** appear on the `Tempo` class. You would need to call `Tempo.init()` again to "refresh" the engine's feature set and pick up the latecomers.

