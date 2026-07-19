import * as vscode from "vscode";
import {
  readScriptClickAction,
  readScriptClickMode,
  type ScriptClickMode,
} from "./groupingSettings";
import { getTaskIdentity } from "./taskIdentity";
import { TaskItem } from "../tree/TaskItem";

const SOFT_DOUBLE_CLICK_MS = 400;

interface PendingSoftClick {
  readonly identity: string;
  readonly timeout: ReturnType<typeof setTimeout>;
}

let pendingSoftClick: PendingSoftClick | undefined;

export type ScriptActivationHandler = (item: TaskItem) => void | Promise<void>;

export function createScriptActivationController(
  activate: ScriptActivationHandler,
): {
  readonly handleTreeCommand: (item: unknown) => void;
  readonly handleSelectionChange: (selection: readonly unknown[]) => void;
  readonly dispose: () => void;
} {
  return {
    handleTreeCommand(item: unknown): void {
      if (!(item instanceof TaskItem)) {
        return;
      }

      const clickMode = readScriptClickMode();
      const listOpenMode = readWorkbenchListOpenMode();

      if (clickMode === "singleClick") {
        // When VS Code only opens on double-click, selection change handles activation.
        if (listOpenMode === "doubleClick") {
          return;
        }
        void activate(item);
        return;
      }

      // Prefer VS Code's native double-click open when available.
      if (listOpenMode === "doubleClick") {
        void activate(item);
        return;
      }

      // VS Code opens on single-click: require two opens in quick succession.
      handleSoftDoubleClick(item, () => {
        void activate(item);
      });
    },

    handleSelectionChange(selection: readonly unknown[]): void {
      if (readScriptClickMode() !== "singleClick") {
        return;
      }

      // Only needed when TreeItem.command does not fire on the first click.
      if (readWorkbenchListOpenMode() !== "doubleClick") {
        return;
      }

      const item = selection[0];
      if (!(item instanceof TaskItem)) {
        return;
      }

      void activate(item);
    },

    dispose(): void {
      clearPendingSoftClick();
    },
  };
}

export function readWorkbenchListOpenMode(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
    "workbench.list",
  ),
): ScriptClickMode {
  return configuration.get("openMode") === "doubleClick" ? "doubleClick" : "singleClick";
}

export async function runConfiguredScriptAction(
  item: TaskItem,
  handlers: {
    readonly open: (item: TaskItem) => void | Promise<void>;
    readonly run: (item: TaskItem) => void | Promise<void>;
  },
): Promise<void> {
  if (readScriptClickAction() === "execute") {
    await handlers.run(item);
    return;
  }

  await handlers.open(item);
}

function handleSoftDoubleClick(item: TaskItem, onDoubleClick: () => void): void {
  const identity = getTaskIdentity(item.task);

  if (pendingSoftClick !== undefined && pendingSoftClick.identity === identity) {
    clearPendingSoftClick();
    onDoubleClick();
    return;
  }

  clearPendingSoftClick();
  pendingSoftClick = {
    identity,
    timeout: setTimeout(() => {
      pendingSoftClick = undefined;
    }, SOFT_DOUBLE_CLICK_MS),
  };
}

function clearPendingSoftClick(): void {
  if (pendingSoftClick === undefined) {
    return;
  }

  clearTimeout(pendingSoftClick.timeout);
  pendingSoftClick = undefined;
}
