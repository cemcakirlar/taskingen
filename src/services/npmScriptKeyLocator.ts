import { findNodeAtLocation, parseTree, type Node } from "jsonc-parser";

export interface TextOffsetRange {
  readonly offset: number;
  readonly length: number;
}

export function findNpmScriptKeyRange(
  content: string,
  scriptName: string,
): TextOffsetRange | undefined {
  const root = parseTree(content);
  if (root === undefined) {
    return undefined;
  }

  const valueNode = findNodeAtLocation(root, ["scripts", scriptName]);
  const keyNode = getPropertyKeyNode(valueNode);
  if (keyNode === undefined || keyNode.length <= 0) {
    return undefined;
  }

  return {
    offset: keyNode.offset,
    length: keyNode.length,
  };
}

function getPropertyKeyNode(valueNode: Node | undefined): Node | undefined {
  const propertyNode = valueNode?.parent;
  if (propertyNode?.type !== "property" || propertyNode.children === undefined) {
    return undefined;
  }

  const keyNode = propertyNode.children[0];
  return keyNode?.type === "string" ? keyNode : undefined;
}
