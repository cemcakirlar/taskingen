---
name: publish-vsix
description: >-
  Package Taskingen as a .vsix and publish to Visual Studio Marketplace and
  Open VSX. Use when the user asks to create a VSIX, package the extension,
  publish to Marketplace, publish to Open VSX, or ship a release.
---

# Publish VSIX (Taskingen)

Canonical steps live in [docs/publishing.md](../../../docs/publishing.md). Follow that doc; this skill adds project-specific values and npm scripts.

## Identity (from `package.json`)

| Field       | Value                      |
| ----------- | -------------------------- |
| `publisher` | `cemcakirlar`              |
| `name`      | `taskingen`                |
| VSIX file   | `taskingen-<version>.vsix` |

Use the **same** `publisher` id on Marketplace and Open VSX. Never change `publisher` after first publish.

## Checklist (do in order)

```
Release progress:
- [ ] 1. Bump version + changelog
- [ ] 2. Build VSIX
- [ ] 3. Spot-check install from VSIX
- [ ] 4. Publish Marketplace (VS Code)
- [ ] 5. Publish Open VSX (Cursor / others)
- [ ] 6. Confirm both listings show the new version
```

### 1. Bump version + changelog

1. Bump `version` in `package.json` (semver; must be higher than the published version).
2. Move `[Unreleased]` notes in `CHANGELOG.md` under a new `[x.y.z] - YYYY-MM-DD` section; leave a fresh `[Unreleased]` stub.
3. Confirm `publisher` / `name` still match the table above.

### 2. Build the VSIX

From the extension root:

```bash
npm run package
```

(`vscode:prepublish` runs `npm run compile` automatically.)

Produces `taskingen-<version>.vsix` in the repo root.

Do **not** commit the `.vsix` unless the user asks.

### 3. Spot-check locally

Ask the user to run **Extensions: Install from VSIX…** and smoke-test the new build before publishing.

### 4. Visual Studio Marketplace

**Default for this project:** manual upload (matches `docs/publishing.md`).

1. Open [Marketplace publisher management](https://marketplace.visualstudio.com/manage).
2. Select publisher `cemcakirlar` → upload the `.vsix`.
3. Wait for Marketplace validation.

**Optional CLI** (only if the user has PAT / Entra auth ready):

```bash
npm run publish
# or: npx @vscode/vsce publish
```

Do not invent or print tokens. If auth fails, stop and ask the user to authenticate.

### 5. Open VSX

Publishes via CLI (`ovsx`), not a drag-and-drop UI.

**One-time** (skip if namespace already exists):

1. Eclipse account + Open VSX GitHub login + Publisher Agreement + access token — see [docs/publishing.md](../../../docs/publishing.md).
2. Create namespace once:

```bash
npx ovsx create-namespace cemcakirlar -p <token>
```

**Each release** (user provides token; never store it in the repo):

```bash
npx ovsx publish taskingen-<version>.vsix -p <token>
# or, if already packaged / using package.json version:
npm run publish:ovsx -- -p <token>
```

### 6. Confirm

Both listings show the new version.

## Agent rules

1. Read [docs/publishing.md](../../../docs/publishing.md) if anything here conflicts or is incomplete — the doc wins.
2. Never publish without an explicit user request for that registry.
3. Never commit secrets, PATs, or Open VSX tokens.
4. Prefer `npm run package` / `npm run publish` / `npm run publish:ovsx` over raw `vsce` / `ovsx` unless debugging.
5. After packaging, report the exact `.vsix` path and version; ask which registry to publish next if unclear.

## Official docs

- [Publishing Extensions (VS Code)](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Publishing Extensions (Open VSX)](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)
