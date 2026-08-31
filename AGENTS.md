# Taskingen — agent pointers

## Feature map

- **Discovery** (find scripts): `src/services/packageJsonScanner.ts`, `denoJsonScanner.ts`, `shellScriptScanner.ts`, `discoveryExclude.ts`
- **Tree** (sidebar structure): `src/services/npmProjectTree.ts`, `folderPathTree.ts`, `npmScriptTree.ts`, `src/tree/TaskTreeProvider.ts`
- **Run / history / favorites**: `src/services/runner.ts`, `scriptActivation.ts`, `runningTaskRegistry.ts`, `taskHistory.ts`, `favorites.ts`
- **Settings / paths**: `src/services/settings.ts`, `workspacePath.ts`
- **Extension wiring**: `src/extension.ts`, `src/tree/TaskItem.ts`

## Tests

- **Live coverage**: `test/unit` only (`npm test` / `npm run test:unit`).
- **Placeholders**: `test/integration` and `test/e2e` are empty (`.gitkeep`). Scripts `test:integration` / `test:e2e` exist for later; a green run with zero files is not coverage.

## Publish

Ship a VSIX / Marketplace / Open VSX → read `.cursor/skills/publish-vsix` (identity + checklist), then follow `docs/publishing.md` (canonical steps).

## Review

Coding rules for review → `CODING_STANDARDS.md`.
