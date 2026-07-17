import type { NpmProject } from "./packageJsonScanner";

export interface ScopedPackageName {
  readonly scope: string;
  readonly packageName: string;
}

export interface NpmProjectLeafNode {
  readonly kind: "project";
  readonly project: NpmProject;
  readonly displayName: string;
}

export interface NpmScopeNode {
  readonly kind: "scope";
  readonly scope: string;
  readonly projects: readonly NpmProjectLeafNode[];
}

export type NpmProjectTreeNode = NpmScopeNode | NpmProjectLeafNode;

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
  groupByScope: boolean,
): readonly NpmProjectTreeNode[] {
  if (!groupByScope) {
    return projects
      .map(
        (project): NpmProjectLeafNode => ({
          kind: "project",
          project,
          displayName: project.name,
        }),
      )
      .sort((left, right) => compareByDisplayThenCwd(left, right));
  }

  const scopes = new Map<string, NpmProjectLeafNode[]>();
  const unscoped: NpmProjectLeafNode[] = [];

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

  const scopeNodes: NpmScopeNode[] = [...scopes.entries()]
    .map(([scope, scopedProjects]) => ({
      kind: "scope" as const,
      scope,
      projects: scopedProjects
        .slice()
        .sort((left, right) => compareByDisplayThenCwd(left, right)),
    }))
    .sort((left, right) => left.scope.localeCompare(right.scope));

  const unscopedNodes = unscoped
    .slice()
    .sort((left, right) => compareByDisplayThenCwd(left, right));

  return [...scopeNodes, ...unscopedNodes];
}

function compareByDisplayThenCwd(
  left: NpmProjectLeafNode,
  right: NpmProjectLeafNode,
): number {
  const displayOrder = left.displayName.localeCompare(right.displayName);
  if (displayOrder !== 0) {
    return displayOrder;
  }

  return left.project.cwd.localeCompare(right.project.cwd);
}
