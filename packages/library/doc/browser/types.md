# Browser Interface and Type Definitions

This document details the types and interfaces used by the browser-specific API.

## Storage Types (`webstore.class.ts`)

### `STORAGE`
Enum-like object for identifying storage type: `'local' | 'session'`.

## Tapper Types (`tapper.class.ts`)

### `Tapper.EVENT`
Enum for supported tap events:
- `SingleTap`: `'singleTap'`
- `DoubleTap`: `'doubleTap'`
- `TripleTap`: `'tripleTap'`

### `Tapper.Callback`
A function signature for tap event handlers: `(evt: HammerInput) => void`.

### `Tapper.Tuple`
A convenience type for registering events: `[Tapper.EVENT, Tapper.Callback]`.

## Mapper Types (`mapper.library.ts`)

### `MapOpts`
Options for mapping functions:
- `catch?: boolean` (Interprets Promise reject as resolve)
- `debug?: boolean` (Enables logging)

### `MapStore`
Internal interface for cached geolocation and geocoder results.
