# Browser API Documentation

This section details the browser-specific utilities and API methods.

## WebStore (`webstore.class.ts`)

A wrapper around `localStorage` and `sessionStorage` that supports automatic serialization and merging.

### `WebStore.local` / `WebStore.session`
Static accessors for default `WebStore` instances.

### `get<T>(key: PropertyKey, dflt?: T): T | null`
Retrieves and deserializes a value from storage.

### `set(key: PropertyKey, obj: unknown, opt?: { merge: boolean }): WebStore`
Saves a value to storage. Supports merging for Object, Array, Map, and Set.

### `del(...keys: PropertyKey[]): WebStore`
Removes specified keys from storage.

## Tapper (`tapper.class.ts`)

A wrapper around HammerJS for managing single, double, and triple tap events.

### `new Tapper(elm: string, ...setup: (Callback | Tuple)[])`
Initializes tapper on an element with provided callbacks.

### `on(...events: (Callback | Tuple)[]): Tapper`
Adds event listeners for `SingleTap`, `DoubleTap`, or `TripleTap`.

### `off(...events: Tapper.EVENT[]): Tapper`
Removes specific event listeners.

## Mapper (`mapper.library.ts`)

Utilities for geolocation and Google Maps integration.

### `geoLocation(opts?: MapOpts): Promise<GeolocationPosition>`
Attempts to get the current device position. Stashes results to avoid redundant calls.

### `mapQuery(coords?: GeocoderRequest, opts?: MapOpts): Promise<GeocoderResponse>`
Queries Google Maps API for geocoding information.

### `mapAddress(coords?: GeocoderRequest, opts?: MapOpts): Promise<Record<string, string>>`
Returns a best-guess formatted address for the given coordinates.
