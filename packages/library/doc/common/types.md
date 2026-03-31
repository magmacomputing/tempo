# Common Interface and Type Definitions

This document details the shared types and interfaces used throughout the library's common utilities.

## Core Type Guards

### `isPrimitive(obj?: unknown): obj is Primitive`
Generic check for primitive types.

### `isDefined<T>(obj: T): obj is NonNullable<T>`
Returns true if the value is not `null`, `undefined`, or `void`.

### `isEmpty<T>(obj?: T): boolean`
Returns true if an object, array, set, or map has no values, or if a string is empty, or a number is `NaN`.

## Utility Types

### `Primitive`
A union of `string | number | bigint | boolean | symbol | void | undefined | null`.

### `Nullable<T>` / `Nullish`
`Nullable<T>` is a generic for `T | null`.  
`Nullish` is the bottom-value union: `null | undefined | void`.

### `Property<T>`
A generic record: `Record<PropertyKey, T>`.

### `TypeValue<T>`
A structured type representation: `{ type: Type, value: T }`.

### `Type`
A union of all supported types including `'String'`, `'Number'`, `'BigInt'`, `'Object'`, `'Array'`, `'Date'`, `'Map'`, `'Set'`, `'EnumIFY'`, `'Pledge'`, `'Tempo'`, etc.

## Advanced Types

### `Entry<T>` / `Entries<T>`
Strongly typed replacements for `Object.entries`.

### `Secure<T>`
Deeply `readonly` version of an object or array.

### `Branded<T, B>`
Creates a branded type for nominal typing.

### `IntRange<Lower, Upper>`
Defines a numeric range (inclusive).

### `MaxLength<T, Max>` / `MinLength<T, Min>`
Type-level string length constraints.
