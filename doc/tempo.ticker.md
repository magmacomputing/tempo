# Tempo Ticker

`Tempo.ticker` is a static method that creates a reactive stream of `Tempo` instances at regular intervals. It is designed to be high-performance and lightweight, providing a simple way to build clocks, countdowns, or scheduled updates.

## Usage Patterns

The ticker supports two modern patterns to fit your development style.

### 1. Async Generator (Stream)

The most modern approach, perfect for `for await...of` loops. This allows you to treat time as an asynchronous stream.

```typescript
import { Tempo } from '@magmacomputing/tempo';

// emit a new Tempo instance every second
for await (const t of Tempo.ticker(1000)) {
  console.log(t.format('{hh}:{mi}:{ss}'));
}
```

### 2. Callback Subscription (Hook)

A familiar pattern for UI frameworks (React, Vue, etc.) or simple event-driven logic. It returns a `stop()` function to cleanly cancel the interval.

```typescript
import { Tempo } from '@magmacomputing/tempo';

// start a ticker
const stop = Tempo.ticker(1000, (t) => {
  document.getElementById('clock').innerText = t.format('{hh}:{mi}:{ss}');
});

// stop it later (e.g. on component unmount)
stop();
```

## Performance

`Tempo.ticker` is optimized for zero-overhead:
- **No extra dependencies**: Relies on native `setInterval` and `AsyncGenerators`.
- **Instance-per-tick**: Every tick emits a fresh, immutable `Tempo` instance reflecting the exact time of the event.
- **Explicit Disposal**: The callback pattern provides a direct unsubscribe function to prevent memory leaks.

## API Reference

### `Tempo.ticker(intervalMs: number): AsyncGenerator<Tempo>`
Creates an infinite stream of `Tempo` instances.

### `Tempo.ticker(intervalMs: number, callback: (t: Tempo) => void): () => void`
Starts a recurring timer and returns a function to stop it.
