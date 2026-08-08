import type { DenoProject } from "./denoJsonScanner";
import type { NpmProject } from "./packageJsonScanner";

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

export type ProjectTreeNode<T extends NamedProject> = ProjectScopeNode<T> | ProjectLeafNode<T>;

export type NpmProjectLeafNode = ProjectLeafNode<NpmProject>;
export type NpmScopeNode = ProjectScopeNode<NpmProject>;
export type NpmProjectTreeNode = ProjectTreeNode<NpmProject>;

export type DenoProjectLeafNode = ProjectLeafNode<DenoProject>;
export type DenoScopeNode = ProjectScopeNode<DenoProject>;
export type DenoProjectTreeNode = ProjectTreeNode<DenoProject>;

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

export function buildNpmProjectTree(projects: readonly NpmProject[], groupByScope: boolean): readonly NpmProjectTreeNode[] {
  return buildScopedProjectTree(projects, groupByScope);
}

export function buildDenoProjectTree(projects: readonly DenoProject[], groupByScope: boolean): readonly DenoProjectTreeNode[] {
  return buildScopedProjectTree(projects, groupByScope);
}

export function buildScopedProjectTree<T extends NamedProject>(
  projects: readonly T[],
  groupByScope: boolean,
): readonly ProjectTreeNode<T>[] {
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
