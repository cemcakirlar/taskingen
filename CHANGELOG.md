# Changelog

All notable changes to Taskingen are documented in this file.

## [Unreleased]

## [0.1.6] - 2026-08-31

### Added

- Favorites: pin leaf scripts (inline + context menu) into a Favorites group above Task History; clear is workspace-scoped
- Settings: `taskingen.favorites.enabled` (default `true`) and `taskingen.favorites.maxItems` (default `5`, range 1–50)

### Changed

- New favorites pins appear first; older pins stay stored and resurface when a newer pin is removed or `maxItems` is raised

## [0.1.5] - 2026-08-22

### Added

- `taskingen.npmProjectGrouping.folderMaxDepth` — Explorer-style folder nesting for npm projects, Deno projects, and shell scripts (default `1`; `0` keeps a flat list). Discovery depth is unchanged.
- Folder nesting resolves paths against workspace roots first (avoids absolute disk paths when `asRelativePath` fails, e.g. packaged VSIX installs).
- Folder nesting keeps `groupByScope` intact: root-level packages are not wrapped in a same-named folder that isolates each `@scope` package.
- npm/Deno project rows show a path hint beside the tree label: the on-disk folder basename when it differs from the label, otherwise the workspace-relative path; workspace-root projects show no hint (no `./`).

### Changed

- `folderMaxDepth` counts nearest folders upward from each project/script (not from the workspace root), which keeps large workspaces like a top-level `Code/` folder usable.

## [0.1.4] - 2026-08-08

### Added

- `docs/publishing.md` — generic notes for packaging a VSIX and publishing to the Visual Studio Marketplace and Open VSX

### Changed

- README: Open Script Source mentions `deno.jsonc`; `groupByScope` documents npm or Deno packages

## [0.1.3] - 2026-08-08

### Added

- Deno tasks support: discover and run `tasks` from `deno.json` / `deno.jsonc` (string or `{ command, description }`) via `deno task <name>`
- Unit tests for Deno JSON scanning and related task identity / script-key helpers

### Changed

- README and Marketplace description updated for npm + Deno + shell discovery
- Tree view, runner, history, and source-open flows extended to treat Deno tasks like other script kinds

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
