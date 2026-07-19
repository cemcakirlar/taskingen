import * as vscode from "vscode";
import type { NpmProject } from "../services/packageJsonScanner";
import type { NpmProjectLeafNode } from "../services/npmProjectTree";
import type { NpmScriptTreeNode } from "../services/npmScriptTree";
import type { RunnableTask } from "../services/runner";
import { getTaskIdentity } from "../services/taskIdentity";
import { isTreeLevelExpanded } from "../services/treeExpansion";

export type TaskGroupKind = "npm" | "shell" | "history";

export class TaskGroupItem extends vscode.TreeItem {
  public constructor(
    public readonly groupKind: TaskGroupKind,
    label: string,
    description: string,
    public readonly depth: number,
    defaultExpandedDepth: number,
  ) {
    super(label, collapsibleStateForDepth(depth, defaultExpandedDepth));
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(iconForGroup(groupKind));
    this.contextValue = contextValueForGroup(groupKind);
    // Include expansion depth so setting changes invalidate VS Code's cached expand state.
    this.id = `expand:${defaultExpandedDepth}:group:${groupKind}`;
  }
}

export class NpmScopeItem extends vscode.TreeItem {
  public constructor(
    public readonly scope: string,
    public readonly projects: readonly NpmProjectLeafNode[],
    public readonly depth: number,
    defaultExpandedDepth: number,
  ) {
    super(scope, collapsibleStateForDepth(depth, defaultExpandedDepth));
    this.contextValue = "npmScope";
    this.iconPath = new vscode.ThemeIcon("organization");
    this.description = `${projects.length}`;
    this.tooltip = scope;
    this.id = `expand:${defaultExpandedDepth}:scope:${scope}`;
  }
}

export class NpmProjectItem extends vscode.TreeItem {
  public constructor(
    public readonly project: NpmProject,
    displayName: string,
    public readonly depth: number,
    defaultExpandedDepth: number,
  ) {
    super(displayName, collapsibleStateForDepth(depth, defaultExpandedDepth));
    this.description = formatWorkspaceRelativeFolder(project.cwd);
    this.tooltip = `${project.name}\n${project.cwd}`;
    // ThemeIcon.Folder follows open/closed collapsible state with the themed folder glyph.
    this.iconPath = vscode.ThemeIcon.Folder;
    this.resourceUri = vscode.Uri.file(project.cwd);
    this.contextValue = "npmProject";
    this.id = `expand:${defaultExpandedDepth}:project:${project.packageJsonUri.toString()}`;
  }
}

export class NpmScriptGroupItem extends vscode.TreeItem {
  public constructor(
    public readonly labelText: string,
    public readonly children: readonly NpmScriptTreeNode[],
    public readonly depth: number,
    defaultExpandedDepth: number,
    public readonly identityPath: string,
    public readonly folderUri: vscode.Uri,
  ) {
    super(labelText, collapsibleStateForDepth(depth, defaultExpandedDepth));
    this.contextValue = "npmScriptGroup";
    this.iconPath = vscode.ThemeIcon.Folder;
    this.resourceUri = folderUri;
    this.id = `expand:${defaultExpandedDepth}:script-group:${identityPath}`;
  }
}

export class TaskItem extends vscode.TreeItem {
  public constructor(
    public readonly task: RunnableTask,
    displayLabel: string = task.name,
    isRunning: boolean = false,
    treeIdPrefix?: string,
  ) {
    super(displayLabel, vscode.TreeItemCollapsibleState.None);

    const baseContext = task.kind === "npm" ? "npmScript" : "shellScript";
    this.contextValue = isRunning ? `${baseContext}Running` : baseContext;
    this.description = describeTaskItem(task, isRunning);
    this.tooltip = buildTaskTooltip(task, isRunning);
    this.iconPath = new vscode.ThemeIcon(
      isRunning ? "play-circle" : task.kind === "npm" ? "symbol-event" : "file-code",
    );
    this.resourceUri = task.kind === "shell" ? task.scriptUri : task.packageJsonUri;
    if (treeIdPrefix !== undefined) {
      this.id = `${treeIdPrefix}:${getTaskIdentity(task)}`;
    }
    this.command = {
      command: "taskingen.activateScript",
      title: "Activate Script",
      arguments: [this],
    };
  }
}

export type TaskTreeItem =
  | TaskGroupItem
  | NpmScopeItem
  | NpmProjectItem
  | NpmScriptGroupItem
  | TaskItem;

function iconForGroup(groupKind: TaskGroupKind): string {
  if (groupKind === "npm") {
    return "package";
  }

  if (groupKind === "shell") {
    return "terminal-bash";
  }

  return "history";
}

function contextValueForGroup(groupKind: TaskGroupKind): string | undefined {
  return groupKind === "history" ? "taskHistory" : undefined;
}

function describeTaskItem(task: RunnableTask, isRunning: boolean): string | undefined {
  if (isRunning) {
    return "running";
  }

  return task.kind === "shell" ? vscode.workspace.asRelativePath(task.scriptUri, false) : undefined;
}

function buildTaskTooltip(task: RunnableTask, isRunning: boolean): string {
  const runningPrefix = isRunning ? "Running\n" : "";
  if (task.kind === "npm") {
    return `${runningPrefix}${task.name}\n${task.command}\n${task.packageJsonUri.fsPath}`;
  }

  return `${runningPrefix}${task.scriptUri.fsPath}`;
}

function collapsibleStateForDepth(depth: number, defaultExpandedDepth: number): vscode.TreeItemCollapsibleState {
  return isTreeLevelExpanded(depth, defaultExpandedDepth)
    ? vscode.TreeItemCollapsibleState.Expanded
    : vscode.TreeItemCollapsibleState.Collapsed;
}

function formatWorkspaceRelativeFolder(cwd: string): string {
  const relativePath = vscode.workspace.asRelativePath(cwd, false);
  return relativePath === "" || relativePath === "." ? "./" : relativePath;
}
