import * as vscode from "vscode";
import { affectsTaskingenTree } from "./services/groupingSettings";
import { RunningTaskRegistry } from "./services/runningTaskRegistry";
import { createScriptActivationController, runConfiguredScriptAction } from "./services/scriptActivation";
import { openTaskSource } from "./services/scriptSourceOpener";
import { runTask, stopTask } from "./services/runner";
import { TaskHistoryStore } from "./services/taskHistory";
import { getTaskShortLabel } from "./services/taskIdentity";
import { TaskItem } from "./tree/TaskItem";
import { TaskTreeProvider, type TaskCounts } from "./tree/TaskTreeProvider";

const SCRIPT_VIEW_ID = "taskingen.scripts";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel("Taskingen");
  const runningRegistry = new RunningTaskRegistry();
  const taskHistory = new TaskHistoryStore(context.workspaceState);
  const provider = new TaskTreeProvider(outputChannel, runningRegistry, taskHistory);
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

  const openScript = async (item: TaskItem): Promise<void> => {
    try {
      await openTaskSource(item.task);
    } catch (error: unknown) {
      const message = `Unable to open ${item.task.name}: ${describeError(error)}`;
      outputChannel.appendLine(message);
      void vscode.window.showErrorMessage(message);
    }
  };

  const runScript = async (item: TaskItem): Promise<void> => {
    try {
      const result = await runTask(item.task, runningRegistry);
      taskHistory.record(item.task);
      provider.refreshHistory();
      applyTreeMessage(createEmptyStateMessage(provider.getCounts()));
      if (result.status === "already-running") {
        void vscode.window.showInformationMessage(`${getTaskShortLabel(item.task)} is already running.`);
      }
    } catch (error: unknown) {
      const message = `Unable to run ${item.task.name}: ${describeError(error)}`;
      outputChannel.appendLine(message);
      void vscode.window.showErrorMessage(message);
    }
  };

  const scriptActivation = createScriptActivationController((item) =>
    runConfiguredScriptAction(item, { open: openScript, run: runScript }),
  );

  const activateScriptCommand = vscode.commands.registerCommand("taskingen.activateScript", (item: unknown): void => {
    scriptActivation.handleTreeCommand(item);
  });
  const openCommand = vscode.commands.registerCommand("taskingen.open", async (item: unknown): Promise<void> => {
    if (!(item instanceof TaskItem)) {
      return;
    }

    await openScript(item);
  });
  const runCommand = vscode.commands.registerCommand("taskingen.run", async (item: unknown): Promise<void> => {
    if (!(item instanceof TaskItem)) {
      return;
    }

    await runScript(item);
  });
  const stopCommand = vscode.commands.registerCommand("taskingen.stop", (item: unknown): void => {
    if (!(item instanceof TaskItem)) {
      return;
    }

    const stopped = stopTask(item.task, runningRegistry);
    if (!stopped) {
      void vscode.window.showInformationMessage(`${getTaskShortLabel(item.task)} is not running.`);
    }
  });
  const clearHistoryCommand = vscode.commands.registerCommand("taskingen.clearHistory", async (): Promise<void> => {
    const choice = await vscode.window.showWarningMessage("Clear Task History?", { modal: true }, "Yes", "No");
    if (choice !== "Yes") {
      return;
    }

    await taskHistory.clear();
    provider.refreshHistory();
    applyTreeMessage(createEmptyStateMessage(provider.getCounts()));
  });
  const refreshCommand = vscode.commands.registerCommand("taskingen.refresh", refresh);
  const watcher = vscode.workspace.createFileSystemWatcher("**/{package.json,*.sh,*.bash}");
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
  const selectionListener = treeView.onDidChangeSelection((event) => {
    scriptActivation.handleSelectionChange(event.selection);
  });

  context.subscriptions.push(
    outputChannel,
    runningRegistry,
    provider,
    treeView,
    scriptActivation,
    activateScriptCommand,
    openCommand,
    runCommand,
    stopCommand,
    clearHistoryCommand,
    refreshCommand,
    watcher,
    changeListener,
    createListener,
    deleteListener,
    configurationListener,
    terminalCloseListener,
    runningChangeListener,
    selectionListener,
  );

  await refresh();
}

export function deactivate(): void {}

export function createEmptyStateMessage(counts: TaskCounts): string | undefined {
  if (counts.npm > 0 || counts.shell > 0) {
    return undefined;
  }

  return vscode.workspace.workspaceFolders === undefined
    ? "Open a folder to discover npm and shell scripts."
    : "No npm or shell scripts found in this workspace.";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
