# Configuration Guide

**Tempo** is designed to work out-of-the-box with sensible defaults, but it provides a flexible system for global and instance-level configuration.

## 1. Global Configuration (`Tempo.init`)

The easiest and most common way to configure Tempo is by calling the static `init()` method at the start of your application (e.g., in your `main.js`, `index.ts`, or `App.tsx`).

```javascript
import { Tempo } from '@magmacomputing/tempo';

Tempo.init({
  timeZone: 'Australia/Sydney', // Default timezone for all instances
  locale: 'en-AU',             // Default locale for formatting
  pivot: 80,                   // Custom pivot for 2-digit years
  debug: false                 // Enable/disable debug logging
});
```

### Available Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `timeZone` | `string` | System Zone | Default IANA time zone or alias (e.g., 'AEST'). |
| `locale` | `string` | System Locale | Default BCP 47 language tag (e.g., 'en-US'). |
| `calendar` | `string` | `'iso8601'` | Default calendar system. |
| `pivot` | `number` | `75` | The "sliding window" cutoff for two-digit years. |
| `timeStamp`| `'ms' \| 'ns'` | `'ms'` | Precision for `.ts` and `.now()` (milliseconds or nanoseconds). |
| `sphere` | `'north' \| 'south'`| Auto-detected | Used for seasonal/quarterly plugins. |
| `debug` | `boolean` | `false` | Enables internal log tracking. |
| `catch` | `boolean` | `false` | If true, invalid inputs return a "Void" Tempo instead of throwing. |

## 2. Instance-Level Configuration

You can override any global setting for a specific instance by passing an options object to the constructor.

```javascript
// This instance uses UTC regardless of global settings
const t = new Tempo('now', { timeZone: 'UTC' });
```

## 3. Persistent Configuration (Browser Only)

If you are working in a browser environment, Tempo can automatically persist and reload its configuration using `localStorage`.

```javascript
// Write to localStorage under the key 'myAppConfig'
Tempo.writeStore({ timeZone: 'America/New_York' }, 'myAppConfig');

// Later, or in another session:
Tempo.init({ store: 'myAppConfig' });
```

## 4. Advanced Configuration (Parsing Rules)

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
});

const delivery = new Tempo('deadline'); // Parsed using your custom logic
```

---

### Industry Standard Recommendation

For most projects, the **Explicit Initialization** pattern (Option 1) is the best choice. It is clear, predictable, and works consistently across browsers, Node.js, and edge runtimes. 

If you find yourself needing to share configuration across multiple legacy scripts, consider creating a single `tempo.config.js` file that exports your configured `Tempo` class or a setup function.
