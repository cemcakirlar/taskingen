import * as vscode from "vscode";
import {
  readDefaultExpandedDepth,
  readNpmProjectGroupingSettings,
  readNpmScriptGroupingSettings,
  readScriptClickAction,
  type ScriptClickAction,
} from "../services/groupingSettings";
import {
  buildNpmProjectTree,
  type NpmProjectTreeNode,
} from "../services/npmProjectTree";
import {
  buildNpmScriptTree,
  type NpmScriptTreeNode,
} from "../services/npmScriptTree";
import {
  scanPackageJsonProjects,
  type NpmProject,
} from "../services/packageJsonScanner";
import type { RunningTaskRegistry } from "../services/runningTaskRegistry";
import {
  scanShellScripts,
  type ShellScriptTask,
} from "../services/shellScriptScanner";
import {
  NpmProjectItem,
  NpmScopeItem,
  NpmScriptGroupItem,
  RunningTaskItem,
  TaskGroupItem,
  TaskItem,
  type TaskTreeItem,
} from "./TaskItem";

export interface TaskCounts {
  readonly npm: number;
  readonly shell: number;
  readonly running: number;
}

export class TaskTreeProvider
  implements vscode.TreeDataProvider<TaskTreeItem>, vscode.Disposable
{
  private readonly changeEmitter = new vscode.EventEmitter<TaskTreeItem | undefined>();
  private npmProjects: readonly NpmProject[] = [];
  private shellScripts: readonly ShellScriptTask[] = [];

  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(
    private readonly outputChannel: vscode.OutputChannel,
    private readonly runningRegistry: RunningTaskRegistry,
  ) {}

  public getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: TaskTreeItem): TaskTreeItem[] {
    const clickAction = readScriptClickAction();
    const defaultExpandedDepth = readDefaultExpandedDepth();

    if (element instanceof TaskGroupItem) {
      if (element.groupKind === "running") {
        return this.runningRegistry.getAll().map((entry) => new RunningTaskItem(entry));
      }

      if (element.groupKind === "npm") {
        const settings = readNpmProjectGroupingSettings();
        const nodes = buildNpmProjectTree(this.npmProjects, settings.groupByScope);
        return mapProjectTreeNodes(nodes, element.depth + 1, defaultExpandedDepth);
      }

      return this.shellScripts.map(
        (task) =>
          new TaskItem(
            task,
            task.name,
            clickAction,
            this.runningRegistry.isRunning(task),
          ),
      );
    }

    if (element instanceof NpmScopeItem) {
      return element.projects.map(
        (node) =>
          new NpmProjectItem(
            node.project,
            node.displayName,
            element.depth + 1,
            defaultExpandedDepth,
          ),
      );
    }

    if (element instanceof NpmProjectItem) {
      const settings = readNpmScriptGroupingSettings();
      const nodes = buildNpmScriptTree(
        element.project.scripts,
        settings.separator,
        settings.maxDepth,
      );
      return mapScriptTreeNodes(
        nodes,
        clickAction,
        element.depth + 1,
        defaultExpandedDepth,
        element.project.packageJsonUri.toString(),
        vscode.Uri.file(element.project.cwd),
        this.runningRegistry,
      );
    }

    if (element instanceof NpmScriptGroupItem) {
      return mapScriptTreeNodes(
        element.children,
        clickAction,
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

    const npmScriptCount = this.npmProjects.reduce(
      (total, project) => total + project.scripts.length,
      0,
    );
    const runningCount = this.runningRegistry.getAll().length;
    const roots: TaskTreeItem[] = [];

    if (runningCount > 0) {
      roots.push(
        new TaskGroupItem(
          "running",
          "Running",
          describeCount(runningCount),
          0,
          defaultExpandedDepth,
        ),
      );
    }

    roots.push(
      new TaskGroupItem(
        "npm",
        "npm Scripts",
        describeCount(npmScriptCount),
        0,
        defaultExpandedDepth,
      ),
      new TaskGroupItem(
        "shell",
        "Shell Scripts",
        describeCount(this.shellScripts.length),
        0,
        defaultExpandedDepth,
      ),
    );

    return roots;
  }

  public async refresh(): Promise<TaskCounts> {
    const [npmProjects, shellScripts] = await Promise.all([
      scanPackageJsonProjects(this.outputChannel),
      scanShellScripts(),
    ]);

    this.npmProjects = npmProjects;
    this.shellScripts = shellScripts;
    this.changeEmitter.fire(undefined);

    return this.getCounts();
  }

  public refreshRunning(): void {
    this.changeEmitter.fire(undefined);
  }

  public getCounts(): TaskCounts {
    return {
      npm: this.npmProjects.reduce((total, project) => total + project.scripts.length, 0),
      shell: this.shellScripts.length,
      running: this.runningRegistry.getAll().length,
    };
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }
}

function mapProjectTreeNodes(
  nodes: readonly NpmProjectTreeNode[],
  depth: number,
  defaultExpandedDepth: number,
): TaskTreeItem[] {
  return nodes.map((node) => {
    if (node.kind === "scope") {
      return new NpmScopeItem(node.scope, node.projects, depth, defaultExpandedDepth);
    }

    return new NpmProjectItem(
      node.project,
      node.displayName,
      depth,
      defaultExpandedDepth,
    );
  });
}

function mapScriptTreeNodes(
  nodes: readonly NpmScriptTreeNode[],
  clickAction: ScriptClickAction,
  depth: number,
  defaultExpandedDepth: number,
  identityPrefix: string,
  projectFolderUri: vscode.Uri,
  runningRegistry: RunningTaskRegistry,
): TaskTreeItem[] {
  return nodes.map((node) => {
    if (node.kind === "group") {
      const identityPath = `${identityPrefix}/${node.label}`;
      return new NpmScriptGroupItem(
        node.label,
        node.children,
        depth,
        defaultExpandedDepth,
        identityPath,
        vscode.Uri.joinPath(projectFolderUri, node.label),
      );
    }

    return new TaskItem(
      node.task,
      node.label,
      clickAction,
      runningRegistry.isRunning(node.task),
    );
  });
}

function describeCount(count: number): string {
  return count === 0 ? "No scripts found" : `${count}`;
}
