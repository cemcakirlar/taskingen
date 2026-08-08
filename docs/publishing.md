# Publishing a VS Code extension (VSIX)

How to ship a packaged `.vsix` to the Visual Studio Marketplace and Open VSX. Steps are generic; replace placeholders with your own values.

## Build the VSIX

From the extension root:

```bash
npm run package
# or: npx @vscode/vsce package
```

This produces `<extension-name>-<version>.vsix`. Confirm `publisher`, `name`, and `version` in `package.json` before packaging — those values become the marketplace identity.

Use the **same** `publisher` id on both registries.

---

## Visual Studio Marketplace (VS Code)

Manual upload via the web UI.

1. Open [Marketplace publisher management](https://marketplace.visualstudio.com/manage) and sign in with your Microsoft account.
2. Create a publisher if needed (**Create publisher**). The **ID** must match the `publisher` field in `package.json` (immutable after creation).
3. Select the publisher → add / upload a new extension → choose the `.vsix` file.
4. Wait for Marketplace validation to finish.

**Updates:** upload a new `.vsix` on the same extension page. The version inside the package must be higher than the one already published.

Optional CLI path (PAT / Entra-based auth required): `npx @vscode/vsce publish`.

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

## Checklist

1. Bump `version` in `package.json` (and changelog if you keep one).
2. Build the VSIX and spot-check install locally (**Extensions: Install from VSIX…**).
3. Upload / publish to Marketplace (VS Code users).
4. Publish the same VSIX to Open VSX (Cursor and other clients).
5. Confirm both listings show the new version.
