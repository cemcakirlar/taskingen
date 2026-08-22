import path from "node:path";
import * as vscode from "vscode";

/**
 * Return a workspace-relative posix path for `fsPath`, or `undefined` when it
 * is outside every workspace root.
 */
export function relativeToWorkspaceRoots(fsPath: string, workspaceRoots: readonly string[]): string | undefined {
  const normalizedTarget = path.normalize(fsPath);
  let best: { relative: string; rootLength: number } | undefined;

  for (const root of workspaceRoots) {
    const normalizedRoot = path.normalize(root);
    const relative = path.relative(normalizedRoot, normalizedTarget);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      continue;
    }

    if (best === undefined || normalizedRoot.length > best.rootLength) {
      best = {
        relative: relative === "" ? "." : relative.replace(/\\/g, "/"),
        rootLength: normalizedRoot.length,
      };
    }
  }

  return best?.relative;
}

export function workspaceRelativePath(fsPath: string): string {
  const roots = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
  return relativeToWorkspaceRoots(fsPath, roots) ?? vscode.workspace.asRelativePath(fsPath, false);
}

/**
 * Path hint beside a project label. Empty for workspace-root packages
 * (`./` is noise). Prefer the on-disk folder name when it differs from
 * the package display name.
 */
export function projectFolderDescription(relativePath: string, displayName: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (normalized.length === 0 || normalized === ".") {
    return "";
  }

  const base = normalized
    .split("/")
    .filter((segment) => segment.length > 0)
    .at(-1);
  if (base !== undefined && base !== displayName) {
    return base;
  }

  return normalized;
}
