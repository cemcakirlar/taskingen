import { clearTimeout, setTimeout } from "node:timers";
import * as vscode from "vscode";
import { detectPackageManager } from "./packageManager";
import type { NpmScriptTask } from "./packageJsonScanner";
import type { RunningTaskRegistry } from "./runningTaskRegistry";
import type { ShellScriptTask } from "./shellScriptScanner";
import {
  getTaskIdentity,
  getTaskShortLabel,
  getTaskTerminalName,
} from "./taskIdentity";

export type RunnableTask = NpmScriptTask | ShellScriptTask;

export interface RunTaskResult {
  readonly status: "started" | "already-running";
  readonly terminal: vscode.Terminal;
}

export function quoteShellArgument(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export async function buildTaskCommand(task: RunnableTask): Promise<string> {
  if (task.kind === "shell") {
    return `bash ${quoteShellArgument(task.scriptUri.fsPath)}`;
  }

  const packageManager = await detectPackageManager(task.cwd);
  return `${packageManager} run ${quoteShellArgument(task.name)}`;
}

export async function runTask(
  task: RunnableTask,
  registry: RunningTaskRegistry,
): Promise<RunTaskResult> {
  const identity = getTaskIdentity(task);
  const existing = registry.get(task);
  if (existing !== undefined) {
    existing.terminal.show();
    return { status: "already-running", terminal: existing.terminal };
  }

  const terminalName = getTaskTerminalName(task);
  const command = await buildTaskCommand(task);
  const commandInWorkingDirectory = `cd ${quoteShellArgument(task.cwd)} && ${command}`;
  const terminal =
    vscode.window.terminals.find((candidate) => candidate.name === terminalName) ??
    vscode.window.createTerminal({
      name: terminalName,
      cwd: task.cwd,
    });

  registry.register({
    identity,
    task,
    terminal,
    label: getTaskShortLabel(task),
  });

  terminal.show();
  await executeInTerminal(terminal, commandInWorkingDirectory, () => {
    registry.unregister(identity);
  });

  return { status: "started", terminal };
}

export function stopTask(
  task: RunnableTask,
  registry: RunningTaskRegistry,
): boolean {
  const entry = registry.get(task);
  if (entry === undefined) {
    return false;
  }

  entry.terminal.show();
  // Soft stop: interrupt the foreground process and clear running UI immediately.
  // The shell may still be winding down; the terminal is kept for reuse.
  entry.terminal.sendText("\u0003", false);
  registry.unregister(getTaskIdentity(task));
  return true;
}

async function executeInTerminal(
  terminal: vscode.Terminal,
  commandLine: string,
  onTaskEnded: () => void,
): Promise<void> {
  const shellIntegration = await waitForShellIntegration(terminal, 3000);
  const disposables: vscode.Disposable[] = [];
  let ended = false;

  const endOnce = (): void => {
    if (ended) {
      return;
    }

    ended = true;
    for (const disposable of disposables) {
      disposable.dispose();
    }
    onTaskEnded();
  };

  disposables.push(
    vscode.window.onDidCloseTerminal((closed) => {
      if (closed === terminal) {
        endOnce();
      }
    }),
  );

  if (shellIntegration === undefined) {
    // Without shell integration we cannot observe command completion; clear
    // running state when the terminal closes (Stop already unregisters).
    terminal.sendText(commandLine);
    return;
  }

  const execution = shellIntegration.executeCommand(commandLine);
  disposables.push(
    vscode.window.onDidEndTerminalShellExecution((event) => {
      if (event.execution !== execution) {
        return;
      }

      endOnce();
    }),
  );
}

async function waitForShellIntegration(
  terminal: vscode.Terminal,
  timeoutMs: number,
): Promise<vscode.TerminalShellIntegration | undefined> {
  if (terminal.shellIntegration !== undefined) {
    return terminal.shellIntegration;
  }

  return await new Promise((resolve) => {
    const timer = setTimeout(() => {
      listener.dispose();
      resolve(undefined);
    }, timeoutMs);

    const listener = vscode.window.onDidChangeTerminalShellIntegration((event) => {
      if (event.terminal !== terminal || event.shellIntegration === undefined) {
        return;
      }

      clearTimeout(timer);
      listener.dispose();
      resolve(event.shellIntegration);
    });
  });
}
