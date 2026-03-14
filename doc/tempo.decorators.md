# Tempo Decorators

Tempo includes a few custom TypeScript decorators that help enforce class behaviors such as immutability, serialization registration, and preventing instantiation.

> **Note on ES2022 Target & Transpilation**
> Currently, the TypeScript compiler target for Tempo is set to ES2022. Because native ECMAScript decorators are still maturing across Javascript engines, TypeScript transpiles these decorators away into standard function calls in the emitted Javascript code. Our long-term aim is to bring these decorators to first-class, native Javascript items once the ECMAScript decorator proposal is fully mature and widely implemented in engines without requiring down-level transpilation.

<br>

## Existing Decorators

These decorators are used internally throughout the Tempo codebase.

### `@Immutable`
This class decorator ensures that instances of the decorated class, as well as its static properties and prototype methods, are completely frozen and cannot be modified at runtime.

It works by wrapping the original class and calling `Object.freeze()` on the instance within the `constructor`, while using the `addInitializer` hook to freeze the static and prototype layers. This guarantees strict immutability, which is a core tenet of the `Tempo` class.

### `@Serializable`
This class decorator automatically registers a class with Tempo's internal Serialization `Registry`. 

When a class is decorated with `@Serializable`, Tempo's `stringify` method knows how to safely serialize instances of that class (by calling their `toString()` method if available), and `objectify` knows which constructor to use to rebuild the object when deserializing. This prevents complex class instances from degrading into plain JSON objects across boundaries.

### `@Static`
This class decorator explicitly prevents a class from being instantiated.

If a developer attempts to call `new MyStaticClass()`, the wrapped constructor intercepts the call and throws a `TypeError: MyStaticClass is not a constructor`. This is useful for grouping related pure-functions or constants together in a class namespace without relying on abstract classes or risking accidental instantiation.
