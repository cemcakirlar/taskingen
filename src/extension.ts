import * as vscode from "vscode";
import { affectsTaskingenTree } from "./services/groupingSettings";
import { RunningTaskRegistry } from "./services/runningTaskRegistry";
import { openTaskSource } from "./services/scriptSourceOpener";
import { runTask, stopTask } from "./services/runner";
import { getTaskShortLabel } from "./services/taskIdentity";
import { RunningTaskItem, TaskItem } from "./tree/TaskItem";
import { TaskTreeProvider, type TaskCounts } from "./tree/TaskTreeProvider";

const SCRIPT_VIEW_ID = "taskingen.scripts";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel("Taskingen");
  const runningRegistry = new RunningTaskRegistry();
  const provider = new TaskTreeProvider(outputChannel, runningRegistry);
  const treeView = vscode.window.createTreeView(SCRIPT_VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  // Keep tab title as Taskingen when the view is dragged to panel/secondary.
  treeView.title = "Taskingen";

  const applyTreeMessage = (message: string | undefined): void => {
    treeView.message = message;
  };

  const refresh = async (): Promise<void> => {
    try {
      const counts = await provider.refresh();
      applyTreeMessage(createEmptyStateMessage(counts));
    } catch (error: unknown) {
      outputChannel.appendLine(`Refresh failed: ${describeError(error)}`);
      applyTreeMessage("Unable to discover scripts. See the Taskingen output for details.");
    }
  };

  const openCommand = vscode.commands.registerCommand(
    "taskingen.open",
    async (item: unknown): Promise<void> => {
      if (!(item instanceof TaskItem)) {
        return;
      }

      try {
        await openTaskSource(item.task);
      } catch (error: unknown) {
        const message = `Unable to open ${item.task.name}: ${describeError(error)}`;
        outputChannel.appendLine(message);
        void vscode.window.showErrorMessage(message);
      }
    },
  );
  const runCommand = vscode.commands.registerCommand(
    "taskingen.run",
    async (item: unknown): Promise<void> => {
      if (!(item instanceof TaskItem)) {
        return;
      }

      try {
        const result = await runTask(item.task, runningRegistry);
        if (result.status === "already-running") {
          void vscode.window.showInformationMessage(
            `${getTaskShortLabel(item.task)} is already running.`,
          );
        }
      } catch (error: unknown) {
        const message = `Unable to run ${item.task.name}: ${describeError(error)}`;
        outputChannel.appendLine(message);
        void vscode.window.showErrorMessage(message);
      }
    },
  );
  const stopCommand = vscode.commands.registerCommand(
    "taskingen.stop",
    (item: unknown): void => {
      const task =
        item instanceof TaskItem
          ? item.task
          : item instanceof RunningTaskItem
            ? item.entry.task
            : undefined;
      if (task === undefined) {
        return;
      }

      const stopped = stopTask(task, runningRegistry);
      if (!stopped) {
        void vscode.window.showInformationMessage(
          `${getTaskShortLabel(task)} is not running.`,
        );
      }
    },
  );
  const focusRunningCommand = vscode.commands.registerCommand(
    "taskingen.focusRunning",
    (item: unknown): void => {
      if (!(item instanceof RunningTaskItem)) {
        return;
      }

      item.entry.terminal.show();
    },
  );
  const refreshCommand = vscode.commands.registerCommand("taskingen.refresh", refresh);
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/{package.json,*.sh,*.bash}",
  );
  const changeListener = watcher.onDidChange(() => void refresh());
  const createListener = watcher.onDidCreate(() => void refresh());
  const deleteListener = watcher.onDidDelete(() => void refresh());
  const configurationListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (affectsTaskingenTree(event)) {
      void refresh();
    }
  });
  const terminalCloseListener = vscode.window.onDidCloseTerminal((terminal) => {
    runningRegistry.unregisterByTerminal(terminal);
  });
  const runningChangeListener = runningRegistry.onDidChange(() => {
    provider.refreshRunning();
    applyTreeMessage(createEmptyStateMessage(provider.getCounts()));
  });

  context.subscriptions.push(
    outputChannel,
    runningRegistry,
    provider,
    treeView,
    openCommand,
    runCommand,
    stopCommand,
    focusRunningCommand,
    refreshCommand,
    watcher,
    changeListener,
    createListener,
    deleteListener,
    configurationListener,
    terminalCloseListener,
    runningChangeListener,
  );

  await refresh();
}

export function deactivate(): void {}

export function createEmptyStateMessage(counts: TaskCounts): string | undefined {
  if (counts.npm > 0 || counts.shell > 0 || counts.running > 0) {
    return undefined;
  }

  return vscode.workspace.workspaceFolders === undefined
    ? "Open a folder to discover npm and shell scripts."
    : "No npm or shell scripts found in this workspace.";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
