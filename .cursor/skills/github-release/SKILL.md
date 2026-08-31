---
name: github-release
description: >-
  Create a GitHub Release for Taskingen with tag v<version>, CHANGELOG notes,
  and the packaged .vsix as a downloadable asset. Use when the user asks for a
  GitHub release, gh release, release asset, or to publish the VSIX on the
  GitHub repo Releases page.
---

# GitHub Release (Taskingen)

Canonical steps: [docs/publishing.md](../../../docs/publishing.md) → **GitHub Releases**. That section wins on conflict. This skill holds identity, checklist, and agent rules only.

Marketplace / Open VSX → [publish-vsix](../publish-vsix/SKILL.md). Do not mix registries into this skill.

## Identity

| Field        | Value                                                |
| ------------ | ---------------------------------------------------- |
| Repo         | `cemcakirlar/taskingen`                              |
| Tag / title  | `v<version>` (e.g. `v0.1.6`)                         |
| Asset        | `taskingen-<version>.vsix` (gitignored; attach only) |
| Notes source | Matching `## [<version>]` section in `CHANGELOG.md`  |

Past releases attach the VSIX and use the changelog section as the body (see `v0.1.4`).

## Checklist

```
GitHub release progress:
- [ ] 1. Version + changelog already on the commit to release (`package.json`, `CHANGELOG.md`)
- [ ] 2. VSIX exists — `npm run package` → `taskingen-<version>.vsix`
- [ ] 3. Commit pushed to `origin` (release commit on the branch you intend)
- [ ] 4. Tag `v<version>` on that commit; push tag if it is not on the remote yet
- [ ] 5. `gh release create` with title `v<version>`, changelog notes, VSIX asset
- [ ] 6. Confirm release URL lists the `.vsix` download
```

## Agent rules

1. Never create or edit a GitHub release unless the user explicitly asks for this repo’s Releases page / `gh release`.
2. Prerequisites live in [publish-vsix](../publish-vsix/SKILL.md) (bump, package, spot-check, commit). This skill starts at tag + `gh release create`.
3. Prefer `gh release create` over the web UI. Do not force-push tags or delete remote releases unless the user explicitly asks.
4. Notes = the `## [<version>] - <date>` block from `CHANGELOG.md` (include the heading). Do not invent release notes.
5. Attach exactly one asset: `taskingen-<version>.vsix` matching `package.json` `version`. Rebuild with `npm run package` if missing or mismatched.
6. Do not commit the `.vsix`. Tag format is always `v` + semver (no other prefix).
7. After success, report the release URL and that the VSIX is listed under Assets.
8. If tag `v<version>` already exists on the remote but no release exists, create the release from that tag (do not retag). If a release already exists for the tag, stop and ask before uploading/replacing assets.
