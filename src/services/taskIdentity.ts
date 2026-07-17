import * as path from "node:path";
import type { NpmScriptTask } from "./packageJsonScanner";
import type { ShellScriptTask } from "./shellScriptScanner";

export type IdentityTask = NpmScriptTask | ShellScriptTask;

export function getTaskIdentity(task: IdentityTask): string {
  if (task.kind === "shell") {
    return `shell:${task.scriptUri.toString()}`;
  }

  return `npm:${task.cwd}::${task.name}`;
}

export function getTaskShortLabel(task: IdentityTask): string {
  if (task.kind === "shell") {
    return task.name;
  }

  return `${path.basename(task.cwd)} / ${task.name}`;
}

export function getTaskTerminalName(task: IdentityTask): string {
  return `Taskingen: ${getTaskShortLabel(task)}`;
}
