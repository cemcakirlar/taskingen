import * as path from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import * as vscode from "vscode";
import { getDiscoveryExcludeGlob, isDiscoveryUriExcluded } from "./discoveryExclude";
import { resolveProjectName } from "./packageJsonScanner";
import { readDiscoveryExcludePatterns } from "./settings";

export interface DenoTask {
  readonly kind: "deno";
  readonly name: string;
  readonly command: string;
  readonly description?: string;
  readonly denoJsonUri: vscode.Uri;
  readonly cwd: string;
}

export interface DenoProject {
  readonly name: string;
  readonly denoJsonUri: vscode.Uri;
  readonly cwd: string;
  readonly tasks: readonly DenoTask[];
}

export interface DenoJsonShape {
  readonly name?: unknown;
  readonly tasks?: Record<string, unknown>;
}

export interface ParsedDenoTask {
  readonly command: string;
  readonly description?: string;
}

export async function scanDenoJsonProjects(outputChannel: vscode.OutputChannel): Promise<readonly DenoProject[]> {
  const excludePatterns = readDiscoveryExcludePatterns();
  const denoJsonUris = (await vscode.workspace.findFiles("**/{deno.json,deno.jsonc}", getDiscoveryExcludeGlob(excludePatterns))).filter(
    (uri) => !isDiscoveryUriExcluded(uri, excludePatterns),
  );

  const projectsByCwd = new Map<string, DenoProject>();
  const preferredByCwd = new Map<string, vscode.Uri>();

  for (const denoJsonUri of denoJsonUris) {
    try {
      const cwd = path.dirname(denoJsonUri.fsPath);
      const existingPreferred = preferredByCwd.get(cwd);
      if (existingPreferred !== undefined && shouldPreferExistingDenoConfig(existingPreferred, denoJsonUri)) {
        outputChannel.appendLine(`Skipped ${denoJsonUri.fsPath}: preferring ${existingPreferred.fsPath}`);
        continue;
      }

      const bytes = await vscode.workspace.fs.readFile(denoJsonUri);
      const content = new TextDecoder().decode(bytes);
      const parsed = parseDenoJsonContent(content);
      if (parsed === undefined) {
        continue;
      }

      const tasks = Object.entries(parsed.tasks ?? {})
        .flatMap(([name, value]): DenoTask[] => {
          const parsedTask = parseDenoTaskValue(value);
          if (parsedTask === undefined) {
            return [];
          }

          return [
            {
              kind: "deno",
              name,
              command: parsedTask.command,
              ...(parsedTask.description !== undefined ? { description: parsedTask.description } : {}),
              denoJsonUri,
              cwd,
            },
          ];
        })
        .sort((left, right) => left.name.localeCompare(right.name));

      if (tasks.length === 0) {
        continue;
      }

      if (existingPreferred !== undefined && !shouldPreferExistingDenoConfig(existingPreferred, denoJsonUri)) {
        outputChannel.appendLine(`Skipped ${existingPreferred.fsPath}: preferring ${denoJsonUri.fsPath}`);
      }

      preferredByCwd.set(cwd, denoJsonUri);
      projectsByCwd.set(cwd, {
        name: resolveProjectName(resolvePackageName(parsed.name), cwd),
        denoJsonUri,
        cwd,
        tasks,
      });
    } catch (error: unknown) {
      outputChannel.appendLine(`Skipped ${denoJsonUri.fsPath}: ${describeError(error)}`);
    }
  }

  return [...projectsByCwd.values()].sort((left, right) => left.cwd.localeCompare(right.cwd));
}

export function parseDenoJsonContent(content: string): DenoJsonShape | undefined {
  const parsed: unknown = parseJsonc(content);
  return isDenoJsonShape(parsed) ? parsed : undefined;
}

export function parseDenoTaskValue(value: unknown): ParsedDenoTask | undefined {
  if (typeof value === "string") {
    return { command: value };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.command !== "string") {
    return undefined;
  }

  const description = typeof record.description === "string" ? record.description : undefined;
  return description === undefined ? { command: record.command } : { command: record.command, description };
}

function shouldPreferExistingDenoConfig(existing: vscode.Uri, candidate: vscode.Uri): boolean {
  const existingIsJson = path.basename(existing.fsPath) === "deno.json";
  const candidateIsJson = path.basename(candidate.fsPath) === "deno.json";
  if (existingIsJson === candidateIsJson) {
    return true;
  }

  return existingIsJson;
}

function resolvePackageName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isDenoJsonShape(value: unknown): value is DenoJsonShape {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const tasks = (value as Record<string, unknown>).tasks;
  return tasks === undefined || (typeof tasks === "object" && tasks !== null && !Array.isArray(tasks));
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
