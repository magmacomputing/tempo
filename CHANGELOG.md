# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-23

### Added
- **Monorepo Migration**: Successfully transitioned to a unified monorepo structure, naming `packages/tempo` and `packages/library` as npm workspaces.
- **Publishing Optimizations**: Integrated `prepublishOnly` build hooks and `files` whitelisting in `package.json` for leaner and more reliable NPM distribution.
- **Enhanced Type Resolution**: Fixed `node` type definition errors in nested test environments by explicitly configuring `typeRoots`.

### Changed
- **Dependency Rationalization**: Consolidated `tslib` and `@js-temporal/polyfill` at the project root while preserving `tslib` as a runtime dependency for published packages.
- **Plugin Loading Refactor**: Refactored `static load` into a unified, single-pass dispatch logic for handling Plugins, TermPlugins, and Discovery configurations robustly.

## [1.1.0] - 2026-03-21

### Added
- **Plugin System (`Tempo.load`)**: Introduced a formal architecture for extending the `Tempo` class and prototype, allowing for modular feature injection (e.g., `TickerPlugin`).
- **Auto-Plugin Discovery**: Plugins can now be automatically loaded via the `plugins` configuration in `Tempo.init()` or through the Global Discovery manifest (`Symbol.for($Tempo)`).
- **Selective Immobility**: Enhanced the `@Immutable` decorator with a "Selective Immute" pattern. Core methods (including Symbols like `Symbol.dispose`) are now write-protected, while the class remains extensible for new plugins.
- **Reactive Clock (Modularized)**: The `Tempo.ticker` logic has been extracted into an optional plugin available at `@magmacomputing/tempo/plugins/ticker`. This reduces core bundle size while offering high-performance Async Generators and countdown support.
- **Symbol Protection**: Core identifiers are now safe from runtime hijacking, providing a robust security model for library consumers.

### Changed
- **Polyfill Decoupling**: Moved the `Temporal` API availability check to the core `Tempo` class, allowing standalone utilities to run in environments without `Temporal`.
- **Type-Strict Reflection**: Updated internal reflection tools to use `ownEntries()` for cleaner property descriptor management.
- **Documentation Overhaul**: Updated all technical guides to reflect the modular, plugin-based architecture.

## [1.0.8] - 2026-03-19

### Added
- **Numeric Pattern Inference**: Corrected `Formats` and `Format` types to ensure numeric patterns (like `yearMonthDay`) are correctly inferred as `number` while preserving enum-like functionality for the format registry.
- **Layout Patterns Guide**: Created a new technical guide `doc/tempo.layout.md` for describing Tempo services through custom layout/snippet building.
- **Enum Type Flexibility**: Loosened TypeScript constraints on `enumify` objects. The `count()` method now returns a standard `number`, and iteration callbacks (`forEach`, `filter`, `map`) now accept a generic `Enum.wrap<any>`, resolving assignability issues in complex configurations like `Tempo.Config`.
- **Custom Global Formats**: Introduced support for defining custom format layouts via Global Discovery (`Symbol.for($Tempo)`), making them available across all instances.
- **Type Safety Refinement**: Significantly enhanced the `Tempo` class by removing redundant `as any` casts, particularly in `#parse` and timezone handling, achieved through better destructuring and explicit string resolution.
- **Modern Syntax Adoption**: Updated the codebase to use `Object.getOwn()` instead of legacy `Object.prototype.hasOwnProperty.call()` for cleaner and more modern property checks.

### Changed
- **Core Simplification ($Base Removal)**: Removed the `$Base` symbol and its termination logic from `reflection.library.ts`. This simplifies prototype chain traversal across the library, as boundary protection is no longer required following the `config` getter refactor and existing enumerable property filtering for Enums.
- **Constant Modernization**: Renamed and deprecated `Tempo.TIME` and `Tempo.TIMES` in favor of more semantic `Tempo.DURATION` and `Tempo.DURATIONS`, improving readability and consistency with internal logic.
- **Enum Extension Optimization**: Refactored `Enum.extend` to support deep prototype chains (up to 50 levels) and fixed a critical boundary bug where root Enum data was being excluded from child extensions.
- **Proxy Trap Performance**: Optimized `toJSON` and `$Inspect` traps in `getProxy` to prevent unnecessary prototype chain traversal. The traps now prioritize checking for own properties, significantly improving performance and preventing recursion during serialization.
- **Term Traversal Logic**: Unified prototype traversal by introducing a shared `$Base` symbol to terminate chain climbing, improving both performance and collision resistance.
- **Node.js Custom Inspection**: Standardized the Node.js custom inspection symbol as `$Inspect` in the reflection library and updated `Tempo` and `Enumify` for consistent console formatting.
- **Stealth Proxy for terms**: Implemented a "Stealth Proxy" for the `term` accessor to provide a flat, iterable object view of resolved terms across Node.js and Browser environments while preserving lazy resolution.
- **Term Getters Performance**: Refactored `#setTerm` logic to use prototype shadowing (`Object.create`), improving performance and reducing overhead.
- **Strict Global Discovery**: Standardized the global configuration mechanism by removing legacy `TempoOptions` support and strictly enforcing the `Tempo.Discovery` contract.
- **Enumify Extend**: Refactored the internal `extend` utility within `enumify` for improved maintainability.
- **Parsing Reorganization**: Adjusted the `#parse` method to resolve `tz` and `cal` identifiers *after* configuration updates, ensuring internal state always reflects the most current settings.

