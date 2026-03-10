# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Import Maps Support**: Added documentation for using Tempo in modern browsers without a build step via `<script type="importmap">`.
- **Custom Configuration**: Added support for non-standard, custom configuration options in `Tempo.Options` that are preserved in the instance `config`.
- **New Tests**: Added `test/custom-options.test.ts` to verify custom configuration and Term plugin integration.

### Changed
- **Type Architecture**: Refactored `Tempo.Options` and `Tempo.Config` using `BaseOptions` and intersections to prevent type shadowing of explicit properties like `timeStamp`.
- **API Surface**: Updated `lib/index.ts` to use `export *`, ensuring all helper functions and types are available to library consumers.
- **Type Organization**: Moved `Params` helper type into the `Tempo` namespace (`Tempo.Params`) for better organization.

### Fixed
- **Type Safety**: Fixed a TypeScript indexing error on line 779 caused by the new index signature in configuration objects.

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
