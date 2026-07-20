# Changelog

All notable changes to Taskingen are documented in this file.

## [0.1.2] - 2026-07-20

### Added

- `taskingen.discovery.exclude` setting documentation in the README, including example patterns for filtering folders and paths from discovery

### Fixed

- IDE TypeScript errors in `test/unit` (missing Node types for `node:assert/strict` and `node:test`) — added `test/tsconfig.json` extending `tsconfig.test.json`

## [0.1.1] - 2026-07-19

### Fixed

- Task History updates immediately after a run (in-memory cache before Memento persist)
- Running state clears when the terminal closes if shell integration is unavailable
- Shell execution end listeners are disposed on completion or terminal close
- Debounced workspace refresh with generation tokens to avoid stale tree data
- Unique terminal names for same-named shell scripts; stable tree item IDs

### Changed

- npm task identity uses `packageJsonUri` (legacy cwd-based history keys still resolve)
- `package.json` discovery uses JSONC parsing and broader exclude globs
- Settings module renamed; click activation no longer fires on keyboard selection alone
- Command Palette titles prefixed with `Taskingen:`

### Added

- Unit test suite under `test/unit`
- Extension icon for Marketplace
- Marketplace metadata (`license`, `repository`, README improvements)

## [0.1.0] - 2026-07-01

### Added

- Initial release: Explorer tree for npm and shell scripts
- Run / stop / open actions, script grouping, and Task History
