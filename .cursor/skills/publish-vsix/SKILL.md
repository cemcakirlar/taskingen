---
name: publish-vsix
description: >-
  Package Taskingen as a .vsix and publish to Visual Studio Marketplace and
  Open VSX. Use when the user asks to create a VSIX, package the extension,
  publish to Marketplace, publish to Open VSX, or ship a release.
---

# Publish VSIX (Taskingen)

Canonical steps: [docs/publishing.md](../../../docs/publishing.md). That doc wins on conflict. This skill holds identity and npm script names only.

## Identity (from `package.json`)

| Field       | Value                      |
| ----------- | -------------------------- |
| `publisher` | `cemcakirlar`              |
| `name`      | `taskingen`                |
| VSIX file   | `taskingen-<version>.vsix` |

Same `publisher` on Marketplace and Open VSX. Never change `publisher` after first publish.

## Checklist

```
Release progress:
- [ ] 1. Bump version + changelog (`package.json`, `CHANGELOG.md`)
- [ ] 2. Build VSIX — `npm run package`
- [ ] 3. Spot-check — Extensions: Install from VSIX…
- [ ] 4. Commit release + tag `v<version>` (e.g. `v0.1.6`); do not commit the `.vsix`
- [ ] 5. Publish Marketplace — see docs/publishing.md
- [ ] 6. Publish Open VSX — see docs/publishing.md (`npm run publish:ovsx`)
- [ ] 7. Confirm both listings show the new version
```

Optional Marketplace CLI (auth ready): `npm run publish`.

## Agent rules

1. Follow [docs/publishing.md](../../../docs/publishing.md) for Marketplace UI and Open VSX token/namespace steps.
2. Never publish without an explicit user request for that registry.
3. After spot-check, propose commit + tag `v<version>` before registry publish; only commit/tag when the user asks.
4. Never commit secrets, PATs, or Open VSX tokens; do not commit `.vsix` unless asked.
5. Prefer `npm run package` / `npm run publish` / `npm run publish:ovsx` over raw `vsce` / `ovsx` unless debugging.
6. After packaging, report the exact `.vsix` path and version; ask commit/tag vs which registry next if unclear.
