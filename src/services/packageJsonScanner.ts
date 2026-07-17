import * as path from "node:path";
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

export function parsePackageName(content: string): string | undefined {
  const parsed: unknown = JSON.parse(content);
  if (!isPackageJsonShape(parsed)) {
    return undefined;
  }

  return resolvePackageName(parsed.name);
}

export function parsePackageScripts(content: string): ReadonlyArray<readonly [string, string]> {
  const parsed: unknown = JSON.parse(content);
  if (!isPackageJsonShape(parsed) || parsed.scripts === undefined) {
    return [];
  }

  return Object.entries(parsed.scripts).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
}

export function resolveProjectName(packageName: string | undefined, cwd: string): string {
  return packageName ?? path.basename(cwd);
}

export async function scanPackageJsonProjects(
  outputChannel: vscode.OutputChannel,
): Promise<readonly NpmProject[]> {
  const packageJsonUris = await vscode.workspace.findFiles(
    "**/package.json",
    "{**/node_modules/**,**/.git/**}",
  );
  const projects: NpmProject[] = [];

  for (const packageJsonUri of packageJsonUris) {
    try {
      const bytes = await vscode.workspace.fs.readFile(packageJsonUri);
      const content = new TextDecoder().decode(bytes);
      const parsed: unknown = JSON.parse(content);
      if (!isPackageJsonShape(parsed)) {
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
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const scripts = (value as Record<string, unknown>).scripts;
  return scripts === undefined || (typeof scripts === "object" && scripts !== null);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
