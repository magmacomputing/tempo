# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-04-03

### Changed
- **Memory-Efficient Logging (Pledge)**: Refactored the `Pledge` class to use a single `static #dbg` instance of `Logify`. This significantly reduces object creation overhead while maintaining per-instance configuration isolation via status-based overrides.
- **Consistent Diagnostics**: Standardized `Pledge.reject()` to route through the unified diagnostic system at the `debug` level, ensuring better visibility during development without polluting production logs.
- **Core Utility Renaming**: Renamed the `getProxy` utility to the more semantic `proxify` to better reflect its role in the soft-freeze and lazy-discovery patterns.

---

## [2.0.0] - 2026-03-30

### Added
- Initial monorepo-based release under the `@magmacomputing/library` scope.
- Migration of core utilities (Logify, Pledge, Coercion, etc.) into the shared workspace.
