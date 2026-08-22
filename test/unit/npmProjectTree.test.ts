import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNpmProjectTree, buildShellScriptTree, parseScopedPackageName } from "../../src/services/npmProjectTree";
import type { NpmProject } from "../../src/services/packageJsonScanner";
import type { ShellScriptTask } from "../../src/services/shellScriptScanner";

function project(name: string, cwd: string, relativePath: string = cwd.replace(/^\//, "")): NpmProject & { relativePath: string } {
  return {
    name,
    cwd,
    relativePath,
    packageJsonUri: { toString: () => `file://${cwd}/package.json`, fsPath: `${cwd}/package.json` } as NpmProject["packageJsonUri"],
    scripts: [],
  };
}

function shellScript(name: string, relativeDir: string): ShellScriptTask & { relativeDir: string } {
  const cwd = relativeDir.length === 0 || relativeDir === "." ? "/ws" : `/ws/${relativeDir}`;
  return {
    kind: "shell",
    name,
    relativeDir,
    cwd,
    scriptUri: { toString: () => `file://${cwd}/${name}`, fsPath: `${cwd}/${name}` } as ShellScriptTask["scriptUri"],
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
  it("groups scoped packages when enabled with no folder nesting", () => {
    const tree = buildNpmProjectTree(
      [project("@acme/one", "/one", "."), project("@acme/two", "/two", "."), project("solo", "/solo", ".")],
      (item) => (item as NpmProject & { relativePath: string }).relativePath,
      0,
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

  it("keeps a flat list when grouping and folder depth are disabled", () => {
    const tree = buildNpmProjectTree(
      [project("@acme/one", "/one", "."), project("solo", "/solo", ".")],
      (item) => (item as NpmProject & { relativePath: string }).relativePath,
      0,
      false,
    );
    assert.deepEqual(
      tree.map((node) => (node.kind === "project" ? node.displayName : node.kind === "scope" ? node.scope : node.label)),
      ["@acme/one", "solo"],
    );
  });

  it("nests projects under path folders then applies scope grouping", () => {
    const tree = buildNpmProjectTree(
      [
        project("@acme/web", "/ws/apps/web", "apps/web"),
        project("@acme/api", "/ws/apps/api", "apps/api"),
        project("ui", "/ws/packages/ui", "packages/ui"),
      ],
      (item) => (item as NpmProject & { relativePath: string }).relativePath,
      1,
      true,
    );

    assert.equal(tree[0]?.kind, "folder");
    assert.equal(tree[1]?.kind, "folder");
    if (tree[0]?.kind !== "folder" || tree[1]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].label, "apps");
    assert.equal(tree[0].children[0]?.kind, "scope");
    if (tree[0].children[0]?.kind !== "scope") {
      return;
    }

    assert.equal(tree[0].children[0].scope, "@acme");
    assert.deepEqual(
      tree[0].children[0].projects.map((leaf) => leaf.displayName),
      ["api", "web"],
    );

    assert.equal(tree[1].label, "packages");
    assert.equal(tree[1].children[0]?.kind, "project");
  });

  it("groups root-level scoped packages even when folder depth is enabled", () => {
    const tree = buildNpmProjectTree(
      [project("@acme/one", "/ws/one", "one"), project("@acme/two", "/ws/two", "two"), project("solo", "/ws/solo", "solo")],
      (item) => (item as NpmProject & { relativePath: string }).relativePath,
      1,
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
    if (tree[1]?.kind !== "project") {
      return;
    }

    assert.equal(tree[1].displayName, "solo");
  });

  it("uses depth 2 for deeper nearest-folder nesting", () => {
    const tree = buildNpmProjectTree(
      [project("the-app", "/ws/apps/demoapps/the-app", "apps/demoapps/the-app")],
      (item) => (item as NpmProject & { relativePath: string }).relativePath,
      2,
      false,
    );

    assert.equal(tree[0]?.kind, "folder");
    if (tree[0]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].label, "apps");
    assert.equal(tree[0].pathKey, "apps");
    assert.equal(tree[0].children[0]?.kind, "folder");
    if (tree[0].children[0]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].children[0].label, "demoapps");
    assert.equal(tree[0].children[0].children[0]?.kind, "project");
  });

  it("groups by the nearest parent folder at depth 1 for deep paths", () => {
    const tree = buildNpmProjectTree(
      [
        project("@acme/web", "/ws/products/team/web", "products/team/web"),
        project("@acme/api", "/ws/products/team/api", "products/team/api"),
        project("other", "/ws/products/other/app", "products/other/app"),
      ],
      (item) => (item as NpmProject & { relativePath: string }).relativePath,
      1,
      true,
    );

    assert.equal(tree[0]?.kind, "folder");
    assert.equal(tree[1]?.kind, "folder");
    if (tree[0]?.kind !== "folder" || tree[1]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].label, "other");
    assert.equal(tree[0].pathKey, "products/other");
    assert.equal(tree[1].label, "team");
    assert.equal(tree[1].pathKey, "products/team");
    assert.equal(tree[1].children[0]?.kind, "scope");
  });
});

describe("buildShellScriptTree", () => {
  it("keeps a flat list at depth 0", () => {
    const tree = buildShellScriptTree(
      [shellScript("setup.sh", "."), shellScript("deploy.sh", "scripts/ci")],
      (item) => (item as ShellScriptTask & { relativeDir: string }).relativeDir,
      0,
    );

    assert.deepEqual(
      tree.map((node) => (node.kind === "script" ? node.task.name : node.label)),
      ["deploy.sh", "setup.sh"],
    );
  });

  it("nests shell scripts under the nearest parent directory", () => {
    const tree = buildShellScriptTree(
      [shellScript("deploy.sh", "scripts/ci"), shellScript("setup.sh", ".")],
      (item) => (item as ShellScriptTask & { relativeDir: string }).relativeDir,
      1,
    );

    assert.equal(tree[0]?.kind, "folder");
    assert.equal(tree[1]?.kind, "script");
    if (tree[0]?.kind !== "folder" || tree[1]?.kind !== "script") {
      return;
    }

    assert.equal(tree[0].label, "ci");
    assert.equal(tree[0].pathKey, "scripts/ci");
    assert.equal(tree[0].children[0]?.kind, "script");
    if (tree[0].children[0]?.kind !== "script") {
      return;
    }

    assert.equal(tree[0].children[0].task.name, "deploy.sh");
    assert.equal(tree[1].task.name, "setup.sh");
  });

  it("supports deeper nesting for shell scripts", () => {
    const tree = buildShellScriptTree(
      [shellScript("deploy.sh", "scripts/ci")],
      (item) => (item as ShellScriptTask & { relativeDir: string }).relativeDir,
      2,
    );

    assert.equal(tree[0]?.kind, "folder");
    if (tree[0]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].label, "scripts");
    assert.equal(tree[0].children[0]?.kind, "folder");
    if (tree[0].children[0]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].children[0].label, "ci");
    assert.equal(tree[0].children[0].children[0]?.kind, "script");
  });
});
