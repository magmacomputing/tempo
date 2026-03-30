# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
