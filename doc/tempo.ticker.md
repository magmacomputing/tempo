# Tempo Ticker

`Tempo.ticker` is a static method that creates a reactive stream of `Tempo` instances at regular intervals. It is designed to be high-performance and lightweight, providing a simple way to build clocks, countdowns, or scheduled updates.

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

You can "seed" the ticker with a starting date-time. This transforms the ticker into a **Virtual Clock** that increments from the seed point rather than using the system time. The first value emitted is the seed itself (emitted immediately).

```typescript
// Starts at '2024-01-01', then '2024-01-01 + 1s', etc.
for await (const t of Tempo.ticker(1000, '2024-01-01')) {
  console.log(t.format());
}
```

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
- **Explicit Disposal**: Implements `Symbol.dispose` and `Symbol.asyncDispose` for safe resource management.

## API Reference

### `Tempo.ticker(intervalMs: number, seed?: Tempo.DateTime): AsyncGenerator<Tempo> & AsyncDisposable`
Creates an infinite stream of `Tempo` instances. If `seed` is provided, it increments from that point.

### `Tempo.ticker(intervalMs: number, seed?: Tempo.DateTime, callback: (t: Tempo) => void): (() => void) & Disposable`
Starts a recurring timer and returns a function to stop it. If `seed` is provided, the first callback is immediate.
