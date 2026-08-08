import * as vscode from "vscode";
import {
  readDefaultExpandedDepth,
  readNpmProjectGroupingSettings,
  readNpmScriptGroupingSettings,
  readTaskHistorySettings,
} from "../services/settings";
import { scanDenoJsonProjects, type DenoProject } from "../services/denoJsonScanner";
import { buildDenoProjectTree, buildNpmProjectTree, type DenoProjectTreeNode, type NpmProjectTreeNode } from "../services/npmProjectTree";
import { buildScriptTree, type ScriptTreeNode } from "../services/npmScriptTree";
import { scanPackageJsonProjects, type NpmProject } from "../services/packageJsonScanner";
import type { RunningTaskRegistry } from "../services/runningTaskRegistry";
import type { TaskHistoryStore } from "../services/taskHistory";
import { getTaskShortLabel } from "../services/taskIdentity";
import { scanShellScripts, type ShellScriptTask } from "../services/shellScriptScanner";
import type { RunnableTask } from "../services/runner";
import {
  DenoProjectItem,
  DenoScopeItem,
  NpmProjectItem,
  NpmScopeItem,
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
  ) {}

  public getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: TaskTreeItem): TaskTreeItem[] {
    const defaultExpandedDepth = readDefaultExpandedDepth();

    if (element instanceof TaskGroupItem) {
      if (element.groupKind === "history") {
        return this.getHistoryItems();
      }

      if (element.groupKind === "npm") {
        const settings = readNpmProjectGroupingSettings();
        const nodes = buildNpmProjectTree(this.npmProjects, settings.groupByScope);
        return mapNpmProjectTreeNodes(nodes, element.depth + 1, defaultExpandedDepth);
      }

      if (element.groupKind === "deno") {
        const settings = readNpmProjectGroupingSettings();
        const nodes = buildDenoProjectTree(this.denoProjects, settings.groupByScope);
        return mapDenoProjectTreeNodes(nodes, element.depth + 1, defaultExpandedDepth);
      }

      return this.shellScripts.map((task) => new TaskItem(task, task.name, this.runningRegistry.isRunning(task)));
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
        this.runningRegistry,
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
        this.runningRegistry,
      );
    }

    if (element instanceof ScriptGroupItem) {
      return mapScriptTreeNodes(
        element.children,
        element.depth + 1,
        defaultExpandedDepth,
        element.identityPath,
        element.folderUri,
        this.runningRegistry,
      );
    }

    if (element !== undefined) {
      return [];
    }

    const npmScriptCount = this.npmProjects.reduce((total, project) => total + project.scripts.length, 0);
    const denoTaskCount = this.denoProjects.reduce((total, project) => total + project.tasks.length, 0);
    const historyCount = this.getHistoryTasks().length;
    const historySettings = readTaskHistorySettings();
    const roots: TaskTreeItem[] = [];

    if (historySettings.enabled && historyCount > 0) {
      roots.push(new TaskGroupItem("history", "Task History", describeCount(historyCount), 0, defaultExpandedDepth));
    }

    roots.push(
      new TaskGroupItem("npm", "npm Scripts", describeCount(npmScriptCount), 0, defaultExpandedDepth),
      new TaskGroupItem("deno", "Deno Tasks", describeCount(denoTaskCount), 0, defaultExpandedDepth),
      new TaskGroupItem("shell", "Shell Scripts", describeCount(this.shellScripts.length), 0, defaultExpandedDepth),
    );

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

  public getCounts(): TaskCounts {
    return {
      npm: this.npmProjects.reduce((total, project) => total + project.scripts.length, 0),
      deno: this.denoProjects.reduce((total, project) => total + project.tasks.length, 0),
      shell: this.shellScripts.length,
      history: this.getHistoryTasks().length,
    };
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }

  private getHistoryTasks() {
    return this.taskHistory.resolveRecentTasks(this.npmProjects, this.denoProjects, this.shellScripts);
  }

  private getHistoryItems(): TaskItem[] {
    return this.getHistoryTasks().map(
      (task) => new TaskItem(task, getTaskShortLabel(task), this.runningRegistry.isRunning(task), "history"),
    );
  }
}

function mapNpmProjectTreeNodes(nodes: readonly NpmProjectTreeNode[], depth: number, defaultExpandedDepth: number): TaskTreeItem[] {
  return nodes.map((node) => {
    if (node.kind === "scope") {
      return new NpmScopeItem(node.scope, node.projects, depth, defaultExpandedDepth);
    }

    return new NpmProjectItem(node.project, node.displayName, depth, defaultExpandedDepth);
  });
}

function mapDenoProjectTreeNodes(nodes: readonly DenoProjectTreeNode[], depth: number, defaultExpandedDepth: number): TaskTreeItem[] {
  return nodes.map((node) => {
    if (node.kind === "scope") {
      return new DenoScopeItem(node.scope, node.projects, depth, defaultExpandedDepth);
    }

    return new DenoProjectItem(node.project, node.displayName, depth, defaultExpandedDepth);
  });
}

function mapScriptTreeNodes(
  nodes: readonly ScriptTreeNode<RunnableTask>[],
  depth: number,
  defaultExpandedDepth: number,
  identityPrefix: string,
  projectFolderUri: vscode.Uri,
  runningRegistry: RunningTaskRegistry,
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

    return new TaskItem(node.task, node.label, runningRegistry.isRunning(node.task));
  });
}

function describeCount(count: number): string {
  return count === 0 ? "No scripts found" : `${count}`;
}
