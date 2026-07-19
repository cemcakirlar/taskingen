import * as vscode from "vscode";
import {
  readScriptClickAction,
  readScriptClickMode,
  type ScriptClickMode,
} from "./settings";
import { getTaskIdentity } from "./taskIdentity";
import { TaskItem } from "../tree/TaskItem";

const SOFT_DOUBLE_CLICK_MS = 400;

interface PendingSoftClick {
  readonly identity: string;
  readonly timeout: ReturnType<typeof setTimeout>;
}

export type ScriptActivationHandler = (item: TaskItem) => void | Promise<void>;

export function createScriptActivationController(
  activate: ScriptActivationHandler,
): {
  readonly handleTreeCommand: (item: unknown) => void;
  readonly dispose: () => void;
} {
  let pendingSoftClick: PendingSoftClick | undefined;

  const clearPendingSoftClick = (): void => {
    if (pendingSoftClick === undefined) {
      return;
    }

    clearTimeout(pendingSoftClick.timeout);
    pendingSoftClick = undefined;
  };

  const handleSoftDoubleClick = (item: TaskItem, onDoubleClick: () => void): void => {
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
  };

  return {
    handleTreeCommand(item: unknown): void {
      if (!(item instanceof TaskItem)) {
        return;
      }

      const clickMode = readScriptClickMode();
      const listOpenMode = readWorkbenchListOpenMode();

      if (clickMode === "singleClick") {
        // TreeItem.command fires when the workbench opens the item. When
        // workbench.list.openMode is doubleClick, that is on double click.
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
