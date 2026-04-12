# Tempo Ticker

`Tempo.ticker` is an optional plugin (provided in the project) that creates a reactive stream of `Tempo` instances at regular intervals. It is designed to be high-performance and lightweight, providing a simple way to build clocks, countdowns, or scheduled updates.

## Installation

To use the ticker, simply import the module as a side effect or import the `TickerModule` directly. Both methods automatically register the `Tempo.ticker()` method with the core library:

```typescript
// Pattern A: One-line activation (Side effect)
import '@magmacomputing/tempo/ticker';

// Pattern B: Explicit Module (Recommended)
import { Tempo } from '@magmacomputing/tempo/core';
import { TickerModule } from '@magmacomputing/tempo/ticker';

Tempo.extend(TickerModule);
```

### Direct Access
If you need to access the [Reporting & Registry](#reporting--registry) API (like `Ticker.active`), you should import the `Ticker` namespace:

```typescript
import { Ticker } from '@magmacomputing/tempo/ticker';

console.log(Ticker.active);
```

## 🚀 Enhancements

The ticker now supports a unified **Options** object, enabling professional resource management and semantic duration-based intervals.

### 1. Semantic Intervals (Duration Objects)
Instead of raw numeric seconds, you can use `DurationLike` objects for clarity. This is especially powerful for variable-length intervals like **months**.

```typescript
// Pulse exactly once a month
await using monthly = Tempo.ticker({ months: 1 });

// Pulse every time a new #quarter begins
await using quarterly = Tempo.ticker({ '#quarter': 1 });
```

### 2. Term-Based Intervals
Ticker intervals can now be driven by any registered **Term**. This is powerful for syncing with business cycles or daily shifts.

```typescript
// Pulse at the start of every 'morning', 'afternoon', etc.
using shiftTicker = Tempo.ticker({ '#period': 1 }, (t) => {
  console.log(`New period started: ${t.term.per}`);
});
```

### 3. Stop Conditions (Resource Management)
Prevent memory leaks and runaway processes by setting a built-in termination condition.

```typescript
// Pattern A: Stop after exactly 5 ticks (defaults to 1-second interval)
using tickerA = Tempo.ticker({ limit: 5 }, (t) => console.log(t));

// Pattern B: Stop when a specific virtual time is reached (Inclusive)
using tickerB = Tempo.ticker({ 
  seconds: 10,               // Plural DurationLike property
  until: '2024-12-25T12:00:00' 
}, (t) => console.log(t));

// Pattern C: Stop immediately (Limit: 0 is strictly honored)
using tickerC = Tempo.ticker({ limit: 0 }); 
```

### 4. Virtual Clock (Seeding)
To create a **Virtual Clock** that increments from a specific point rather than using the system time, use the `seed` option:

```typescript
// Starts at '2024-01-01', then increments by 1 day per pulse
await using daily = Tempo.ticker({ 
  days: 1, 
  seed: '2024-01-01' 
});
```

### 5. Backwards Tickers (Countdowns)
By providing a **negative** interval, you can create a ticker that moves backwards in time. 

```typescript
// Count down from 10 seconds, moving backwards 1s at a time
using countdown = Tempo.ticker({ seconds: -1, seed: "00:00:10" }, (t, stop) => {
  console.log(t.format('ss'));
  if (t.ss === 0) stop(); 
});
```

## Usage Patterns

### 1. Resource Management (Recommended)

Using the `using` and `await using` keywords ensures that tickers are automatically stopped when they go out of scope.

```typescript
// Pattern A: Automatic cleanup for callback-based ticker
{
  using ticker = Tempo.ticker((t) => render(t)); // Defaults to a 1-second pulse
} // interval stops automatically here

// Pattern B: Automatic cleanup for async generator
{
  await using ticker = Tempo.ticker(1);
  for await (const t of ticker) {
    if (done) break;
  }
} // generator is closed and interval stops here
```

### 2. Manual Control (Programmatic Stop)

If you are not using the `using` or `await using` keywords, or if you need to stop the ticker from outside its own loop (e.g., in a separate event handler), you can manually call the `stop()` method on the ticker object.

```typescript
// Pattern A: Stop a callback-based ticker
const tickerA = Tempo.ticker(1, (t) => console.log(t));
// ... later
tickerA.stop();

// Pattern B: Stop an async generator externally
const tickerB = Tempo.ticker(1);

(async () => {
  for await (const t of tickerB) {
    console.log(t.toString());
  }
  console.log('Ticker has been gracefully stopped.');
})();

// Close the generator from somewhere else
setTimeout(() => {
  tickerB.stop();
}, 5000);
```
### 3. Event Listeners (.on)
Instead of (or in addition to) the constructor callback, you can register listeners for the `'pulse'` event.

```typescript
const ticker = Tempo.ticker(1);
ticker.on('pulse', (t) => console.log('Listener A:', t));
ticker.on('pulse', (t) => console.log('Listener B:', t));
```

### 4. Manual Pulsing (.pulse)
In some scenarios, you may want to drive a ticker manually (e.g., from a UI event or a WebSocket message) while still benefiting from the ticker's internal state management and listeners.

```typescript
const ticker = Tempo.ticker({ seconds: 1 }); // Still has a 1s duration logic
// ...
ticker.pulse(); // Manually advance and notify listeners
```

### 5. Reporting & Management
The `Ticker` class provides a centralized way to monitor all active (non-stopped) tickers. This is essential for debugging and ensuring that resources are properly disposed.

#### Ticker.active
A static getter that returns an array of snapshots for every live ticker.

```typescript
import { Ticker } from '@magmacomputing/tempo/ticker';

// Monitor all active tickers
const monitoring = Ticker.active;

console.log(`There are ${monitoring.length} active tickers.`);

monitoring.forEach(({ ticks, next, interval }) => {
  console.log(`- Pulsed ${ticks} times. Next at: ${next}. Interval:`, interval);
});
```

## 🧟 Zombie Tickers (Warning)

In a Node.js environment, `Tempo.ticker()` uses background timers (`setTimeout`) to drive its pulses. If you do not explicitly stop a ticker, it becomes a **"Zombie Ticker"** that continues to run indefinitely, even if the variable that created it has gone out of scope.

### The Risks:
- **Process Hangs**: Node.js will not exit a process if there are active timers. Undisposed tickers are a common cause of "mysterious hangs" at the end of test runs.
- **Test Inconsistency**: Leaked tickers can continue to fire while subsequent tests are running, leading to flaky assertions and "impossible" state changes.
- **Memory Leaks**: Each active ticker maintains closures that prevent garbage collection of the `Tempo` instance and its listeners.

### The Solution:
Always use the **Disposer Pattern** (`using` or `await using`) or a `try...finally` block to guarantee cleanup:

```typescript
// ✅✅ BEST: Automatic cleanup via 'using'
{
  using ticker = Tempo.ticker(1);
  // ... logic ...
} // Stays clean: ticker stopped automatically here

// ✅ GOOD: Manual cleanup in finally block (Required for captured variables)
let ticker;
try {
  ticker = Tempo.ticker(1, (t) => { ... });
  // ... assertions ...
} finally {
  ticker?.stop(); // Prevents "Zombie Tickers" even if assertions fail
}
```

> [!WARNING]
> If you are using `const` or `let` without a `finally` block, an assertion failure will skip the `stop()` call, leaving a live timer in the event loop. Always prefer the `using` keyword or `try...finally` for industrial-grade resource management.

---

### `Ticker` Object
The object returned by `Tempo.ticker()` (or an instance of the `Ticker` class) implements the following interface:

| Method / Property | Description |
| :--- | :--- |
| `on(event, cb)` | Registers a listener for the `'pulse'` event. |
| `pulse()` | Manually triggers a pulse, advances state, and notifies listeners. Returns the new `Tempo`. |
| `info` | Read-only getter returning `{ next, ticks, limit, interval, stopped }`. |
| `stop()` | Stops the ticker, clears active timers, and immediately resolves any pending async iteration Promises. |
| `[Symbol.dispose]` | Standard cleanup for `using` blocks. |
| `[Symbol.asyncDispose]` | Standard async cleanup for `await using` blocks. |
| `[Symbol.asyncIterator]` | Standard async iteration support (for `for await` loops). |

---

## 📊 Reporting & Registry

The `Ticker` class maintains a static registry of all currently active tickers. This is useful for debugging, monitoring, or cleanup checks.

### `Ticker.active`
A static getter that returns an array of [`Ticker.Snapshot`](#tickersnapshot) objects for all active (non-stopped) tickers.

```typescript
import { Ticker } from '@magmacomputing/tempo/ticker';

// Get a report of all running tickers
const reports = Ticker.active;

reports.forEach(({ ticker, next, ticks }) => {
  console.log(`Ticker ${ticker} next pulse: ${next}, ticks so far: ${ticks}`);
});
```

#### `Ticker.Snapshot`
```typescript
type Snapshot = {
  ticker: Instance;      // The Ticker instance (Proxy) itself
  next: Tempo;          // The next Tempo value to be emitted
  ticks: number;        // Number of pulses emitted so far
  limit?: number;       // The configured limit (if any)
  interval: object;     // The duration-based interval
  stopped: boolean;     // Whether the ticker is stopped
}
```

---

## 🎯 One-Shot Ticker (Meeting Alerts)

You can use the ticker as a "one-shot" timer for specific events by simply specifying a **seed** value. This is perfect for setting up a single alert (e.g., for a meeting) that cleans itself up immediately after firing.

> [!TIP]
> **Seed-Only Logic**: Providing a `seed` (as a string or in an options object) without any other duration-based keys (`seconds`, `minutes`, etc.) or a `limit` implies a `limit: 1`. 
> 
> Effectively, `Tempo.ticker('Fri 10am')` and `Tempo.ticker({ seed: 'Fri 10am' })` and `Tempo.ticker({ seed: 'Fri 10am', limit: 1 })` are all treated as one-shot tickers.
>
> **Inclusive Boundaries**: Termination conditions (`limit` and `until`) are **inclusive**. A ticker with `limit: 1` will pulse exactly once before stopping.

```typescript
// Pattern A: Implicit one-shot via string seed
Tempo.ticker('Friday 10am', (t) => {
  console.log(`Meeting alert: ${t.format('HH:mm')}`);
});

// Pattern B: Explicit one-shot via options
const event = { meeting: 'Friday 10am' };

Tempo.ticker({ 
  seed: { value: 'meeting', event }
}, (t) => {
  console.log(`Meeting alert: ${t.format('HH:mm')}`);
});
```

> [!IMPORTANT]
> **Future Seeds**: If the `seed` is in the future, the Ticker will remain dormant (waiting) until that time is reached. **Most Tickers emit an initial pulse immediately** (at the `seed` time or "now"), but a future seed will delay that first pulse until the specified time.

> [!CAUTION]
> **Persistence**: Ticker timers exist only **in-memory**. If the driving process (e.g., Node.js) terminates, any scheduled future pulses (including those from future seeds) are lost. For critical long-term scheduling, consider an external persistent job runner.

> [!WARNING]
> While `limit: 1` handles the stop condition automatically, always remember that if you are using long-running tickers without a limit, you **must** use the [Disposer Pattern](#zombie-tickers-warning) or manual `stop()` to avoid memory leaks and zombie processes.

---

## 🧭 Advanced: Syncing Multiple Clocks

If you need to show multiple timezones on a dashboard, avoid creating multiple tickers. Instead, use a single **Master Ticker** to drive all views. This prevents "drift" between the clocks and is much more efficient.

### Using Signals (Recommended)

Signals (from Preact, Solid, or Vue) are perfect for this "one source, many views" pattern.

```typescript
// 1. Master source of truth
const now = signal(new Tempo());

// 2. Drive the master from a single ticker
using _ = Tempo.ticker(1, (t) => now.value = t);

// 3. Derived timezones update automatically and stay 100% in sync
const sydney = computed(() => now.value.set({ timeZone: 'Australia/Sydney' }));
const london = computed(() => now.value.set({ timeZone: 'Europe/London' }));
```

### Using Async Generators (Framework-Agnostic)

If you are not using a reactive framework, you can use the same pattern with an `AsyncGenerator` to derive all clocks from a single pulse.

```typescript
// One generator, one interval, zero drift.
await using master = Tempo.ticker(1);

for await (const t of master) {
  const clocks = {
    sydney: t.set({ timeZone: 'Australia/Sydney' }),
    ny:     t.set({ timeZone: 'America/New_York' }),
    london: t.set({ timeZone: 'Europe/London' })
  };
  
  renderDashboard(clocks);
}
```
