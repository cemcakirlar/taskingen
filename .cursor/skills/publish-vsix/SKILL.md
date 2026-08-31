---
name: publish-vsix
description: >-
  Package Taskingen as a .vsix and publish to VS Code Marketplace and Open VSX.
  Use when the user asks to create a VSIX, package the extension, publish to
  VS Code Marketplace, publish to Open VSX, or ship a release.
---

# Publish VSIX (Taskingen)

Canonical steps: [docs/publishing.md](../../../docs/publishing.md). That doc wins on conflict. This skill holds identity and npm script names only.

## Identity (from `package.json`)

| Field       | Value                      |
| ----------- | -------------------------- |
| `publisher` | `cemcakirlar`              |
| `name`      | `taskingen`                |
| VSIX file   | `taskingen-<version>.vsix` |

Same `publisher` on VS Code Marketplace and Open VSX. Never change `publisher` after first publish.

## Checklist

```
Release progress:
- [ ] 1. Bump version + changelog (`package.json`, `CHANGELOG.md`)
- [ ] 2. Build VSIX — `npm run package`
- [ ] 3. Spot-check — Extensions: Install from VSIX…
- [ ] 4. Commit release + tag `v<version>` (e.g. `v0.1.6`); do not commit the `.vsix`
- [ ] 5. VS Code Marketplace — manual UI upload (agent does not run publish)
- [ ] 6. Publish Open VSX — `npm run publish:ovsx` (only when user asks)
- [ ] 7. Confirm both listings show the new version
```

## Agent rules

1. Follow [docs/publishing.md](../../../docs/publishing.md) for VS Code Marketplace UI and Open VSX token/namespace steps.
2. Never publish without an explicit user request for that registry.
3. VS Code Marketplace is **manual only**: give the user the `.vsix` path and [publisher manage](https://marketplace.visualstudio.com/manage) URL. Do not run `npm run publish` / `vsce publish`.
4. After spot-check, propose commit + tag `v<version>` before registry publish; only commit/tag when the user asks.
5. Never commit secrets, PATs, or Open VSX tokens; do not commit `.vsix` unless asked.
6. Prefer `npm run package` / `npm run publish:ovsx` over raw `vsce` / `ovsx` unless debugging.
7. After packaging, report the exact `.vsix` path and version; ask commit/tag vs which registry next if unclear.
