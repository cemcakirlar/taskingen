import * as vscode from "vscode";
import type { DenoProject } from "../services/denoJsonScanner";
import type { NpmProject } from "../services/packageJsonScanner";
import type {
  DenoProjectLeafNode,
  DenoProjectTreeNode,
  NpmProjectLeafNode,
  NpmProjectTreeNode,
  ShellTreeNode,
} from "../services/npmProjectTree";
import type { ScriptTreeNode } from "../services/npmScriptTree";
import type { RunnableTask } from "../services/runner";
import { getTaskIdentity } from "../services/taskIdentity";
import { isTreeLevelExpanded } from "../services/treeExpansion";
import { projectFolderDescription, workspaceRelativePath } from "../services/workspacePath";

export type TaskGroupKind = "npm" | "deno" | "shell" | "history" | "favorites" | "running";

export type PathFolderKind = "npm" | "deno" | "shell";

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

export class PathFolderItem extends vscode.TreeItem {
  public constructor(
    public readonly folderKind: PathFolderKind,
    public readonly labelText: string,
    public readonly pathKey: string,
    public readonly children: readonly NpmProjectTreeNode[] | readonly DenoProjectTreeNode[] | readonly ShellTreeNode[],
    public readonly depth: number,
    defaultExpandedDepth: number,
  ) {
    super(labelText, collapsibleStateForDepth(depth, defaultExpandedDepth));
    this.contextValue = `${folderKind}PathFolder`;
    // Same as project nodes: ThemeIcon.Folder + resourceUri uses the file icon theme.
    this.iconPath = vscode.ThemeIcon.Folder;
    this.resourceUri = resolvePathFolderUri(pathKey, children);
    this.tooltip = pathKey;
    this.id = `expand:${defaultExpandedDepth}:path-folder:${folderKind}:${pathKey}`;
  }
}

export class NpmScopeItem extends vscode.TreeItem {
  public constructor(
    public readonly scope: string,
    public readonly projects: readonly NpmProjectLeafNode[],
    public readonly depth: number,
    defaultExpandedDepth: number,
    identityPath: string = "",
  ) {
    super(scope, collapsibleStateForDepth(depth, defaultExpandedDepth));
    this.contextValue = "npmScope";
    this.iconPath = new vscode.ThemeIcon("organization");
    this.description = `${projects.length}`;
    this.tooltip = scope;
    this.id = `expand:${defaultExpandedDepth}:scope:npm:${identityPath}:${scope}`;
  }
}

export class DenoScopeItem extends vscode.TreeItem {
  public constructor(
    public readonly scope: string,
    public readonly projects: readonly DenoProjectLeafNode[],
    public readonly depth: number,
    defaultExpandedDepth: number,
    identityPath: string = "",
  ) {
    super(scope, collapsibleStateForDepth(depth, defaultExpandedDepth));
    this.contextValue = "denoScope";
    this.iconPath = new vscode.ThemeIcon("organization");
    this.description = `${projects.length}`;
    this.tooltip = scope;
    this.id = `expand:${defaultExpandedDepth}:scope:deno:${identityPath}:${scope}`;
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
    const description = projectFolderDescription(workspaceRelativePath(project.cwd), displayName);
    this.description = description.length > 0 ? description : undefined;
    this.tooltip = `${project.name}\n${project.cwd}`;
    // ThemeIcon.Folder follows open/closed collapsible state with the themed folder glyph.
    this.iconPath = vscode.ThemeIcon.Folder;
    this.resourceUri = vscode.Uri.file(project.cwd);
    this.contextValue = "npmProject";
    this.id = `expand:${defaultExpandedDepth}:project:${project.packageJsonUri.toString()}`;
  }
}

export class DenoProjectItem extends vscode.TreeItem {
  public constructor(
    public readonly project: DenoProject,
    displayName: string,
    public readonly depth: number,
    defaultExpandedDepth: number,
  ) {
    super(displayName, collapsibleStateForDepth(depth, defaultExpandedDepth));
    const description = projectFolderDescription(workspaceRelativePath(project.cwd), displayName);
    this.description = description.length > 0 ? description : undefined;
    this.tooltip = `${project.name}\n${project.cwd}`;
    this.iconPath = vscode.ThemeIcon.Folder;
    this.resourceUri = vscode.Uri.file(project.cwd);
    this.contextValue = "denoProject";
    this.id = `expand:${defaultExpandedDepth}:project:${project.denoJsonUri.toString()}`;
  }
}

export class ScriptGroupItem extends vscode.TreeItem {
  public constructor(
    public readonly labelText: string,
    public readonly children: readonly ScriptTreeNode<RunnableTask>[],
    public readonly depth: number,
    defaultExpandedDepth: number,
    public readonly identityPath: string,
    public readonly folderUri: vscode.Uri,
  ) {
    super(labelText, collapsibleStateForDepth(depth, defaultExpandedDepth));
    this.contextValue = "scriptGroup";
    this.iconPath = vscode.ThemeIcon.Folder;
    this.resourceUri = folderUri;
    this.id = `expand:${defaultExpandedDepth}:script-group:${identityPath}`;
  }
}

export interface ScriptContextOptions {
  readonly isRunning?: boolean;
  readonly isFavorite?: boolean;
  readonly isHistoryItem?: boolean;
}

