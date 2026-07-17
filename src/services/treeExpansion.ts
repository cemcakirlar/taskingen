export function normalizeDefaultExpandedDepth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.min(10, Math.trunc(value)));
}

export function isTreeLevelExpanded(
  nodeDepth: number,
  defaultExpandedDepth: number,
): boolean {
  const normalizedDepth = normalizeDefaultExpandedDepth(defaultExpandedDepth);
  return nodeDepth < normalizedDepth;
}
