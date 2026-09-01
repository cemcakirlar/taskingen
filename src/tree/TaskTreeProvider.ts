import * as vscode from "vscode";
import {
  readDefaultExpandedDepth,
  readFavoritesSettings,
  readHideEmptyScriptRoots,
  readNpmProjectGroupingSettings,
  readNpmScriptGroupingSettings,
  readTaskHistorySettings,
} from "../services/settings";
import { scanDenoJsonProjects, type DenoProject } from "../services/denoJsonScanner";
import type { FavoritesStore } from "../services/favorites";
import {
  buildDenoProjectTree,
  buildNpmProjectTree,
  buildShellScriptTree,
  type DenoProjectTreeNode,
  type NpmProjectTreeNode,
  type ShellTreeNode,
} from "../services/npmProjectTree";
import { buildScriptTree, type ScriptTreeNode } from "../services/npmScriptTree";
import { scanPackageJsonProjects, type NpmProject } from "../services/packageJsonScanner";
import type { RunningTaskRegistry } from "../services/runningTaskRegistry";
import type { TaskHistoryStore } from "../services/taskHistory";
import { getTaskShortLabel } from "../services/taskIdentity";
import { scanShellScripts, type ShellScriptTask } from "../services/shellScriptScanner";
import type { RunnableTask } from "../services/runner";
import { workspaceRelativePath } from "../services/workspacePath";
import {
  DenoProjectItem,
  DenoScopeItem,
  NpmProjectItem,
  NpmScopeItem,
  PathFolderItem,
  ScriptGroupItem,
  TaskGroupItem,
  TaskItem,
  type TaskTreeItem,
} from "./TaskItem";

export interface TaskCounts {
  readonly npm: number;
  readonly deno: number;
  readonly shell: number;
  readonly history: number;
  readonly favorites: number;
}

