# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
