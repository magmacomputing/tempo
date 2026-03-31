# Tempo Ticker

`Tempo.ticker` is an optional plugin (provided in the project) that creates a reactive stream of `Tempo` instances at regular intervals. It is designed to be high-performance and lightweight, providing a simple way to build clocks, countdowns, or scheduled updates.

## Installation

To use the ticker, you must first extend the core `Tempo` class with the `TickerPlugin`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '@magmacomputing/tempo/plugins/ticker';

Tempo.extend(TickerPlugin);
```

## 🚀 Enhancements

The ticker now supports a unified **Options** object, enabling professional resource management and semantic duration-based intervals.

### 1. Semantic Intervals (Duration Objects)
Instead of raw milliseconds, you can use `Temporal.DurationLike` objects for clarity. This is especially powerful for variable-length intervals like **months**.

```typescript
// Pulse exactly once a month
await using monthly = Tempo.ticker({ interval: { months: 1 } });
```

### 2. Stop Conditions (Resource Management)
Prevent memory leaks and runaway processes by setting a built-in termination condition.

```typescript
// Pattern A: Stop after exactly 5 ticks (defaults to 1s interval)
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

> [!WARNING]
> If using `const` or `let` instead of `using` / `await using`, you **must** call the returned `stop()` function (or call `.return()` on the generator) to clear the interval manually and prevent memory leaks.

### 3. Virtual Clock (Seeding)

To create a **Virtual Clock** that increments from a specific point rather than using the system time, use the `seed` option:

```typescript
// Starts at '2024-01-01', then increments by 1 day per pulse
await using daily = Tempo.ticker({ 
  interval: { days: 1 }, 
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
Creates a reactive stream of `Tempo` instances at regular intervals. Defaults to a **1-second** interval if omitted.

#### `TickerOptions`
| Property | Type | Description |
| :--- | :--- | :--- |
| `interval` | `number \| DurationLike` | Pulse frequency (**seconds** if number). Defaults to 1s. |
| `seed` | `DateTime \| Options` | Starting point for the virtual clock. |
| `limit` | `number` | Stop after X number of ticks. |
| `until` | `DateTime` | Stop when virtual clock reaches this point. |
| `...Duration` | `DurationLike` | Flattened duration keys (seconds, minutes, etc.) |

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