export class TaskTreeProvider implements vscode.TreeDataProvider<TaskTreeItem>, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<TaskTreeItem | undefined>();
  private npmProjects: readonly NpmProject[] = [];
  private denoProjects: readonly DenoProject[] = [];
  private shellScripts: readonly ShellScriptTask[] = [];
  private refreshGeneration = 0;

  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(
    private readonly outputChannel: vscode.OutputChannel,
    private readonly runningRegistry: RunningTaskRegistry,
    private readonly taskHistory: TaskHistoryStore,
    private readonly favorites: FavoritesStore,
  ) {}

  public getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: TaskTreeItem): TaskTreeItem[] {
    const defaultExpandedDepth = readDefaultExpandedDepth();

    if (element instanceof TaskGroupItem) {
      if (element.groupKind === "favorites") {
        return this.getFavoriteItems();
      }

      if (element.groupKind === "history") {
        return this.getHistoryItems();
      }

      if (element.groupKind === "npm") {
        const settings = readNpmProjectGroupingSettings();
        const nodes = buildNpmProjectTree(
          this.npmProjects,
          (project) => workspaceRelativePath(project.cwd),
          settings.folderMaxDepth,
          settings.groupByScope,
        );
        return mapNpmProjectTreeNodes(nodes, element.depth + 1, defaultExpandedDepth);
      }

      if (element.groupKind === "deno") {
        const settings = readNpmProjectGroupingSettings();
        const nodes = buildDenoProjectTree(
          this.denoProjects,
          (project) => workspaceRelativePath(project.cwd),
          settings.folderMaxDepth,
          settings.groupByScope,
        );
        return mapDenoProjectTreeNodes(nodes, element.depth + 1, defaultExpandedDepth);
      }

      const settings = readNpmProjectGroupingSettings();
      const nodes = buildShellScriptTree(this.shellScripts, (script) => workspaceRelativePath(script.cwd), settings.folderMaxDepth);
      return mapShellTreeNodes(nodes, element.depth + 1, defaultExpandedDepth, this.createTaskItem);
    }

    if (element instanceof PathFolderItem) {
      if (element.folderKind === "npm") {
        return mapNpmProjectTreeNodes(
          element.children as readonly NpmProjectTreeNode[],
          element.depth + 1,
          defaultExpandedDepth,
          element.pathKey,
        );
      }

      if (element.folderKind === "deno") {
        return mapDenoProjectTreeNodes(
          element.children as readonly DenoProjectTreeNode[],
          element.depth + 1,
          defaultExpandedDepth,
          element.pathKey,
        );
      }

      return mapShellTreeNodes(element.children as readonly ShellTreeNode[], element.depth + 1, defaultExpandedDepth, this.createTaskItem);
    }

    if (element instanceof NpmScopeItem) {
      return element.projects.map((node) => new NpmProjectItem(node.project, node.displayName, element.depth + 1, defaultExpandedDepth));
    }

    if (element instanceof DenoScopeItem) {
      return element.projects.map((node) => new DenoProjectItem(node.project, node.displayName, element.depth + 1, defaultExpandedDepth));
    }

    if (element instanceof NpmProjectItem) {
      const settings = readNpmScriptGroupingSettings();
      const nodes = buildScriptTree(element.project.scripts, settings.separator, settings.maxDepth);
      return mapScriptTreeNodes(
        nodes,
        element.depth + 1,
        defaultExpandedDepth,
        element.project.packageJsonUri.toString(),
        vscode.Uri.file(element.project.cwd),
        this.createTaskItem,
      );
    }

    if (element instanceof DenoProjectItem) {
      const settings = readNpmScriptGroupingSettings();
      const nodes = buildScriptTree(element.project.tasks, settings.separator, settings.maxDepth);
      return mapScriptTreeNodes(
        nodes,
        element.depth + 1,
        defaultExpandedDepth,
        element.project.denoJsonUri.toString(),
        vscode.Uri.file(element.project.cwd),
        this.createTaskItem,
      );
    }

    if (element instanceof ScriptGroupItem) {
      return mapScriptTreeNodes(
        element.children,
        element.depth + 1,
        defaultExpandedDepth,
        element.identityPath,
        element.folderUri,
        this.createTaskItem,
      );
    }

    if (element !== undefined) {
      return [];
    }

    const npmScriptCount = this.npmProjects.reduce((total, project) => total + project.scripts.length, 0);
    const denoTaskCount = this.denoProjects.reduce((total, project) => total + project.tasks.length, 0);
    const favoritesCount = this.getFavoriteTasks().length;
    const historyCount = this.getHistoryTasks().length;
    const favoritesSettings = readFavoritesSettings();
    const historySettings = readTaskHistorySettings();
    const hideEmptyScriptRoots = readHideEmptyScriptRoots();
    const roots: TaskTreeItem[] = [];

    if (favoritesSettings.enabled && favoritesCount > 0) {
      roots.push(new TaskGroupItem("favorites", "Favorites", describeCount(favoritesCount), 0, defaultExpandedDepth));
    }

    if (historySettings.enabled && historyCount > 0) {
      roots.push(new TaskGroupItem("history", "Task History", describeCount(historyCount), 0, defaultExpandedDepth));
    }

    if (!hideEmptyScriptRoots || npmScriptCount > 0) {
      roots.push(new TaskGroupItem("npm", "npm Scripts", describeCount(npmScriptCount), 0, defaultExpandedDepth));
    }

    if (!hideEmptyScriptRoots || denoTaskCount > 0) {
      roots.push(new TaskGroupItem("deno", "Deno Tasks", describeCount(denoTaskCount), 0, defaultExpandedDepth));
    }

    if (!hideEmptyScriptRoots || this.shellScripts.length > 0) {
      roots.push(new TaskGroupItem("shell", "Shell Scripts", describeCount(this.shellScripts.length), 0, defaultExpandedDepth));
    }

    return roots;
  }

  public async refresh(): Promise<TaskCounts> {
    const generation = ++this.refreshGeneration;
    const [npmProjects, denoProjects, shellScripts] = await Promise.all([
      scanPackageJsonProjects(this.outputChannel),
      scanDenoJsonProjects(this.outputChannel),
      scanShellScripts(),
    ]);

    if (generation !== this.refreshGeneration) {
      return this.getCounts();
    }

    this.npmProjects = npmProjects;
    this.denoProjects = denoProjects;
    this.shellScripts = shellScripts;
    this.changeEmitter.fire(undefined);

    return this.getCounts();
  }

  public refreshRunning(): void {
    this.changeEmitter.fire(undefined);
  }

  public refreshHistory(): void {
    this.changeEmitter.fire(undefined);
  }

  public refreshFavorites(): void {
    this.changeEmitter.fire(undefined);
  }

  public getCounts(): TaskCounts {
    return {
      npm: this.npmProjects.reduce((total, project) => total + project.scripts.length, 0),
      deno: this.denoProjects.reduce((total, project) => total + project.tasks.length, 0),
      shell: this.shellScripts.length,
      history: this.getHistoryTasks().length,
      favorites: this.getFavoriteTasks().length,
    };
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }

  private readonly createTaskItem = (
    task: RunnableTask,
    displayLabel: string,
    options: { readonly treeIdPrefix?: string; readonly isHistoryItem?: boolean } = {},
  ): TaskItem => {
    return new TaskItem(
      task,
      displayLabel,
      this.runningRegistry.isRunning(task),
      options.treeIdPrefix,
      this.favorites.isFavorite(task),
      options.isHistoryItem === true,
    );
  };

  private getFavoriteTasks() {
    return this.favorites.resolveFavoriteTasks(this.npmProjects, this.denoProjects, this.shellScripts);
  }

  private getHistoryTasks() {
    return this.taskHistory.resolveRecentTasks(this.npmProjects, this.denoProjects, this.shellScripts);
  }

  private getFavoriteItems(): TaskItem[] {
    return this.getFavoriteTasks().map((task) => this.createTaskItem(task, getTaskShortLabel(task), { treeIdPrefix: "favorites" }));
  }

  private getHistoryItems(): TaskItem[] {
    return this.getHistoryTasks().map((task) =>
      this.createTaskItem(task, getTaskShortLabel(task), { treeIdPrefix: "history", isHistoryItem: true }),
    );
  }
}