export function buildScriptContextValue(task: RunnableTask, options: ScriptContextOptions = {}): string {
  const historySuffix = options.isHistoryItem === true ? "History" : "";
  const favoriteSuffix = options.isFavorite === true ? "Favorited" : "";
  const runningSuffix = options.isRunning === true ? "Running" : "";
  return `${contextValueForTask(task)}${historySuffix}${favoriteSuffix}${runningSuffix}`;
}

export class TaskItem extends vscode.TreeItem {
  public constructor(
    public readonly task: RunnableTask,
    displayLabel: string = task.name,
    isRunning: boolean = false,
    treeIdPrefix?: string,
    isFavorite: boolean = false,
    isHistoryItem: boolean = false,
  ) {
    super(displayLabel, vscode.TreeItemCollapsibleState.None);

    this.contextValue = buildScriptContextValue(task, { isRunning, isFavorite, isHistoryItem });
    this.description = describeTaskItem(task, isRunning);
    this.tooltip = buildTaskTooltip(task, isRunning);
    this.iconPath = new vscode.ThemeIcon(isRunning ? "play-circle" : task.kind === "shell" ? "file-code" : "symbol-event");
    this.resourceUri = task.kind === "shell" ? task.scriptUri : task.kind === "deno" ? task.denoJsonUri : task.packageJsonUri;
    this.id = treeIdPrefix !== undefined ? `${treeIdPrefix}:${getTaskIdentity(task)}` : getTaskIdentity(task);
    this.command = {
      command: "taskingen.activateScript",
      title: "Activate Script",
      arguments: [this],
    };
  }
}

export type TaskTreeItem =
  | TaskGroupItem
  | PathFolderItem
  | NpmScopeItem
  | DenoScopeItem
  | NpmProjectItem
  | DenoProjectItem
  | ScriptGroupItem
  | TaskItem;

function iconForGroup(groupKind: TaskGroupKind): string {
  if (groupKind === "npm") {
    return "package";
  }

  if (groupKind === "deno") {
    return "symbol-misc";
  }

  if (groupKind === "shell") {
    return "terminal-bash";
  }

  if (groupKind === "favorites") {
    return "star-full";
  }

  if (groupKind === "running") {
    return "play-circle";
  }

  return "history";
}

function contextValueForGroup(groupKind: TaskGroupKind): string | undefined {
  if (groupKind === "history") {
    return "taskHistory";
  }

  if (groupKind === "favorites") {
    return "taskFavorites";
  }

  return undefined;
}

function contextValueForTask(task: RunnableTask): string {
  if (task.kind === "npm") {
    return "npmScript";
  }

  if (task.kind === "deno") {
    return "denoScript";
  }

  return "shellScript";
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

  if (task.kind === "deno") {
    const descriptionLine = task.description !== undefined ? `${task.description}\n` : "";
    return `${runningPrefix}${task.name}\n${descriptionLine}${task.command}\n${task.denoJsonUri.fsPath}`;
  }

  return `${runningPrefix}${task.scriptUri.fsPath}`;
}

function collapsibleStateForDepth(depth: number, defaultExpandedDepth: number): vscode.TreeItemCollapsibleState {
  return isTreeLevelExpanded(depth, defaultExpandedDepth)
    ? vscode.TreeItemCollapsibleState.Expanded
    : vscode.TreeItemCollapsibleState.Collapsed;
}

function resolvePathFolderUri(
  pathKey: string,
  children: readonly NpmProjectTreeNode[] | readonly DenoProjectTreeNode[] | readonly ShellTreeNode[],
): vscode.Uri {
  const posixKey = pathKey.replace(/\\/g, "/");
  const sampleFsPath = findSampleFsPathFromTree(children);

  if (sampleFsPath !== undefined) {
    const relative = workspaceRelativePath(sampleFsPath).replace(/\\/g, "/");
    if (relative === posixKey || relative.startsWith(`${posixKey}/`)) {
      const remainder = relative.slice(posixKey.length);
      const normalizedSample = sampleFsPath.replace(/\\/g, "/");
      if (remainder.length === 0) {
        return vscode.Uri.file(sampleFsPath);
      }

      if (normalizedSample.endsWith(remainder)) {
        return vscode.Uri.file(normalizedSample.slice(0, normalizedSample.length - remainder.length));
      }
    }
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (workspaceRoot === undefined) {
    return vscode.Uri.file(posixKey);
  }

  return vscode.Uri.joinPath(workspaceRoot, ...posixKey.split("/").filter((segment) => segment.length > 0));
}

function findSampleFsPathFromTree(
  nodes: readonly NpmProjectTreeNode[] | readonly DenoProjectTreeNode[] | readonly ShellTreeNode[],
): string | undefined {
  for (const node of nodes) {
    if (node.kind === "folder") {
      const nested = findSampleFsPathFromTree(node.children);
      if (nested !== undefined) {
        return nested;
      }
      continue;
    }

    if (node.kind === "scope") {
      const firstProject = node.projects[0]?.project.cwd;
      if (firstProject !== undefined) {
        return firstProject;
      }
      continue;
    }

    if (node.kind === "project") {
      return node.project.cwd;
    }

    return node.task.cwd;
  }

  return undefined;
}
