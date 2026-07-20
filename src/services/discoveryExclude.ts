import * as path from "node:path";
import * as vscode from "vscode";

/** Built-in findFiles exclude for package.json and shell script discovery. */
export const BUILTIN_DISCOVERY_EXCLUDE = "{**/node_modules/**,**/.git/**,**/dist/**,**/coverage/**,**/vendor/**,**/.venv/**,**/out/**}";

export function getDiscoveryExcludeGlob(patterns: readonly string[] = []): string {
  const userPatterns = patterns.map(toFindFilesExcludePattern).filter((pattern) => pattern.length > 0);

  if (userPatterns.length === 0) {
    return BUILTIN_DISCOVERY_EXCLUDE;
  }

  const builtinPatterns = BUILTIN_DISCOVERY_EXCLUDE.slice(1, -1).split(",");
  return `{${[...builtinPatterns, ...userPatterns].join(",")}}`;
}

export function isDiscoveryUriExcluded(uri: vscode.Uri, patterns: readonly string[]): boolean {
  const relativePath = getWorkspaceRelativePath(uri);
  if (relativePath === undefined) {
    return false;
  }

  return isDiscoveryPathExcluded(relativePath, patterns);
}

export function isDiscoveryPathExcluded(relativePath: string, patterns: readonly string[]): boolean {
  const normalizedPath = normalizeRelativePath(relativePath);

  return patterns.some((pattern) => pathMatchesExcludePattern(normalizedPath, pattern));
}

export function parseDiscoveryExcludePatterns(value: unknown): string[] {
  if (typeof value === "string") {
    return parseDiscoveryExcludeText(value);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    return parseDiscoveryExcludeText(entry);
  });
}

function parseDiscoveryExcludeText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function getWorkspaceRelativePath(uri: vscode.Uri): string | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder === undefined) {
    return undefined;
  }

  return normalizeRelativePath(path.relative(folder.uri.fsPath, uri.fsPath));
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function pathMatchesExcludePattern(relativePath: string, rawPattern: string): boolean {
  const parsed = parseExcludePattern(rawPattern);
  if (parsed === undefined) {
    return false;
  }

  const { rootOnly, targetPath } = parsed;
  if (rootOnly) {
    return relativePath === targetPath || relativePath.startsWith(`${targetPath}/`);
  }

  if (targetPath.includes("/")) {
    return (
      relativePath === targetPath ||
      relativePath.startsWith(`${targetPath}/`) ||
      relativePath.endsWith(`/${targetPath}`) ||
      relativePath.includes(`/${targetPath}/`)
    );
  }

  return (
    relativePath === targetPath ||
    relativePath.startsWith(`${targetPath}/`) ||
    relativePath.endsWith(`/${targetPath}`) ||
    relativePath.includes(`/${targetPath}/`)
  );
}

function parseExcludePattern(rawPattern: string):
  | {
      readonly rootOnly: boolean;
      readonly targetPath: string;
    }
  | undefined {
  let pattern = rawPattern.trim();
  if (pattern.length === 0 || pattern.startsWith("#")) {
    return undefined;
  }

  const rootOnly = pattern.startsWith("/");
  if (rootOnly) {
    pattern = pattern.slice(1);
  }

  if (pattern.endsWith("/**/*")) {
    pattern = pattern.slice(0, -5);
  } else if (pattern.endsWith("/**")) {
    pattern = pattern.slice(0, -3);
  } else if (pattern.endsWith("/")) {
    pattern = pattern.slice(0, -1);
  }

  pattern = normalizeRelativePath(pattern);
  if (pattern.length === 0) {
    return undefined;
  }

  return { rootOnly, targetPath: pattern };
}

function toFindFilesExcludePattern(rawPattern: string): string {
  const parsed = parseExcludePattern(rawPattern);
  if (parsed === undefined) {
    return "";
  }

  const { rootOnly, targetPath } = parsed;
  if (rootOnly) {
    return targetPath.includes("*") ? targetPath : `${targetPath}/**`;
  }

  if (targetPath.includes("*")) {
    return targetPath.startsWith("**/") ? targetPath : `**/${targetPath}`;
  }

  return `**/${targetPath}/**`;
}
