import * as vscode from "vscode";
import { readTaskHistorySettings } from "./settings";
import type { NpmProject } from "./packageJsonScanner";
import type { RunnableTask } from "./runner";
import type { ShellScriptTask } from "./shellScriptScanner";
import { getLegacyTaskIdentities, getTaskIdentity, type IdentityTask } from "./taskIdentity";

const HISTORY_STATE_KEY = "taskingen.taskHistory";
const MAX_STORED_ENTRIES = 100;

export interface TaskHistoryEntry {
  readonly identity: string;
  readonly usedAt: number;
}

export class TaskHistoryStore {
  private entries: TaskHistoryEntry[] | undefined;

  public constructor(private readonly workspaceState: vscode.Memento) {}

  public record(task: IdentityTask): void {
    const identity = getTaskIdentity(task);
    if (!taskBelongsToOpenWorkspace(task)) {
      return;
    }

    const next: TaskHistoryEntry[] = [
      { identity, usedAt: Date.now() },
      ...this.readEntries().filter((entry) => entry.identity !== identity),
    ].slice(0, MAX_STORED_ENTRIES);

    this.entries = next;
    void this.workspaceState.update(HISTORY_STATE_KEY, next);
  }

  public async clear(): Promise<void> {
    this.entries = [];
    await this.workspaceState.update(HISTORY_STATE_KEY, []);
  }

  public resolveRecentTasks(npmProjects: readonly NpmProject[], shellScripts: readonly ShellScriptTask[]): readonly RunnableTask[] {
    const settings = readTaskHistorySettings();
    if (!settings.enabled) {
      return [];
    }

    const tasksByIdentity = indexDiscoverableTasks(npmProjects, shellScripts);
    const recent: RunnableTask[] = [];
    const seenIdentities = new Set<string>();

    for (const entry of this.readEntries()) {
      const task = tasksByIdentity.get(entry.identity);
      if (task === undefined || !taskBelongsToOpenWorkspace(task)) {
        continue;
      }

      const canonicalIdentity = getTaskIdentity(task);
      if (seenIdentities.has(canonicalIdentity)) {
        continue;
      }

      seenIdentities.add(canonicalIdentity);
      recent.push(task);
      if (recent.length >= settings.maxItems) {
        break;
      }
    }

    return recent;
  }

  private readEntries(): readonly TaskHistoryEntry[] {
    if (this.entries !== undefined) {
      return this.entries;
    }

    const stored = this.workspaceState.get<unknown>(HISTORY_STATE_KEY);
    this.entries = Array.isArray(stored) ? stored.filter(isTaskHistoryEntry) : [];
    return this.entries;
  }
}

export function taskBelongsToOpenWorkspace(task: IdentityTask): boolean {
  const folders = vscode.workspace.workspaceFolders;
  if (folders === undefined || folders.length === 0) {
    return false;
  }

  const taskPath = task.kind === "shell" ? task.scriptUri.fsPath : task.cwd;
  return folders.some((folder) => isPathInsideFolder(taskPath, folder.uri.fsPath));
}

export function indexDiscoverableTasks(
  npmProjects: readonly NpmProject[],
  shellScripts: readonly ShellScriptTask[],
): Map<string, RunnableTask> {
  const tasksByIdentity = new Map<string, RunnableTask>();

  for (const project of npmProjects) {
    for (const script of project.scripts) {
      tasksByIdentity.set(getTaskIdentity(script), script);
      for (const legacyIdentity of getLegacyTaskIdentities(script)) {
        if (!tasksByIdentity.has(legacyIdentity)) {
          tasksByIdentity.set(legacyIdentity, script);
        }
      }
    }
  }

  for (const script of shellScripts) {
    tasksByIdentity.set(getTaskIdentity(script), script);
  }

  return tasksByIdentity;
}

function isPathInsideFolder(targetPath: string, folderPath: string): boolean {
  const normalizedTarget = normalizePath(targetPath);
  const normalizedFolder = normalizePath(folderPath);

  return normalizedTarget === normalizedFolder || normalizedTarget.startsWith(`${normalizedFolder}/`);
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/\/+$/, "");
}

function isTaskHistoryEntry(value: unknown): value is TaskHistoryEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.identity === "string" && typeof candidate.usedAt === "number" && Number.isFinite(candidate.usedAt);
}
