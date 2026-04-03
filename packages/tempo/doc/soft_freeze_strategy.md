# Soft Freeze Strategy

The **Soft Freeze** is a design pattern used in the Tempo library to balance **Public Immutability** with **Internal Extensibility**. It ensures that shared registries (like `NUMBER`, `FORMAT`, or `DURATION`) are read-only for users while remaining mutable for internal library features like plugins and runtime updates.

## The Problem

Standard JavaScript `Object.freeze()` is a "Hard Freeze":
- **Pros**: Guaranteed immutability; prevents accidental state corruption.
- **Cons**: Impossible to extend. Once frozen, even the library itself cannot add new formats or number-words (e.g., via `Tempo.registryUpdate`).

An unfrozen object is even riskier:
- **Risk**: A user could accidentally write `NUMBER['one'] = 'two'`, which would break the library globally for all instances.

## The Solution: Soft Freeze

A Soft Freeze uses a **Read-Only Proxy** wrapped around a **Mutable Target**.

### 1. The Proxy (Public Shield)
The Proxy traps all mutation attempts (`set`, `deleteProperty`, `defineProperty`) and returns `false`. This makes the object look and feel like a frozen object to the public API.

### 2. The Target (Internal Source of Truth)
The underlying object remains mutable. It is NOT passed through `Object.freeze()`. This allows the library to perform controlled mutations when explicitly requested (e.g., during plugin registration).

### 3. Access Control ($Target Symbol)
The library uses a private `Symbol` called `$Target`. Only code with access to this symbol can "unwrap" the proxy to access the mutable underlying object.

---

## Implementation Details

### `proxy.library.ts`
The core logic resides in `proxify`, which now supports an optional `lock` parameter.

- **Hard Freeze** (`frozen=true, lock=true`): Both the proxy and the target are immutable.
- **Soft Freeze** (`frozen=true, lock=false`): The proxy is read-only, but the target stays mutable.

```typescript
export function proxify<T extends object>(target: T, frozen = true, lock = frozen) {
    const tgt = (target as any)[$Target] ?? target;         // unwrap proxy

    // Hard Freeze: prevent all mutation to the target
    if (lock) secure(tgt); 

    return new Proxy(tgt, {
        set: (_, key, val) => {
            // Soft Freeze: Proxy blocks mutation, but target stays mutable
            return frozen ? false : Reflect.set(tgt, key, val);
        },
        deleteProperty: (_, key) => {
            return frozen ? false : Reflect.deleteProperty(tgt, key);
        },
        // ... other traps
    });
}
```

### `enumerate.library.ts`
The `enumify` utility uses Soft Freeze by default for registries that are intended to be extensible.

```typescript
export function enumify(list, frozen = true) {
    const target = Object.create(proto, descriptors);
    
    // Default to Soft Freeze (frozen=true, lock=false)
    // if 'frozen' is passed as false, it signals 'extensible library registry'
    return proxify(target, true, frozen); 
}
```

## Benefits
1. **Bulletproof Public API**: Users cannot accidentally overwrite library constants.
2. **Library Extensibility**: Plugins can add new data to registries at runtime without bypasses or "hacks".
3. **Safe Global Discovery**: External discovery objects (via `Symbol.for($Tempo)`) can extend the library with new aliases but are prevented from overwriting core keys.
4. **Internal State Integrity**: Centralized `STATE` objects are protected from direct access while providing a single source of truth.
5. **Transparent Experience**: The object behaves like a POJO (Plain Old JavaScript Object) in the debugger and typical usage.

## The "Safe Merge" Rule

To prevent a global discovery object from "trashing" the registry, the library implements a **Safe Merge** rule for all shared states.

When merging external data (discovery or plugin):
- New keys are added.
- Existing keys are **preserved**.

This ensures that while the library is extensible, its fundamental building blocks (like `NUMBER['one']`) remain immutable and secure.
