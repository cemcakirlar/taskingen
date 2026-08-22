import { buildFolderPathTree, parentPathForFolderGrouping, type PathTreeNode } from "./folderPathTree";
import type { DenoProject } from "./denoJsonScanner";
import type { NpmProject } from "./packageJsonScanner";
import type { ShellScriptTask } from "./shellScriptScanner";

export interface ScopedPackageName {
  readonly scope: string;
  readonly packageName: string;
}

export interface NamedProject {
  readonly name: string;
  readonly cwd: string;
}

export interface ProjectLeafNode<T extends NamedProject> {
  readonly kind: "project";
  readonly project: T;
  readonly displayName: string;
}

export interface ProjectScopeNode<T extends NamedProject> {
  readonly kind: "scope";
  readonly scope: string;
  readonly projects: readonly ProjectLeafNode<T>[];
}

export interface ProjectFolderNode<T extends NamedProject> {
  readonly kind: "folder";
  readonly label: string;
  readonly pathKey: string;
  readonly children: readonly ProjectTreeNode<T>[];
}

export type ProjectTreeNode<T extends NamedProject> = ProjectFolderNode<T> | ProjectScopeNode<T> | ProjectLeafNode<T>;

export type NpmProjectLeafNode = ProjectLeafNode<NpmProject>;
export type NpmScopeNode = ProjectScopeNode<NpmProject>;
export type NpmProjectFolderNode = ProjectFolderNode<NpmProject>;
export type NpmProjectTreeNode = ProjectTreeNode<NpmProject>;

export type DenoProjectLeafNode = ProjectLeafNode<DenoProject>;
export type DenoScopeNode = ProjectScopeNode<DenoProject>;
export type DenoProjectFolderNode = ProjectFolderNode<DenoProject>;
export type DenoProjectTreeNode = ProjectTreeNode<DenoProject>;

export interface ShellFolderNode {
  readonly kind: "folder";
  readonly label: string;
  readonly pathKey: string;
  readonly children: readonly ShellTreeNode[];
}

export interface ShellScriptLeafNode {
  readonly kind: "script";
  readonly task: ShellScriptTask;
}

export type ShellTreeNode = ShellFolderNode | ShellScriptLeafNode;

export function parseScopedPackageName(name: string): ScopedPackageName | undefined {
  if (!name.startsWith("@")) {
    return undefined;
  }

  const separatorIndex = name.indexOf("/");
  if (separatorIndex <= 1 || separatorIndex === name.length - 1) {
    return undefined;
  }

  if (name.indexOf("/", separatorIndex + 1) !== -1) {
    return undefined;
  }

  const scope = name.slice(0, separatorIndex);
  const packageName = name.slice(separatorIndex + 1);
  if (scope.length <= 1 || packageName.length === 0) {
    return undefined;
  }

  return { scope, packageName };
}

export function buildNpmProjectTree(
  projects: readonly NpmProject[],
  getRelativePath: (project: NpmProject) => string,
  folderMaxDepth: number,
  groupByScope: boolean,
): readonly NpmProjectTreeNode[] {
  return buildPathScopedProjectTree(projects, getRelativePath, folderMaxDepth, groupByScope);
}

export function buildDenoProjectTree(
  projects: readonly DenoProject[],
  getRelativePath: (project: DenoProject) => string,
  folderMaxDepth: number,
  groupByScope: boolean,
): readonly DenoProjectTreeNode[] {
  return buildPathScopedProjectTree(projects, getRelativePath, folderMaxDepth, groupByScope);
}

export function buildShellScriptTree(
  scripts: readonly ShellScriptTask[],
  getRelativeDir: (script: ShellScriptTask) => string,
  folderMaxDepth: number,
): readonly ShellTreeNode[] {
  const pathTree = buildFolderPathTree(scripts, getRelativeDir, folderMaxDepth);
  return mapShellPathTree(pathTree);
}

