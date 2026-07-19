import * as path from "node:path";
import type { NpmScriptTask } from "./packageJsonScanner";
import type { ShellScriptTask } from "./shellScriptScanner";

export type IdentityTask = NpmScriptTask | ShellScriptTask;

export function getTaskIdentity(task: IdentityTask): string {
  if (task.kind === "shell") {
    return `shell:${task.scriptUri.toString()}`;
  }

  return `npm:${task.packageJsonUri.toString()}::${task.name}`;
}

/** Older history keys used cwd instead of packageJsonUri for npm scripts. */
export function getLegacyTaskIdentities(task: IdentityTask): readonly string[] {
  if (task.kind === "shell") {
    return [];
  }

  return [`npm:${task.cwd}::${task.name}`];
}

export function getTaskShortLabel(task: IdentityTask): string {
  if (task.kind === "shell") {
    return task.name;
  }

  return `${path.basename(task.cwd)} / ${task.name}`;
}

export function getTaskTerminalName(task: IdentityTask): string {
  const label = task.kind === "shell" ? shellTerminalLabel(task) : getTaskShortLabel(task);
  return `Taskingen: ${label} · ${shortIdentityTag(getTaskIdentity(task))}`;
}

function shellTerminalLabel(task: ShellScriptTask): string {
  const normalized = task.scriptUri.fsPath.replaceAll("\\", "/");
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  if (segments.length >= 2) {
    return `${segments[segments.length - 2]}/${segments[segments.length - 1]}`;
  }

  return task.name;
}

function shortIdentityTag(identity: string): string {
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).slice(0, 4);
}
