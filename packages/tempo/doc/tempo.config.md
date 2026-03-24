# Configuration Guide

**Tempo** provides a flexible, multi-tiered configuration system. Settings are applied in a specific order of precedence, allowing you to set broad defaults that can be refined at the application or instance level.

## Precedence Hierarchy

Settings are loaded in the following order (where later stages override earlier ones):
1.  **Library Defaults**: Sensible out-of-the-box baseline.
2.  **Persistent Storage**: Sticky user preferences (which merge into Defaults).
3.  **Global Discovery**: Enterprise-level setup discovered via `Symbol.for($Tempo)`.
4.  **Implicit/Explicit Initialization**: Baseline configuration via `Tempo.init()`.
5.  **Instance Constructor**: Specific overrides for a single `new Tempo()` call.

---

## 1. Persistent Configuration (`$Tempo`)

The first layer Tempo checks after its own internal defaults is persistent storage. This is ideal for "sticky" settings like a user's preferred timezone or locale that should persist across sessions without a database.

```javascript
// Write a preference to localStorage under the default key ('$Tempo')
Tempo.writeStore({ timeZone:'Australia/Sydney' });
// Write a preference to localStorage under the key 'userSettings'
Tempo.writeStore({ timeZone: 'America/New_York' }, 'userSettings');

// On the next page load or session, Tempo will use the default store ('$Tempo') automatically
// or to apply a different store on the next page load or session, initialize with that store:
Tempo.init({ store: 'userSettings' });
```

---

## 2. Global Discovery

To facilitate configuration in micro-frontend architectures or when using a `<script>` tag, Tempo automatically "discovers" a global configuration object before any instances are created.

### Using a Static Method (Recommended)
This is the most secure and ergonomic method to provide configuration, and is compatible with ESM hoisting.

```javascript
import { Tempo } from '@magmacomputing/tempo';

Tempo.extend({
   options: { timeZone: 'Europe/Paris' },
   timeZones: { 'MYTZ': 'Asia/Dubai' },
   formats: { 'myFormat': '{dd}!!{mm}!!{yyyy}' },
   terms: [ myCustomTermPlugin ]
 });
```

### Discovery Contract
Tempo looks for the following structure:

| Property | Type | Description |
| :--- | :--- | :--- |
| `options` | `Options \| (() => Options)` | Configuration options merged into global state. |
| `plugins` | `Plugin \| Plugin[]` | Modular plugins to be extended onto Tempo automatically. |
| `terms` | `TermPlugin \| TermPlugin[]` | Custom term plugins to be registered. |
| `timeZones` | `Record<string, string>` | Custom timezone aliases to be merged. |
| `formats` | `Record<string, string>` | Custom format strings to be merged into `Tempo.FORMAT`. |

---

## 3. Explicit Initialization (`Tempo.init`)

This is the **Standard Developer Tier**. Most applications should call `Tempo.init()` during startup to establish a predictable baseline for all instances.

```javascript
import { Tempo } from '@magmacomputing/tempo';

Tempo.init({
  timeZone: 'Australia/Sydney',
  locale: 'en-AU',
  pivot: 80,
  debug: false
});
```

### Available Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `timeZone` | `string` | System Zone | Default IANA time zone or alias. |
| `locale` | `string` | System Locale | Default BCP 47 language tag. |
| `calendar` | `string` | `'iso8601'` | Default calendar system. |
| `pivot` | `number` | `75` | Cutoff for parsing two-digit years. |
| `timeStamp`| `'ms' \| 'ns'` | `'ms'` | Precision for timestamps. |
| `sphere` | `'north' \| 'south'`| Auto-inferred (from timezones's daylight savings) Hemisphere for seasonal plugins. |
| `debug` | `boolean` | `false` | Enables internal log tracking. |
| `catch` | `boolean` | `false` | If true, invalid inputs return a Void instance. |

---

## 4. Instance-Level Overrides

The final layer of precedence is the constructor itself. You can override *any* global setting for a specific calculation without affecting the rest of your application.

```javascript
// This instance uses UTC regardless of any global configuration
const t = new Tempo('now', { timeZone: 'UTC' });
```

---

## 5. Advanced: Parsing Rules

Beyond basic settings, you can extend Tempo's intelligence by supplying custom **Events** (date aliases) and **Periods** (time aliases) at any global configuration tier.

```javascript
Tempo.init({
  event: {
    'launch date': '2026-05-20',
    'deadline': function () { return this.add({ days: 30 }) }
  },
  period: {
    'tea time': '15:00',
    'mid[ -]?after[ -]?noon': '16:00',  // regex-like key for 'mid after noon' or 'mid-after-noon' etc
  }
})

const delivery = new Tempo('deadline'); // Parsed using your custom logic
```

---

## 📊 Summary of Tiers

| Tier | Precedence | Best For... |
| :--- | :--- | :--- |
| **Defaults** | 🐚 Baseline | Out-of-the-box reasonable settings. |
| **Persistence**| 🏅 Low (Default) | Sticky user preferences (merges into baseline). |
| **Discovery** | 🥉 Medium | Micro-frontends and third-party integrations. |
| **Global Init** | 🥈 High | Standard baseline for the whole application. |
| **Instance** | 🥇 Highest | Ad-hoc overrides for specific calculations. |

> [!TIP]
> **Observability**: When `debug: true` is set, Tempo logs its discovery path to the console (e.g., "Global Discovery found via Symbol"), making it easy to trace exactly where a setting originated.

> [!NOTE]
> **Hidden Keys**: The `tempo.config` getter excludes internal properties like `anchor` and input-only properties like `value` to keep the public API clean. These properties are still used internally for relative date resolution and instance hydration.

---

## 📅 TimeZone Registry

Tempo includes a built-in registry of common timezone abbreviations. These are automatically translated to IANA strings before being passed to the underlying engine.

| Alias | IANA Identifier |
| :--- | :--- |
| `utc` | `UTC` |
| `gmt` | `Europe/London` |
| `est` | `America/New_York` |
| `cst` | `America/Chicago` |
| `mst` | `America/Denver` |
| `pst` | `America/Los_Angeles` |
| `aest` | `Australia/Sydney` |
| `acst` | `Australia/Adelaide` |
| `awst` | `Australia/Perth` |
| `nzt` | `Pacific/Auckland` |
| `cet` | `Europe/Paris` |
| `eet` | `Europe/Helsinki` |
| `ist` | `Asia/Kolkata` |
| `npt` | `Asia/Kathmandu` |
| `jst` | `Asia/Tokyo` |

> [!TIP]
> You can extend this list or override existing aliases using `Tempo.extend({ timeZones: { ... } })`.
