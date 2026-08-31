import * as vscode from "vscode";
import type { DenoProject } from "./denoJsonScanner";
import { readFavoritesSettings } from "./settings";
import type { NpmProject } from "./packageJsonScanner";
import type { RunnableTask } from "./runner";
import type { ShellScriptTask } from "./shellScriptScanner";
import { getTaskIdentity, type IdentityTask } from "./taskIdentity";
import { indexDiscoverableTasks, taskBelongsToOpenWorkspace } from "./taskHistory";

const FAVORITES_STATE_KEY = "taskingen.favorites";

export interface FavoritesEntry {
  readonly identity: string;
}

export class FavoritesStore {
  private entries: FavoritesEntry[] | undefined;

  public constructor(private readonly workspaceState: vscode.Memento) {}

  public isFavorite(task: IdentityTask): boolean {
    const identity = getTaskIdentity(task);
    return this.readEntries().some((entry) => entry.identity === identity);
  }

  public add(task: IdentityTask): void {
    if (!taskBelongsToOpenWorkspace(task)) {
      return;
    }

    const identity = getTaskIdentity(task);
    const current = this.readEntries();
    if (current.some((entry) => entry.identity === identity)) {
      return;
    }

    const next: FavoritesEntry[] = [...current, { identity }];
    this.entries = next;
    void this.workspaceState.update(FAVORITES_STATE_KEY, next);
  }

  public remove(task: IdentityTask): void {
    const identity = getTaskIdentity(task);
    const next = this.readEntries().filter((entry) => entry.identity !== identity);
    this.entries = next;
    void this.workspaceState.update(FAVORITES_STATE_KEY, next);
  }

  public toggle(task: IdentityTask): void {
    if (this.isFavorite(task)) {
      this.remove(task);
      return;
    }

    this.add(task);
  }

  public async clear(): Promise<void> {
    this.entries = [];
    await this.workspaceState.update(FAVORITES_STATE_KEY, []);
  }

  public storedCount(): number {
    return this.readEntries().length;
  }

  public resolveFavoriteTasks(
    npmProjects: readonly NpmProject[],
    denoProjects: readonly DenoProject[],
    shellScripts: readonly ShellScriptTask[],
  ): readonly RunnableTask[] {
    const settings = readFavoritesSettings();
    if (!settings.enabled) {
      return [];
    }

    const tasksByIdentity = indexDiscoverableTasks(npmProjects, denoProjects, shellScripts);
    const favorites: RunnableTask[] = [];
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
      favorites.push(task);
      if (favorites.length >= settings.maxItems) {
        break;
      }
    }

    return favorites;
  }

  private readEntries(): readonly FavoritesEntry[] {
    if (this.entries !== undefined) {
      return this.entries;
    }

    const stored = this.workspaceState.get<unknown>(FAVORITES_STATE_KEY);
    this.entries = Array.isArray(stored) ? stored.filter(isFavoritesEntry) : [];
    return this.entries;
  }
}

function isFavoritesEntry(value: unknown): value is FavoritesEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.identity === "string";
}
