# Tempo Ticker

`Tempo.ticker` is an optional plugin (provided in the project) that creates a reactive stream of `Tempo` instances at regular intervals. It is designed to be high-performance and lightweight, providing a simple way to build clocks, countdowns, or scheduled updates.

## Installation

To use the ticker, simply import the plugin as a side-effect. This automatically registers the `Tempo.ticker()` method with the core library:

```typescript
import '@magmacomputing/tempo/plugins/ticker';
import { Tempo } from '@magmacomputing/tempo';

// Ticker is now available!
```

## 🚀 Enhancements

The ticker now supports a unified **Options** object, enabling professional resource management and semantic duration-based intervals.

### 1. Semantic Intervals (Duration Objects)
Instead of raw numeric seconds, you can use `Temporal.DurationLike` objects for clarity. This is especially powerful for variable-length intervals like **months**.

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

### 2. Stop Conditions (Resource Management)
Prevent memory leaks and runaway processes by setting a built-in termination condition.

```typescript
// Pattern A: Stop after exactly 5 ticks (defaults to 1-second interval)
using tickerA = Tempo.ticker({ limit: 5 }, (t) => console.log(t));

// Pattern B: Stop when a specific virtual time is reached
using tickerB = Tempo.ticker({ 
  seconds: 10,               // Plural DurationLike property
  until: '2024-12-25T12:00:00' 
}, (t) => console.log(t));
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

If you are not using the `using` or `await using` keywords, or if you need to stop the ticker from outside its own loop (e.g., in a separate event handler), you can manually call the `stop()` function (for callbacks) or the `.return()` method (for generators).

```typescript
// Pattern A: Stop a callback-based ticker
const stop = Tempo.ticker(1, (t) => console.log(t));
// ... later
stop();

// Pattern B: Stop an async generator externally
const ticker = Tempo.ticker(1);

(async () => {
    for await (const t of ticker) {
        console.log(t.toString());
    }
    console.log('Ticker has been gracefully stopped.');
})();

// Close the generator from somewhere else
setTimeout(async () => {
    await ticker.return(); 
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
// ✅ BEST: Automatic cleanup via 'using'
{
  using ticker = Tempo.ticker(1);
  // ... logic ...
} // Stays clean: ticker stopped automatically here

// ✅ GOOD: Manual cleanup in finally block (Required for captured variables)
let stop;
try {
  stop = Tempo.ticker(1, (t) => { ... });
  // ... assertions ...
} finally {
  stop?.(); // Prevents "Zombie Tickers" even if assertions fail
}
```

> [!WARNING]
> If you are using `const` or `let` without a `finally` block, an assertion failure will skip the `stop()` call, leaving a live timer in the event loop. Always prefer the `using` keyword or `try...finally` for industrial-grade resource management.

### 3. Virtual Clock (Seeding)

To create a **Virtual Clock** that increments from a specific point rather than using the system time, use the `seed` option:

```typescript
// Starts at '2024-01-01', then increments by 1 day per pulse
await using daily = Tempo.ticker({ 
  days: 1, 
  seed: '2024-01-01' 
});
```

### 4. Backwards Tickers (Countdowns)

By providing a **negative** interval, you can create a ticker that moves backwards in time. 

```typescript
// Count down from 10 seconds, moving backwards 1s at a time
using countdown = Tempo.ticker({ seconds: -1, seed: "00:00:10" }, (t, stop) => {
  console.log(t.format('ss'));
  if (t.ss === 0) stop(); 
});
```

---

## API Reference

### `Tempo.ticker(arg1?: number | string | bigint | TickerOptions, arg2?: Callback): TickerResult`
Creates a reactive stream of `Tempo` instances at regular intervals. Defaults to a **1-second** interval if no duration or interval properties are specified.

#### `TickerOptions`
| Property | Type | Description |
| :--- | :--- | :--- |
| `interval` | `number \| string \| bigint` | Pulse frequency (**seconds** if number). Defaults to 1s. |
| `seed` | `DateTime \| Options` | The starting point for the virtual clock. |
| `limit` | `number` | Auto-stop after X number of ticks. |
| `until` | `DateTime \| Options` | Auto-stop when virtual clock reaches this point. |
| `#term` | `number \| string` | Term-based interval (e.g., `#quarter: 1`, `#period: 'morning'`). |
| `...Duration` | `Partial<DurationLike>` | Flattened duration keys (e.g., `seconds: 5`, `minutes: 1`). |

### `Ticker` Object
The object returned by `Tempo.ticker()` implements the following interface:

| Method | Description |
| :--- | :--- |
| `on(event, cb)` | Registers a listener for the `'pulse'` event. |
| `pulse()` | Manually triggers a pulse, advances state, and notifies listeners. Returns the new `Tempo`. |
| `stop()` | Stops the ticker and clears any active timers. |
| `[Symbol.dispose]` | Standard cleanup for `using` blocks. |
| `next()` | Awaits the next pulse (for `AsyncGenerator` usage). |

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
