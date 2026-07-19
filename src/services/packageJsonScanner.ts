import * as path from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import * as vscode from "vscode";

export interface NpmScriptTask {
  readonly kind: "npm";
  readonly name: string;
  readonly command: string;
  readonly packageJsonUri: vscode.Uri;
  readonly cwd: string;
}

export interface NpmProject {
  readonly name: string;
  readonly packageJsonUri: vscode.Uri;
  readonly cwd: string;
  readonly scripts: readonly NpmScriptTask[];
}

interface PackageJsonShape {
  readonly name?: unknown;
  readonly scripts?: Record<string, unknown>;
}

/** Shared findFiles exclude for package.json and shell script discovery. */
export const DISCOVERY_EXCLUDE =
  "{**/node_modules/**,**/.git/**,**/dist/**,**/coverage/**,**/vendor/**,**/.venv/**,**/out/**}";

export function resolveProjectName(packageName: string | undefined, cwd: string): string {
  return packageName ?? path.basename(cwd);
}

export function parsePackageJsonContent(content: string): PackageJsonShape | undefined {
  const parsed: unknown = parseJsonc(content);
  return isPackageJsonShape(parsed) ? parsed : undefined;
}

export async function scanPackageJsonProjects(
  outputChannel: vscode.OutputChannel,
): Promise<readonly NpmProject[]> {
  const packageJsonUris = await vscode.workspace.findFiles("**/package.json", DISCOVERY_EXCLUDE);
  const projects: NpmProject[] = [];

  for (const packageJsonUri of packageJsonUris) {
    try {
      const bytes = await vscode.workspace.fs.readFile(packageJsonUri);
      const content = new TextDecoder().decode(bytes);
      const parsed = parsePackageJsonContent(content);
      if (parsed === undefined) {
        continue;
      }

      const cwd = path.dirname(packageJsonUri.fsPath);
      const scripts = Object.entries(parsed.scripts ?? {})
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(
          ([name, command]): NpmScriptTask => ({
            kind: "npm",
            name,
            command,
            packageJsonUri,
            cwd,
          }),
        )
        .sort((left, right) => left.name.localeCompare(right.name));

      if (scripts.length === 0) {
        continue;
      }

      projects.push({
        name: resolveProjectName(resolvePackageName(parsed.name), cwd),
        packageJsonUri,
        cwd,
        scripts,
      });
    } catch (error: unknown) {
      outputChannel.appendLine(
        `Skipped ${packageJsonUri.fsPath}: ${describeError(error)}`,
      );
    }
  }

  return projects.sort((left, right) => left.cwd.localeCompare(right.cwd));
}

function resolvePackageName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPackageJsonShape(value: unknown): value is PackageJsonShape {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const scripts = (value as Record<string, unknown>).scripts;
  return scripts === undefined || (typeof scripts === "object" && scripts !== null && !Array.isArray(scripts));
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
