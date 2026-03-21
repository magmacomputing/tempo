# Pledge: Advanced Asynchronous Patterns

The `Pledge` utility is a specialized wrapper around `Promise.withResolvers()` designed for modern asynchronous workflows where promise management needs to be handled externally.

## 1. Basic Lifecycle

A `Pledge` provides direct access to its state and resolution methods.

```typescript
import { Pledge } from '@magmacomputing/tempo';

// 1. Instantiate
const p = new Pledge<string>('DataFetch');

// 2. Resolve or Reject externally
p.resolve('Success!'); 
// or p.reject(new Error('Failed'));

// 3. Await the promise anywhere
const result = await p.promise;
```

## 2. Advanced Callbacks

You can register lifecycle hooks during instantiation. These are useful for cross-cutting concerns like logging or resource cleanup.

```typescript
const p = new Pledge<string>({
  tag: 'Task-123',
  onResolve: (val) => console.log('Resolved with:', val),
  onReject:  (err) => console.error('Rejected with:', err),
  onSettle:  () =>    console.log('Pledge settled.')
});
```

*   **`onResolve`**: Triggered when `p.resolve()` is called.
*   **`onReject`**: Triggered when `p.reject()` is called.
*   **`onSettle`**: Triggered regardless of outcome (analogous to `finally`).

## 3. Debugging with Tags

Each `Pledge` can be assigned a `tag` string. This tag is included in logs and error messages if the `debug` or `catch` flags are set.

```typescript
// Enable debug logging for this instance
const p = new Pledge({ tag: 'DatabaseQuery', debug: true });

// If p is rejected, the tag will be included in the trace
p.reject('Timeout');
```

## 4. Global Configuration

You can set global defaults for all future `Pledge` instances using `Pledge.init()`.

```typescript
Pledge.init({
  debug: true,
  onSettle: () => GlobalSpinner.stop()
});
```

To reset to library defaults:
```typescript
Pledge.init({});
```

## 5. Automatic Cleanup (Symbol.dispose)

`Pledge` implements the `Disposable` interface. If a `Pledge` goes out of scope while still pending, it will automatically reject to prevent "hanging" async operations.

```typescript
{
  using p = new Pledge('ScopedOperation');
  // if p is not resolved/rejected by the end of this block, 
  // it is automatically rejected with "Pledge disposed".
}
```

## 6. State Accessors

*   **`p.state`**: Returns `'pending'`, `'resolved'`, or `'rejected'`.
*   **`p.isPending`**: `boolean`
*   **`p.isResolved`**: `boolean`
*   **`p.isRejected`**: `boolean`
*   **`p.isSettled`**: `boolean` (resolved or rejected)
*   **`p.status`**: Returns a snapshot of the full status object (tag, state, settled value, error).
