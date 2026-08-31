# Publishing a VS Code extension (VSIX)

How to ship a packaged `.vsix` to the **VS Code Marketplace**, **Open VSX**, and **GitHub Releases**. Steps are generic where noted; Taskingen-specific release identity lives in the project skills.

## Build the VSIX

From the extension root:

```bash
npm run package
# or: npx @vscode/vsce package
```

This produces `<extension-name>-<version>.vsix`. Confirm `publisher`, `name`, and `version` in `package.json` before packaging — those values become the marketplace identity.

Use the **same** `publisher` id on both registries.

---

## VS Code Marketplace

Manual upload via the web UI (no CLI publish in the Taskingen release flow).

1. Open [VS Code Marketplace publisher management](https://marketplace.visualstudio.com/manage) and sign in with your Microsoft account.
2. Create a publisher if needed (**Create publisher**). The **ID** must match the `publisher` field in `package.json` (immutable after creation).
3. Select the publisher → add / upload a new extension → choose the `.vsix` file.
4. Wait for VS Code Marketplace validation to finish.

**Updates:** upload a new `.vsix` on the same extension page. The version inside the package must be higher than the one already published.

Official docs: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

---

## Open VSX (Cursor and other compatible editors)

Open VSX publishes an existing `.vsix` with the `ovsx` CLI (not a drag-and-drop store UI).

### One-time setup

1. Register an [Eclipse account](https://accounts.eclipse.org/user/register). Use the **same GitHub username** you will use on Open VSX.
2. Sign in to [open-vsx.org](https://open-vsx.org) with GitHub → [Profile](https://open-vsx.org/user-settings/profile) → **Log in with Eclipse** → sign the **Publisher Agreement**.
3. Create an [access token](https://open-vsx.org/user-settings/tokens) (**Generate New Token**). Copy the value once; it is not shown again.
4. Create the namespace once (must match `publisher` in `package.json`):

```bash
npx ovsx create-namespace <publisher> -p <token>
```

### Upload the VSIX

```bash
npx ovsx publish <extension-name>-<version>.vsix -p <token>
```

**Updates:** bump `version`, rebuild the VSIX, publish again with the same token/namespace.

Official docs: [Publishing Extensions (Open VSX)](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions).

---

## GitHub Releases

Publish the same `.vsix` as a downloadable asset on the repo’s [Releases](https://github.com/cemcakirlar/taskingen/releases) page (separate from Marketplace / Open VSX). No GitHub Actions workflow — use `gh` after the release commit and tag exist.

### Prerequisites

1. `version` bumped in `package.json` and the matching `## [<version>]` section exists in `CHANGELOG.md`.
2. Release commit pushed to `origin`.
3. VSIX built: `npm run package` → `taskingen-<version>.vsix` (do not commit it).
4. Git tag `v<version>` on that commit. Push the tag if it is not on the remote yet:

```bash
git tag v<version>   # skip if the tag already points at the release commit
git push origin v<version>
```

### Create the release

Use the changelog section for that version as the notes body (include the `## [<version>] - <date>` heading). Attach the VSIX:

```bash
# Write notes to a temp file first (the ## [<version>] block from CHANGELOG.md), then:
gh release create "v<version>" \
  "taskingen-<version>.vsix" \
  --title "v<version>" \
  --notes-file /path/to/notes.md
```

If the tag already exists on the remote but no release exists, omit recreating the tag — `gh release create v<version> …` attaches to the existing tag.

**Updates:** each new version gets a new tag and a new release. Do not overwrite an existing release asset unless you intentionally replace a broken upload for the same tag.

Official docs: [GitHub CLI `gh release create`](https://cli.github.com/manual/gh_release_create).

---

## Checklist

1. Bump `version` in `package.json` (and changelog if you keep one).
2. Build the VSIX and spot-check install locally (**Extensions: Install from VSIX…**).
3. After the spot-check passes: commit the release (`package.json`, `CHANGELOG.md`, and any release notes/docs) and tag `v<version>` (example: `v0.1.6`). Do not commit the `.vsix`.
4. Create the **GitHub Release** for `v<version>` with the VSIX asset (see **GitHub Releases** above).
5. Upload to **VS Code Marketplace** via the web UI (manual; not `vsce publish`).
6. Publish the same VSIX to Open VSX (CLI).
7. Confirm GitHub Releases, Marketplace, and Open VSX show the new version.
