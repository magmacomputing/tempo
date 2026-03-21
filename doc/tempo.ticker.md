# Tempo Ticker

`Tempo.ticker` is an optional plugin that creates a reactive stream of `Tempo` instances at regular intervals. It is designed to be high-performance and lightweight, providing a simple way to build clocks, countdowns, or scheduled updates.

## Installation

To use the ticker, you must first extend the core `Tempo` class with the `TickerPlugin`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '@magmacomputing/tempo/tempo.config/plugins/plugin.ticker';

Tempo.extend(TickerPlugin);
```

## Usage Patterns

The ticker supports several modern patterns to fit your development style.

### 1. Resource Management (Recommended)

Using the `using` and `await using` keywords (Explicit Resource Management) ensures that tickers are automatically stopped when they go out of scope, preventing memory leaks without manual cleanup.

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Pattern A: Automatic cleanup for callback-based ticker
{
  using ticker = Tempo.ticker(1000, (t) => render(t));
} // interval stops automatically here

// Pattern B: Automatic cleanup for async generator
{
  await using ticker = Tempo.ticker(1000);
  for await (const t of ticker) {
    if (done) break;
  }
} // generator is closed and interval stops here
```

> [!WARNING]
> If using `const` or `let` instead of `using` / `await using`, you **must** call the returned `stop()` function (or call `.return()` on the generator) to clear the interval and avoid memory leaks.

### 2. Virtual Clock (Seeding)

You can "seed" the ticker with a starting date-time or a set of `Tempo.Options`. This transforms the ticker into a **Virtual Clock** that increments from the seed point rather than using the system time. 

**Note on Timing**: All tickers (seeded or not) emit their initial state **immediately** upon initialization. Subsequent emissions happen at the specified interval.

### 3. Backwards Tickers (Countdowns)

By providing a **negative** `intervalMs`, you can create a ticker that moves backwards in time. This is useful for building count-down timers or simulating reverse-time flows.

```typescript
// Count down from 10 seconds past midnight, moving backwards 1s at a time
Tempo.ticker(-1000, "00:00:10", (t, stop) => {
  console.log(t.format('ss'));
  if (t.ss === 0) stop(); // stop at zero using the internal stop() function
});
```

```typescript
// Pattern A: Seed with a date string
// Starts at '2024-01-01', then '2024-01-01 + 1s', etc.
for await (const t of Tempo.ticker(1000, '2024-01-01')) {
  console.log(t.format());
}

// Pattern B: Seed with Options (e.g. for a specific TimeZone)
// Emits 'now' in New York, then 'now + 1s', etc. 
// Every tick is automatically adjusted for the timezone (including DST).
const nyTicker = Tempo.ticker(1000, { timeZone: 'America/New_York' });
```

#### Why Seeding is Useful:

- **Multi-Timezone Dashboards**: Easily create live clocks for different regions by seeding with `{ timeZone: '...' }`.
- **Simulation/Replay**: Seed with a historical timestamp to replay data or run simulations at a relative pace.
- **Countdown/Up Timers**: Track elapsed time from a fixed anchor date.
- **Testing Edge Cases**: Verify UI behavior around specific events (e.g. DST transitions) by seeding the ticker just before the event.

### 3. Manual Callback Subscription

A familiar pattern for UI frameworks or simple event-driven logic. It returns a `stop()` function to cleanly cancel the interval.

```typescript
// start a ticker
const stop = Tempo.ticker(1000, (t) => {
  document.getElementById('clock').innerText = t.format('{hh}:{mi}:{ss}');
});

// stop it later
stop();
```

## Performance

`Tempo.ticker` is optimized for zero-overhead:
- **No extra dependencies**: Relies on native `setInterval` and `AsyncGenerators`.
- **Instance-per-tick**: Every tick emits a fresh, immutable `Tempo` instance reflecting the exact time of the event.
- **Automatic Efficiency**: Each tick instance is automatically **cloned** (via `.clone()`) to minimize memory footprint and keep the internal parse history lean.
- **Explicit Disposal**: Implements `Symbol.dispose` and `Symbol.asyncDispose` for safe resource management.

## API Reference

### `Tempo.ticker(intervalMs: number, seed?: Tempo.DateTime | Tempo.Options): AsyncGenerator<Tempo> & AsyncDisposable`
Creates an infinite stream of `Tempo` instances. If `seed` is provided (as a date or options object), it increments from that point.

### `Tempo.ticker(intervalMs: number, seed?: Tempo.DateTime | Tempo.Options, callback: (t: Tempo) => void): (() => void) & Disposable`
Starts a recurring timer and returns a function to stop it. The first callback is immediate. If `intervalMs` is negative, the ticker moves backwards in time.
