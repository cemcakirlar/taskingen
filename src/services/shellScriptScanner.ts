import * as path from "node:path";
import * as vscode from "vscode";
import {
  getDiscoveryExcludeGlob,
  isDiscoveryUriExcluded,
} from "./discoveryExclude";
import { readDiscoveryExcludePatterns } from "./settings";

export interface ShellScriptTask {
  readonly kind: "shell";
  readonly name: string;
  readonly scriptUri: vscode.Uri;
  readonly cwd: string;
}

export async function scanShellScripts(): Promise<readonly ShellScriptTask[]> {
  const excludePatterns = readDiscoveryExcludePatterns();
  const scriptUris = (
    await vscode.workspace.findFiles("**/*.{sh,bash}", getDiscoveryExcludeGlob(excludePatterns))
  ).filter((uri) => !isDiscoveryUriExcluded(uri, excludePatterns));

  return scriptUris
    .map((scriptUri) => ({
      kind: "shell" as const,
      name: path.basename(scriptUri.fsPath),
      scriptUri,
      cwd: path.dirname(scriptUri.fsPath),
    }))
    .sort((left, right) => left.scriptUri.fsPath.localeCompare(right.scriptUri.fsPath));
}
