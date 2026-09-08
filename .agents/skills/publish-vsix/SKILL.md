---
name: publish-vsix
description: >-
  Package Taskingen as a .vsix and publish to VS Code Marketplace and Open VSX.
  Use when the user asks to create a VSIX, package the extension, publish to
  VS Code Marketplace, or publish to Open VSX. For GitHub Releases / gh release
  with a VSIX asset, use the github-release skill.
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
- [ ] 5. GitHub Release — follow github-release skill (only when user asks)
- [ ] 6. VS Code Marketplace — manual UI upload (agent does not run publish)
- [ ] 7. Publish Open VSX — `npm run publish:ovsx` (only when user asks; no credential pre-check)
- [ ] 8. Confirm GitHub Release shows the new version (only when step 5 ran; skip Marketplace/Open VSX — under review)
```

## Agent rules

1. Follow [docs/publishing.md](../../../docs/publishing.md) for VS Code Marketplace UI steps.
2. Never publish without an explicit user request for that registry.
3. VS Code Marketplace is **manual only**: give the user the `.vsix` path and [publisher manage](https://marketplace.visualstudio.com/manage) URL. Do not run `npm run publish` / `vsce publish`.
4. After spot-check, propose commit + tag `v<version>` before registry publish; only commit/tag when the user asks. For attaching the VSIX on GitHub Releases, hand off to [github-release](../github-release/SKILL.md).
5. Never commit secrets, PATs, or Open VSX tokens; do not commit `.vsix` unless asked.
6. Prefer `npm run package` / `npm run publish:ovsx` over raw `vsce` / `ovsx` unless debugging.
7. Open VSX: when the user asks, run `npm run publish:ovsx` directly — do not pre-check credentials or namespace setup.
8. Post-publish verification: confirm GitHub Release only (via `gh release view` or the releases page). Do not verify Marketplace or Open VSX listings — new versions stay under review and may not appear immediately.
9. After packaging, report the exact `.vsix` path and version; ask commit/tag vs which registry next if unclear.