type CreateTaskItem = (task: RunnableTask, displayLabel: string) => TaskItem;

function mapNpmProjectTreeNodes(
  nodes: readonly NpmProjectTreeNode[],
  depth: number,
  defaultExpandedDepth: number,
  identityPath: string = "",
): TaskTreeItem[] {
  return nodes.map((node) => {
    if (node.kind === "folder") {
      return new PathFolderItem("npm", node.label, node.pathKey, node.children, depth, defaultExpandedDepth);
    }

    if (node.kind === "scope") {
      return new NpmScopeItem(node.scope, node.projects, depth, defaultExpandedDepth, identityPath);
    }

    return new NpmProjectItem(node.project, node.displayName, depth, defaultExpandedDepth);
  });
}

function mapDenoProjectTreeNodes(
  nodes: readonly DenoProjectTreeNode[],
  depth: number,
  defaultExpandedDepth: number,
  identityPath: string = "",
): TaskTreeItem[] {
  return nodes.map((node) => {
    if (node.kind === "folder") {
      return new PathFolderItem("deno", node.label, node.pathKey, node.children, depth, defaultExpandedDepth);
    }

    if (node.kind === "scope") {
      return new DenoScopeItem(node.scope, node.projects, depth, defaultExpandedDepth, identityPath);
    }

    return new DenoProjectItem(node.project, node.displayName, depth, defaultExpandedDepth);
  });
}

function mapShellTreeNodes(
  nodes: readonly ShellTreeNode[],
  depth: number,
  defaultExpandedDepth: number,
  createTaskItem: CreateTaskItem,
): TaskTreeItem[] {
  return nodes.map((node) => {
    if (node.kind === "folder") {
      return new PathFolderItem("shell", node.label, node.pathKey, node.children, depth, defaultExpandedDepth);
    }

    return createTaskItem(node.task, node.task.name);
  });
}

function mapScriptTreeNodes(
  nodes: readonly ScriptTreeNode<RunnableTask>[],
  depth: number,
  defaultExpandedDepth: number,
  identityPrefix: string,
  projectFolderUri: vscode.Uri,
  createTaskItem: CreateTaskItem,
): TaskTreeItem[] {
  return nodes.map((node) => {
    if (node.kind === "group") {
      const identityPath = `${identityPrefix}/${node.label}`;
      return new ScriptGroupItem(
        node.label,
        node.children,
        depth,
        defaultExpandedDepth,
        identityPath,
        vscode.Uri.joinPath(projectFolderUri, node.label),
      );
    }

    return createTaskItem(node.task, node.label);
  });
}

function describeCount(count: number): string {
  return count === 0 ? "No scripts found" : `${count}`;
}