function buildPathScopedProjectTree<T extends NamedProject>(
  projects: readonly T[],
  getRelativePath: (project: T) => string,
  folderMaxDepth: number,
  groupByScope: boolean,
): readonly ProjectTreeNode<T>[] {
  const pathTree = buildFolderPathTree(projects, (project) => parentPathForFolderGrouping(getRelativePath(project)), folderMaxDepth);
  return mapProjectPathTree(pathTree, groupByScope);
}

function mapProjectPathTree<T extends NamedProject>(nodes: readonly PathTreeNode<T>[], groupByScope: boolean): ProjectTreeNode<T>[] {
  const folders = nodes
    .filter((node): node is Extract<PathTreeNode<T>, { kind: "folder" }> => node.kind === "folder")
    .map(
      (node): ProjectFolderNode<T> => ({
        kind: "folder",
        label: node.label,
        pathKey: node.pathKey,
        children: mapProjectPathTree(node.children, groupByScope),
      }),
    );

  const projects = nodes
    .filter((node): node is Extract<PathTreeNode<T>, { kind: "leaf" }> => node.kind === "leaf")
    .map((node) => node.item);

  const scoped = buildScopedProjectTree(projects, groupByScope);
  return [...folders, ...scoped];
}

function mapShellPathTree(nodes: readonly PathTreeNode<ShellScriptTask>[]): ShellTreeNode[] {
  const folders = nodes
    .filter((node): node is Extract<PathTreeNode<ShellScriptTask>, { kind: "folder" }> => node.kind === "folder")
    .map(
      (node): ShellFolderNode => ({
        kind: "folder",
        label: node.label,
        pathKey: node.pathKey,
        children: mapShellPathTree(node.children),
      }),
    );

  const scripts = nodes
    .filter((node): node is Extract<PathTreeNode<ShellScriptTask>, { kind: "leaf" }> => node.kind === "leaf")
    .map(
      (node): ShellScriptLeafNode => ({
        kind: "script",
        task: node.item,
      }),
    )
    .sort((left, right) => left.task.name.localeCompare(right.task.name));

  return [...folders, ...scripts];
}

export function buildScopedProjectTree<T extends NamedProject>(
  projects: readonly T[],
  groupByScope: boolean,
): readonly (ProjectScopeNode<T> | ProjectLeafNode<T>)[] {
  if (!groupByScope) {
    return projects
      .map(
        (project): ProjectLeafNode<T> => ({
          kind: "project",
          project,
          displayName: project.name,
        }),
      )
      .sort((left, right) => compareByDisplayThenCwd(left, right));
  }

  const scopes = new Map<string, ProjectLeafNode<T>[]>();
  const unscoped: ProjectLeafNode<T>[] = [];

  for (const project of projects) {
    const scoped = parseScopedPackageName(project.name);
    if (scoped === undefined) {
      unscoped.push({
        kind: "project",
        project,
        displayName: project.name,
      });
      continue;
    }

    const existing = scopes.get(scoped.scope) ?? [];
    existing.push({
      kind: "project",
      project,
      displayName: scoped.packageName,
    });
    scopes.set(scoped.scope, existing);
  }

  const scopeNodes: ProjectScopeNode<T>[] = [...scopes.entries()]
    .map(([scope, scopedProjects]) => ({
      kind: "scope" as const,
      scope,
      projects: scopedProjects.slice().sort((left, right) => compareByDisplayThenCwd(left, right)),
    }))
    .sort((left, right) => left.scope.localeCompare(right.scope));

  const unscopedNodes = unscoped.slice().sort((left, right) => compareByDisplayThenCwd(left, right));

  return [...scopeNodes, ...unscopedNodes];
}

function compareByDisplayThenCwd<T extends NamedProject>(left: ProjectLeafNode<T>, right: ProjectLeafNode<T>): number {
  const displayOrder = left.displayName.localeCompare(right.displayName);
  if (displayOrder !== 0) {
    return displayOrder;
  }

  return left.project.cwd.localeCompare(right.project.cwd);
}
