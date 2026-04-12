# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-04-12

### Added
- **Constructor Protection**: Implemented a strict guard against passing term-based mutation objects (`#`) directly to the `Tempo` constructor. The engine now explicitly rejects these inputs and directs users to the appropriate `.set()` or `.add()` methods for instance transformation.
- **Unified Term Errors**: Centralized term-resolution error logic into a shared static helper, ensuring consistent "Helpful Hint" messaging for missing plugins across the constructor, mutation engine, and parser.

### Changed
- **Modular Hardening**: Hardened the core engine to strictly enforce `ZonedDateTime` types for all internal states. This prevents "Ghost Date" leaks and silent fallbacks to "Today" when input resolution fails in Core mode.
- **Singular Path Refactor**: Standardized all internal and external paths, directories, and documentation to use the singular `plugin` and `term` form (e.g., `#tempo/plugin`, `@magmacomputing/tempo/term`).
- **Auto-Lazy Precision**: Refined the "Zero-Cost" auto-lazy trigger to only fire for String inputs, ensuring that malformed Objects fail-fast during construction rather than deferring failures.
- **Bulk Extension DX**: Rebuilt `Tempo.extend()` with intelligent rest-parameter support and restored high-level type overloads for improved IDE autocompletion and type-safety.

### Fixed
- **Build Stability**: Resolved type errors in the test suite (specifically `tempo_guard.test.ts`) that were triggering failures during project-referenced builds (`tsc -b`).
- **Sync Normalization**: Fixed a regression where early-resolving inputs (like ISO strings) were bypassing final timezone and calendar normalization.

---

## [2.1.0] - 2026-04-11

### Added
- **TimeZone Offset Support**: Formally verified and documented support for `+HH:MM` and `-HH:MM` ISO-8601 fixed-offset strings in the `timeZone` configuration.
- **Browser Reference Map**: Included a comprehensive [importmap.json](./importmap.json) in the package root to provide a standard mapping for bare module specifiers in browser environments.

### Changed
- **Modular Import Refactor**: Cleaned up the public API by removing the required `plugin/` component from sub-path imports. Plugins are now accessible directly via `@magmacomputing/tempo/ticker`, `@magmacomputing/tempo/duration`, etc.
- **Configuration Mode**: Refactored the `lazy: boolean` option into a more semantic `mode: 'auto' | 'strict' | 'defer'` setting, offering better control over the Zero-Cost Constructor hydration strategy.
- **Export Alignment**: Synchronized `package.json` `exports` with the recommended import-map and documentation snippets to ensure 1:1 parity between Node.js and Browser environments.

### Fixed
- **Documentation Clarity**: Updated all markdown guides (Ticker, Terms, Layout, etc.) to use verified import patterns and corrected various outdated configuration references.

---

## [2.0.1] - 2026-04-03

### Added
- **Ticker Stability Guard**: Implemented a 10,000-iteration safety break in `resolveTermShift` to prevent infinite loops when resolving malformed or non-advancing custom terms.
- **Unified Diagnostics (`Logify`)**: Integrated the `Logify` utility into core internal classes for standardized `debug`, `catch`, and `silent` mode support.

### Changed
- **High-Precision Ticker**: Migrated `TickerPlugin` from `Date.now()` to `instant().epochMilliseconds`, ensuring consistent use of high-precision timing without legacy `Date` object dependencies.
- **Test Performance**: Standardized the test suite on `vitest --pool=forks` to ensure deterministic execution of asynchronous ticker and generator tests.

### Fixed
- **Ticker Async Stability**: Resolved hangs in async generators (`for await...of`) by implementing a `Pledge`-based waiter resolution mechanism that guarantees immediate termination upon `stop()`, `return()`, or `throw()`.
- **Ticker Pulse Synchronization**: Corrected pulse counts for both listeners and generators ($N$ pulses for `limit: N`); ensured `limit: 0` is strictly honored as zero pulses.
- **Ticker Cold-Start**: Fixed an issue where tickers created without an initial callback would remain idle even after listeners were attached; extracted `#bootstrap()` to ensure the scheduler starts correctly on the first listener registration.
- **Parsing Engine Optimization**: Refactored `Tempo.#setPatterns` to optimize pattern generation and avoid redundant global guard rebuilds, significantly improving performance for local/one-off parser instances.
- **Local Layout Stability**: Fixed a bug where custom layout literals in local instances were being destroyed during state synchronization.
- **Registry Protection**: Hardened `registryUpdate` to safely handle non-proxied or missing targets, preventing potential crashes during late-import plugin registration.
- **Term Plugin Resolution**: Corrected package export mappings for term-based plugins in `package.json`, resolving module resolution errors in development and test environments.
- **Numeric Word Parsing**: Fixed regressions in numeric word resolution (e.g., "eleven days hence") by ensuring registry synchronization during late-import scenarios.

---

## [2.0.0] - 2026-03-30

### Added
- **Zero-Cost Constructor**: Optimized the instantiation path to $O(1)$ by deferring all parsing and property registration until the first property access.
- **Generic Lazy Delegator**: Introduced `getLazyDelegator` in `proxy.library.ts` to standardize on-demand property discovery for `fmt` and `term` objects.
- **Improved Immutability**: Enhanced `@Immutable` and `secure()` protections that safely handle lazy evaluation on frozen instances via a defensive prototype-shadowing fallback.
- **Registry Security**: Refactored global registries (FORMAT, NUMBER, TIMEZONE) to use `registryUpdate` with core protection, preventing accidental overrides of built-in tokens.
- **Anchor-Aware Parsing**: Added native support for anchoring relative date strings (e.g., "next Friday") to a specific reference date via the `anchor` option.
- **Timezone Safety**: Implemented graceful fallback to `UTC` (with a warning) for invalid IANA TimeZone IDs when `catch: true` is enabled.

### Changed
- **Internal State Management**: Migrated from a static `#pending` accumulator to an instance-local `#matches` buffer, guaranteeing thread-safety for concurrent `Tempo` instances.
- **Temporal Integration**: Unified the `Temporal` polyfill location to `#library/temporal.polyfill.js`.
- **Typing Refactor**: Relocated `Internal` and `Tempo` namespaces to the top of `tempo.class.ts` for improved IDE type visibility and lint performance.

### Fixed
- Resolved 299/299 regressions in the core and plugin test suites.
- Fixed `TypeError: [object Object] is not extensible` during lazy discovery on secured instances.
- Fixed relative calculation drift where "one Wednesday ago" used the system clock instead of the provided anchor.
- Fixed a race condition in `TickerPlugin` that caused double-clicks on initialization.
