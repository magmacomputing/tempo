# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2026-03-14

### Added
- **`toPlain...` Methods**: Added `toPlainDate()`, `toPlainTime()`, and `toPlainDateTime()` helper methods to the `Tempo` class for easier extraction of specific `Temporal` components.
- **API Reference**: Created `doc/tempo.api.md`, a comprehensive technical guide covering all static and instance API entrypoints, signatures, and properties.
- **TypeScript Types**: Created `doc/tempo.types.md` as a detailed reference for all core namespace types.
- **Regression Tests**: Added `test/issue-fixes.test.ts` to permanently cover relative events, timezone brackets, and storage precedence.

### Changed
- **Relative Events**: Refactored `now`, `today`, `tomorrow`, and `yesterday` to be relative to the specific `Tempo` instance. Date-based events now use `toPlainDate()` for improved parsing robustness.
- **Config Precedence**: Established and documented a reliable precedence order: Metadata < Defaults < Storage < Discovery < Global Init < Instance.
- **Storage Logic**: Consolidated persistence merging into `#setConfig`, ensuring storage values correctly act as defaults.
- **`toInstant` / `toDateTime` Getters**: Enhanced getters to prioritize the instance's underlying value while providing robust fallbacks to system "now" (including safe handling of uninitialized timezones).

### Fixed
- **Timezone Bracket Parsing**: Resolved an issue where bracketed timezones were ignored or incorrectly overridden by offsets.
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