### Fixed
- **Decorator Compatibility**: Resolved nominal typing issues in `registerTerms` by loosening internal constraints, enabling seamless synchronization with projects using Stage 3 decorators (like `whiteLibrary`).
- **Enum Boundary Bug**: Corrected the logic in `ownEntries` to ensure that root Enum entries (marked with `$Base`) are correctly collected during full-chain resolution.
- **Getter Handling in Extensions**: Fixed a regression in `reflection.library.ts` where properties with getters were being incorrectly unwrapped; they are now accessed directly to ensure proper execution.
- **Timezone Round-trip Restoration**: Fully resolved critical serialization regressions by updating `#setConfig` to recursively handle the `config` property during revival.
- **Instance Timezone Integrity**: Restored the safe update to `#local.config.timeZone` in `#parseZone`, ensuring internal getters stay in sync with date-time strings without clobbering initial state.
- **String Handling Cleanup**: Removed redundant `String()` wraps in regex group parsing and mutation logic where types were already guaranteed.

## [1.0.7] - 2026-03-14

### Added
- **`toPlain...` Methods**: Added `toPlainDate()`, `toPlainTime()`, and `toPlainDateTime()` helper methods to the `Tempo` class for easier extraction of specific `Temporal` components.
- **Argument Flexibility**: Enhanced `.set()` and `.add()` to accept either a date-time payload or an options object as the first argument, improving developer ergonomics.
- **API Reference**: Created `doc/tempo.api.md`, a comprehensive technical guide covering all static and instance API entrypoints, signatures, and properties.
- **TypeScript Types**: Created `doc/tempo.types.md` as a detailed reference for all core namespace types.
- **Regression Tests**: Added `test/issue-fixes.test.ts` to permanently cover relative events, timezone brackets, and storage precedence.

### Changed
- **Performance Optimization**: Switched Vitest to `--pool=forks` and refactored internal iteration in `.set()` and `.add()` to resolve test runner hangs during complex parsing.
- **Relative Events**: Refactored `now`, `today`, `tomorrow`, and `yesterday` to be relative to the specific `Tempo` instance. Date-based events now use `toPlainDate()` for improved parsing robustness.
- **Config Precedence**: Established and documented a reliable precedence order: Metadata < Defaults < Storage < Discovery < Global Init < Instance.
- **Config Privacy**: Explicitly excluded the internal `anchor` property from public configuration to prevent developer confusion.
- **Cleanup**: Removed obsolete `rdt` (recent date) snippet logic as it is fully superseded by smart event aliases (functions).
- **Storage Logic**: Consolidated persistence merging into `#setConfig`, ensuring storage values correctly act as defaults.
- **`toInstant` / `toDateTime` Getters**: Enhanced getters to prioritize the instance's underlying value while providing robust fallbacks to system "now" (including safe handling of uninitialized timezones).

### Fixed
- **Timezone Round-trip**: Resolved a critical bug where timezone information was lost when reviving Tempo instances from JSON (serialization/deserialization).
- **Timezone Bracket Parsing**: Resolved an issue where bracketed timezones were ignored or incorrectly overridden by offsets.
- **Mutation Safety**: Fixed `TypeError: Cannot add property` in `#result` when performing operations on instances decorated with `@Immutable` by ensuring internal state is handled safely.
- **Relative Event Drifting**: Fixed a bug where events like 'yesterday' were incorrectly calculated based on the run-date instead of the `Tempo` instance state.
- **Storage Merge Bug**: Corrected an issue where explicit options were being clobbered by storage values.

## [1.0.6] - 2026-03-12

### Added
- **API Reference**: Created `doc/tempo.api.md`, a comprehensive technical guide covering all static and instance API entrypoints, signatures, and properties.
- **Node.js Support**: Added explicit server-side usage instructions and code examples to `README.md` and `doc/Tempo.md`.
- **`{wy}` Token & Getter**: Introduced the `{wy}` formatting token and a corresponding public `wy` getter for the 4-digit ISO week-numbering year.

### Changed
- **Config Documentation**: Refactored `doc/tempo.config.md` to follow technical precedence (Persistence > Discovery > Global > Instance).
- **Doc Cross-Linking**: Standardized documentation navigation by converting all textual cross-references into clickable markdown links.
- **Precision Glossaries**: Refined documentation in `vision.md` and `comparison.md` to specify "meteorological seasons" and "zodiac signs".
- **Token Renaming**: Renamed `{isoy}` to `{wy}` across the library, tests, and documentation for improved semantic clarity.

### Fixed
- **ISO Week Logic**: Refined `wy` and `yyww` formatting logic to correctly handle boundary cases between years.
- **Global Discovery Trace**: Improved trace logging visibility when `debug: true` is enabled.

## [1.0.5] - 2026-03-10

### Added
- **GitHub Sponsors**: Integrated `FUNDING.yml` and added sponsorship links to `README.md`.
- **Commercial Support**: Added `doc/commercial.md` outlining consulting and priority support options.
- **Term Registration**: Implemented a new functional registration system for `Tempo.terms` to resolve circular dependencies.

### Changed
- **Config Architecture**: Relocated `pivot` property from `Tempo.Config` to `Tempo.Parse` to better align with its parsing-specific purpose.
- **Type Accessibility**: Moved `TermPlugin` type definition to the public `Tempo` namespace for easier external plugin development.
- **Initialization Logic**: Updated `Tempo.init()` to handle term registration and pivot defaults internally.

### Fixed
- Resolved circular dependency between `tempo.class.ts` and `term.import.ts`.
- Standardized internal property access for `pivot` using the `this.#local.parse["pivot"]` syntax.

## [1.0.4] - 2026-03-09
- Initial public release refinements.
- Established documentation for vision and core features.
