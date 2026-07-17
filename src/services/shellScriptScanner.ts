import * as path from "node:path";
import * as vscode from "vscode";

export interface ShellScriptTask {
  readonly kind: "shell";
  readonly name: string;
  readonly scriptUri: vscode.Uri;
  readonly cwd: string;
}

export async function scanShellScripts(): Promise<readonly ShellScriptTask[]> {
  const scriptUris = await vscode.workspace.findFiles(
    "**/*.{sh,bash}",
    "{**/node_modules/**,**/.git/**}",
  );

  return scriptUris
    .map((scriptUri) => ({
      kind: "shell" as const,
      name: path.basename(scriptUri.fsPath),
      scriptUri,
      cwd: path.dirname(scriptUri.fsPath),
    }))
    .sort((left, right) => left.scriptUri.fsPath.localeCompare(right.scriptUri.fsPath));
}
