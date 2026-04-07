# Tempo v2.0.2 Wishlist (Post-Lockdown)

### Stability & Hardening
- [ ] **Refactor `isClassConstructor`**: Move away from hard-coded "Tempo" strings in `type.library.ts` and rely entirely on the `$isTempo` symbol brand for cross-module reliability.
- [ ] **Private Name Safety**: Perform a full audit of private class members to ensure no static/instance naming collisions exist (like the `#now` issue found today).

### Architecture & Design
- [ ] **Investigate Code-Bloat**: Audit the library for unused utility functions and optimize for a smaller bundle size.
- [ ] **Investigate Code-Smells**: Review complex methods (like `#parse`) for high cyclomatic complexity and potential refactoring.
- [ ] **Investigate Modularising `tempo.class.ts`**: Explore breaking down the large engine (currently 2500+ lines) into smaller, more maintainable sub-modules (e.g., `parsers/`, `formatters/`, `calculations/`).
- [ ] **Investigate General 'Alias' Mechanism**: Explore replacing the separate `Event` (date) and `Period` (time) subsystems with a single, unified 'Alias' mechanism that allows for both date and time components in a single named token.

### Features & Improvements
- [ ] **Consolidate Class Branding into a Formal Registry**: (Needs Investigation) Explore creating a central `Brands` registry in `symbol.library.ts` using `Symbol.for()` for cross-bundle identity. Investigate how `type.library.ts` can dynamically fetch or discover this registry to automate type identification without hard-coding class names.

### look at making the 'debug' value an enum instead of boolean ?
- this would allow us to set a debug level, e.g. none, parse, format, all

### better tracking of Temporal types
- rather than isTemporal() checking if the type starts with 'Temporal.'.  
We need to use the symbols defined in the Temporal API for a more robust and reliable way to identify Temporal objects.

