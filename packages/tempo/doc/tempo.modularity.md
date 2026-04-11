# Tempo Modularity

Tempo v2.1 is designed as a modular library, allowing you to include only the features you need. This reduces the core bundle size and prevents your application from being polluted with unused functionality.

## Core vs. Full

* **@magmacomputing/tempo/core**: The bare-bones Tempo engine. Includes parsing, basic getters, and internal state management.
* **@magmacomputing/tempo**: The "batteries included" version. Includes all standard modules (Duration, Format, Ticker, Term Registry, etc.).

## Available Modules

### Duration Module
Adds support for `.until()` and `.since()` instance methods, as well as the static `Tempo.duration()` factory.

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { DurationModule } from '@magmacomputing/tempo/duration';

Tempo.extend(DurationModule);

// Now you can use duration methods
const d = Tempo.duration('P1Y');
```

### Format Module
Adds support for the `.format()` method and custom layout resolution.

### Ticker Module
Adds support for reactive time-pulsing via the static `Tempo.ticker()` method.

## Custom Modules

You can create your own modules using `defineModule` and `defineInterpreterModule`.

```typescript
import { defineModule } from './plugins/plugin.util.js';

export const MyModule = defineModule((options, TempoClass) => {
    // extend TempoClass or its prototype here
});
```
