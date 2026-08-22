export interface PathFolderNode<TLeaf> {
  readonly kind: "folder";
  readonly label: string;
  readonly pathKey: string;
  readonly children: readonly PathTreeNode<TLeaf>[];
}

export interface PathLeafNode<TLeaf> {
  readonly kind: "leaf";
  readonly item: TLeaf;
}

export type PathTreeNode<TLeaf> = PathFolderNode<TLeaf> | PathLeafNode<TLeaf>;

interface MutableFolderNode<TLeaf> {
  readonly kind: "folder";
  readonly label: string;
  readonly pathKey: string;
  readonly children: MutableTreeNode<TLeaf>[];
}

interface MutableLeafNode<TLeaf> {
  readonly kind: "leaf";
  readonly item: TLeaf;
}

type MutableTreeNode<TLeaf> = MutableFolderNode<TLeaf> | MutableLeafNode<TLeaf>;

/**
 * Nest items under folder nodes from a workspace-relative path.
 * Depth clamps to 0…10. With depth N, the last N path segments become folders
 * (nearest folders to the item, walking up toward the workspace root);
 * the item remains a leaf (never absorbed into a path segment label).
 * pathKey always keeps the full workspace-relative prefix for URI resolution.
 */
export function buildFolderPathTree<TLeaf>(
  items: readonly TLeaf[],
  getRelativePath: (item: TLeaf) => string,
  maxDepth: number,
): readonly PathTreeNode<TLeaf>[] {
  const root: MutableTreeNode<TLeaf>[] = [];
  const normalizedDepth = normalizeFolderMaxDepth(maxDepth);

  for (const item of items) {
    const segments = pathSegments(getRelativePath(item));
    const groupCount = Math.min(normalizedDepth, segments.length);

    if (groupCount === 0) {
      root.push({ kind: "leaf", item });
      continue;
    }

    insertIntoFolders(root, segments, segments.length - groupCount, groupCount, item);
  }

  return freezeTree(root);
}

export function normalizeFolderMaxDepth(maxDepth: number): number {
  if (!Number.isFinite(maxDepth)) {
    return 0;
  }

  return Math.max(0, Math.min(10, Math.trunc(maxDepth)));
}

export function pathSegments(relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (normalized.length === 0 || normalized === ".") {
    return [];
  }

  return normalized.split("/").filter((segment) => segment.length > 0 && segment !== ".");
}

/**
 * Parent workspace-relative path used for project folder nesting.
 * Drops the project directory itself so root-level packages stay siblings
 * (needed for group-by-scope) and are not wrapped in a same-named folder.
 */
export function parentPathForFolderGrouping(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (normalized.length === 0 || normalized === ".") {
    return ".";
  }

  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash === -1) {
    return ".";
  }

  return normalized.slice(0, lastSlash);
}

function insertIntoFolders<TLeaf>(
  nodes: MutableTreeNode<TLeaf>[],
  allSegments: readonly string[],
  start: number,
  groupCount: number,
  item: TLeaf,
): void {
  let currentLevel = nodes;
  let pathKey = allSegments.slice(0, start).join("/");

  for (let index = 0; index < groupCount; index += 1) {
    const segment = allSegments[start + index];
    if (segment === undefined) {
      break;
    }

    pathKey = pathKey.length === 0 ? segment : `${pathKey}/${segment}`;
    const existing = currentLevel.find((node): node is MutableFolderNode<TLeaf> => node.kind === "folder" && node.pathKey === pathKey);

    if (existing !== undefined) {
      currentLevel = existing.children;
      continue;
    }

    const created: MutableFolderNode<TLeaf> = {
      kind: "folder",
      label: segment,
      pathKey,
      children: [],
    };
    currentLevel.push(created);
    currentLevel = created.children;
  }

  currentLevel.push({ kind: "leaf", item });
}

function freezeTree<TLeaf>(nodes: readonly MutableTreeNode<TLeaf>[]): PathTreeNode<TLeaf>[] {
  const folders = nodes
    .filter((node): node is MutableFolderNode<TLeaf> => node.kind === "folder")
    .slice()
    .sort((left, right) => left.label.localeCompare(right.label))
    .map(
      (node): PathFolderNode<TLeaf> => ({
        kind: "folder",
        label: node.label,
        pathKey: node.pathKey,
        children: freezeTree(node.children),
      }),
    );

  const leaves = nodes.filter((node): node is MutableLeafNode<TLeaf> => node.kind === "leaf");

  return [...folders, ...leaves];
}
