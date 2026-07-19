import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNpmScriptTree } from "../../src/services/npmScriptTree";
import type { NpmScriptTask } from "../../src/services/packageJsonScanner";

function script(name: string): NpmScriptTask {
  return {
    kind: "npm",
    name,
    command: `echo ${name}`,
    packageJsonUri: { toString: () => "file:///pkg/package.json", fsPath: "/pkg/package.json" } as NpmScriptTask["packageJsonUri"],
    cwd: "/pkg",
  };
}

describe("buildNpmScriptTree", () => {
  it("returns flat leaves when grouping is disabled", () => {
    const tree = buildNpmScriptTree([script("a:b"), script("c")], ":", 0);
    assert.deepEqual(
      tree.map((node) => ({ kind: node.kind, label: node.kind === "script" ? node.label : node.label })),
      [
        { kind: "script", label: "a:b" },
        { kind: "script", label: "c" },
      ],
    );
  });

  it("groups by separator up to maxDepth", () => {
    const tree = buildNpmScriptTree([script("test:unit:foo"), script("test:e2e")], ":", 1);
    assert.equal(tree.length, 1);
    assert.equal(tree[0]?.kind, "group");
    if (tree[0]?.kind !== "group") {
      return;
    }

    assert.equal(tree[0].label, "test");
    assert.deepEqual(
      tree[0].children.map((child) => (child.kind === "script" ? child.label : child.label)),
      ["e2e", "unit:foo"],
    );
  });
});
