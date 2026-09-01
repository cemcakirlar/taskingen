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

- **Marketplace / Open VSX** → `.cursor/skills/publish-vsix`, then `docs/publishing.md`.
- **GitHub Release** (tag + VSIX asset) → `.cursor/skills/github-release`, then `docs/publishing.md` → GitHub Releases.

## Review

Coding rules for review → `CODING_STANDARDS.md`.

## Agent skills

### Issue tracker

GitHub Issues on `cemcakirlar/taskingen` (via `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default Matt Pocock vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
