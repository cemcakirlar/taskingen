import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNpmProjectTree, parseScopedPackageName } from "../../src/services/npmProjectTree";
import type { NpmProject } from "../../src/services/packageJsonScanner";

function project(name: string, cwd: string): NpmProject {
  return {
    name,
    cwd,
    packageJsonUri: { toString: () => `file://${cwd}/package.json`, fsPath: `${cwd}/package.json` } as NpmProject["packageJsonUri"],
    scripts: [],
  };
}

describe("parseScopedPackageName", () => {
  it("parses valid scoped names", () => {
    assert.deepEqual(parseScopedPackageName("@scope/pkg"), { scope: "@scope", packageName: "pkg" });
  });

  it("rejects invalid scoped names", () => {
    assert.equal(parseScopedPackageName("pkg"), undefined);
    assert.equal(parseScopedPackageName("@/pkg"), undefined);
    assert.equal(parseScopedPackageName("@scope/"), undefined);
    assert.equal(parseScopedPackageName("@scope/a/b"), undefined);
  });
});

describe("buildNpmProjectTree", () => {
  it("groups scoped packages when enabled", () => {
    const tree = buildNpmProjectTree(
      [project("@acme/one", "/one"), project("@acme/two", "/two"), project("solo", "/solo")],
      true,
    );

    assert.equal(tree[0]?.kind, "scope");
    if (tree[0]?.kind !== "scope") {
      return;
    }

    assert.equal(tree[0].scope, "@acme");
    assert.deepEqual(
      tree[0].projects.map((leaf) => leaf.displayName),
      ["one", "two"],
    );
    assert.equal(tree[1]?.kind, "project");
  });

  it("keeps a flat list when grouping is disabled", () => {
    const tree = buildNpmProjectTree([project("@acme/one", "/one"), project("solo", "/solo")], false);
    assert.deepEqual(
      tree.map((node) => (node.kind === "project" ? node.displayName : node.scope)),
      ["@acme/one", "solo"],
    );
  });
});
