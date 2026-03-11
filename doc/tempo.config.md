# Configuration Guide

**Tempo** is designed to work out-of-the-box with sensible defaults, but it provides a flexible system for global and instance-level configuration.

## 1. Global Configuration (`Tempo.init`)

The easiest and most common way to configure Tempo is by calling the static `init()` method at the start of your application (e.g., in your `main.js`, `index.ts`, or `App.tsx`).

```javascript
import { Tempo } from '@magmacomputing/tempo';

Tempo.init({
  timeZone: 'Australia/Sydney', // Default timezone for all instances
  locale: 'en-AU',              // Default locale for formatting
  pivot: 80,                    // Custom pivot for parsing 2-digit years
  debug: false                  // Enable/disable debug logging
});
```

### Available Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `timeZone` | `string` | System Zone | Default IANA time zone or alias (e.g., 'AEST'). |
| `locale` | `string` | System Locale | Default BCP 47 language tag (e.g., 'en-US'). |
| `calendar` | `string` | `'iso8601'` | Default calendar system. |
| `pivot` | `number` | `75` | The "sliding window" cutoff for parsing two-digit years. |
| `timeStamp`| `'ms' \| 'ns'` | `'ms'` | Precision for `.ts` and `.now()` (milliseconds or nanoseconds). |
| `sphere` | `'north' \| 'south'`| Auto-detected | Used currently for seasonal/quarterly plugins. |
| `debug` | `boolean` | `false` | Enables internal log tracking. |
| `catch` | `boolean` | `false` | If true, invalid inputs return a "Void" Tempo instead of throwing. |

> [!TIP]
> **Non-standard options**: Any additional keys provided to `init()` or the constructor are preserved and accessible via `this.config` in instances and plugins. This is particularly useful for passing custom settings to your Terms plugins.

## 2. Instance-Level Configuration

You can override any global setting for a specific instance by passing an options object to the constructor.

```javascript
// This instance uses UTC regardless of global settings
const t = new Tempo('now', { timeZone: 'UTC' });
```

## 3. Persistent Configuration (localStorage for Browser, process.env for NodeJS)

If you are working in a browser environment, Tempo can automatically persist and reload its configuration using external storage.

```javascript
// Write to localStorage under the key 'myAppConfig'
Tempo.writeStore({ timeZone: 'America/New_York' }, 'myAppConfig');

// Later, or in another session:
Tempo.init({ store: 'myAppConfig' });
```

## 4. Global Discovery

To make configuration as easy as possible (especially when using Tempo via a `<script>` tag or in micro-frontend architectures), Tempo automatically discovers global configuration objects when it initializes.

### Absolute Safety (Recommended) 
The most secure way to provide global configuration is via the global Symbol registry. This prevents namespace collisions and accidental clobbering by other libraries.

```javascript
import { $Tempo } from '@magmacomputing/tempo';

globalThis[Symbol.for($Tempo)] = {
  options: { timeZone: 'Europe/Paris' },
  timeZones: { 'MYTZ': 'Asia/Dubai' },
  terms: [ myCustomTermPlugin ]
}
```

### Discovery Contract
Tempo strictly follows the `Discovery` interface when performing global lookups.

| Property | Type | Description |
| :--- | :--- | :--- |
| `options` | `Options \| (() => Options)` | Configuration options merged into `Tempo.#global`. |
| `terms` | `TermPlugin \| TermPlugin[]` | Custom term plugins to be registered. |
| `timeZones` | `Record<string, string>` | Custom timezone aliases to be merged. |

> [!TIP]
> Discovery occurs automatically during the first use of Tempo or when calling `Tempo.init()` without arguments.

## 5. Advanced Configuration (Parsing Rules)

You can also extend Tempo's parsing intelligence by adding custom **Events** (date aliases) and **Periods** (time aliases).

```javascript
Tempo.init({
  event: {
    'launch date': '2026-05-20',
    'deadline': () => new Tempo().add({ days: 30 })
  },
  period: {
    'tea time': '15:30',
    'happy hour': '5:00pm'
  }
})

const delivery = new Tempo('deadline'); // Parsed using your custom logic
```

### Configuration Tiers

Tempo provides multiple ways to handle configuration, each targeting a specific use case:

1.  **Global Discovery (`Symbol.for($Tempo)`)**: The **Power User / Enterprise** tier. Essential for micro-frontends and third-party integrations where you need to configure Tempo *before* the library loads, avoiding namespace collisions.
2.  **Explicit Initialization (`Tempo.init`)**: The **Developer Standard**. This is the recommended approach for most applications to set a baseline configuration during startup.
3.  **Persistent Storage (`$Tempo`)**: The **Persistence Layer**. A specialized feature for "sticky" user preferences (like a preferred timezone) that persists across page reloads without a backend.
4.  **Instance Constructor (`new Tempo`)**: The **Instance Tier**. The standard way to override global settings for a specific date-time calculation.

> [!TIP]
> **Observability**: When `debug: true` is set in your configuration, Tempo will log its discovery path to the console (e.g., "Global Discovery found via Symbol", "merging from store"), making it easy to trace exactly where a setting originated.

---

### Industry Standard Recommendation

For most projects, the **Explicit Initialization** pattern (Option 1) is the best choice. It is clear, predictable, and works consistently across browsers, Node.js, and edge runtimes. 

If you find yourself needing to share configuration across multiple legacy scripts, consider creating a single `tempo.config.js` file that exports your configured `Tempo` class or a setup function.
