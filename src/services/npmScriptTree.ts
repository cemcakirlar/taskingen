import type { NpmScriptTask } from "./packageJsonScanner";

export interface ScriptGroupNode<T> {
  readonly kind: "group";
  readonly label: string;
  readonly children: readonly ScriptTreeNode<T>[];
}

export interface ScriptLeafNode<T> {
  readonly kind: "script";
  readonly label: string;
  readonly task: T;
}

export type ScriptTreeNode<T> = ScriptGroupNode<T> | ScriptLeafNode<T>;

export type NpmScriptGroupNode = ScriptGroupNode<NpmScriptTask>;
export type NpmScriptLeafNode = ScriptLeafNode<NpmScriptTask>;
export type NpmScriptTreeNode = ScriptTreeNode<NpmScriptTask>;

interface MutableGroupNode<T> {
  readonly kind: "group";
  readonly label: string;
  readonly children: MutableTreeNode<T>[];
}

interface MutableLeafNode<T> {
  readonly kind: "script";
  readonly label: string;
  readonly task: T;
}

type MutableTreeNode<T> = MutableGroupNode<T> | MutableLeafNode<T>;

export function buildNpmScriptTree(scripts: readonly NpmScriptTask[], separator: string, maxDepth: number): readonly NpmScriptTreeNode[] {
  return buildScriptTree(scripts, separator, maxDepth);
}

export function buildScriptTree<T extends { readonly name: string }>(
  scripts: readonly T[],
  separator: string,
  maxDepth: number,
): readonly ScriptTreeNode<T>[] {
  const root: MutableTreeNode<T>[] = [];
  const normalizedDepth = normalizeMaxDepth(maxDepth);
  const groupingEnabled = separator.length > 0 && normalizedDepth > 0;

  for (const task of scripts) {
    if (!groupingEnabled) {
      root.push({ kind: "script", label: task.name, task });
      continue;
    }

    const segments = task.name.split(separator);
    if (!canGroupSegments(segments, normalizedDepth)) {
      root.push({ kind: "script", label: task.name, task });
      continue;
    }

    const groupCount = Math.min(normalizedDepth, segments.length - 1);
    const groupSegments = segments.slice(0, groupCount);
    const leafLabel = segments.slice(groupCount).join(separator);
    insertGroupedScript(root, groupSegments, leafLabel, task);
  }

  return sortTreeNodes(root);
}

function normalizeMaxDepth(maxDepth: number): number {
  if (!Number.isFinite(maxDepth)) {
    return 0;
  }

  return Math.max(0, Math.min(10, Math.trunc(maxDepth)));
}

function canGroupSegments(segments: readonly string[], maxDepth: number): boolean {
  if (segments.length < 2 || maxDepth < 1) {
    return false;
  }

  return segments.every((segment) => segment.length > 0);
}

function insertGroupedScript<T>(nodes: MutableTreeNode<T>[], groupSegments: readonly string[], leafLabel: string, task: T): void {
  let currentLevel = nodes;

  for (const segment of groupSegments) {
    const existing = currentLevel.find((node): node is MutableGroupNode<T> => node.kind === "group" && node.label === segment);

    if (existing !== undefined) {
      currentLevel = existing.children;
      continue;
    }

    const created: MutableGroupNode<T> = {
      kind: "group",
      label: segment,
      children: [],
    };
    currentLevel.push(created);
    currentLevel = created.children;
  }

  currentLevel.push({ kind: "script", label: leafLabel, task });
}

function sortTreeNodes<T>(nodes: readonly MutableTreeNode<T>[]): ScriptTreeNode<T>[] {
  const groups = nodes
    .filter((node): node is MutableGroupNode<T> => node.kind === "group")
    .slice()
    .sort((left, right) => left.label.localeCompare(right.label))
    .map(
      (node): ScriptGroupNode<T> => ({
        kind: "group",
        label: node.label,
        children: sortTreeNodes(node.children),
      }),
    );

  const scripts = nodes
    .filter((node): node is MutableLeafNode<T> => node.kind === "script")
    .slice()
    .sort((left, right) => left.label.localeCompare(right.label));

  return [...groups, ...scripts];
}
