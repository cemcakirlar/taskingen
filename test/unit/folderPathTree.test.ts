import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFolderPathTree, parentPathForFolderGrouping, pathSegments } from "../../src/services/folderPathTree";

describe("pathSegments", () => {
  it("splits relative paths and ignores root markers", () => {
    assert.deepEqual(pathSegments("apps/demoapps/the-app"), ["apps", "demoapps", "the-app"]);
    assert.deepEqual(pathSegments("./apps/web"), ["apps", "web"]);
    assert.deepEqual(pathSegments("."), []);
    assert.deepEqual(pathSegments(""), []);
    assert.deepEqual(pathSegments("apps\\web"), ["apps", "web"]);
  });
});

describe("parentPathForFolderGrouping", () => {
  it("drops the project directory segment", () => {
    assert.equal(parentPathForFolderGrouping("apps/web"), "apps");
    assert.equal(parentPathForFolderGrouping("apps/demoapps/the-app"), "apps/demoapps");
    assert.equal(parentPathForFolderGrouping("one"), ".");
    assert.equal(parentPathForFolderGrouping("."), ".");
  });
});

describe("buildFolderPathTree", () => {
  it("keeps a flat list when depth is 0", () => {
    const tree = buildFolderPathTree(
      [
        { id: "a", path: "apps/web" },
        { id: "b", path: "packages/ui" },
      ],
      (item) => item.path,
      0,
    );

    assert.deepEqual(
      tree.map((node) => (node.kind === "leaf" ? node.item.id : node.label)),
      ["a", "b"],
    );
  });

  it("nests the nearest folder at depth 1", () => {
    const tree = buildFolderPathTree([{ id: "app", path: "apps/demoapps/the-app" }], (item) => item.path, 1);

    assert.equal(tree.length, 1);
    assert.equal(tree[0]?.kind, "folder");
    if (tree[0]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].label, "the-app");
    assert.equal(tree[0].pathKey, "apps/demoapps/the-app");
    assert.equal(tree[0].children.length, 1);
    assert.equal(tree[0].children[0]?.kind, "leaf");
    if (tree[0].children[0]?.kind !== "leaf") {
      return;
    }

    assert.equal(tree[0].children[0].item.id, "app");
  });

  it("nests the two nearest folders at depth 2", () => {
    const tree = buildFolderPathTree([{ id: "app", path: "apps/demoapps/the-app" }], (item) => item.path, 2);

    assert.equal(tree[0]?.kind, "folder");
    if (tree[0]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].label, "demoapps");
    assert.equal(tree[0].pathKey, "apps/demoapps");
    assert.equal(tree[0].children[0]?.kind, "folder");
    if (tree[0].children[0]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].children[0].label, "the-app");
    assert.equal(tree[0].children[0].pathKey, "apps/demoapps/the-app");
    assert.equal(tree[0].children[0].children[0]?.kind, "leaf");
  });

  it("keeps root items at the top level", () => {
    const tree = buildFolderPathTree(
      [
        { id: "root", path: "." },
        { id: "nested", path: "apps/web" },
      ],
      (item) => item.path,
      1,
    );

    assert.equal(tree[0]?.kind, "folder");
    assert.equal(tree[1]?.kind, "leaf");
    if (tree[0]?.kind !== "folder" || tree[1]?.kind !== "leaf") {
      return;
    }

    assert.equal(tree[0].label, "web");
    assert.equal(tree[1].item.id, "root");
  });

  it("still includes deeply nested paths regardless of depth setting", () => {
    const tree = buildFolderPathTree([{ id: "deep", path: "a/b/c/d/e" }], (item) => item.path, 1);

    assert.equal(tree[0]?.kind, "folder");
    if (tree[0]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].label, "e");
    assert.equal(tree[0].pathKey, "a/b/c/d/e");
    assert.equal(tree[0].children[0]?.kind, "leaf");
    if (tree[0].children[0]?.kind !== "leaf") {
      return;
    }

    assert.equal(tree[0].children[0].item.id, "deep");
  });

  it("keeps distinct pathKeys when nearest folder labels collide", () => {
    const tree = buildFolderPathTree(
      [
        { id: "apps-web", path: "apps/web" },
        { id: "packages-web", path: "packages/web" },
      ],
      (item) => item.path,
      1,
    );

    assert.equal(tree.length, 2);
    assert.equal(tree[0]?.kind, "folder");
    assert.equal(tree[1]?.kind, "folder");
    if (tree[0]?.kind !== "folder" || tree[1]?.kind !== "folder") {
      return;
    }

    assert.equal(tree[0].label, "web");
    assert.equal(tree[1].label, "web");
    assert.deepEqual([tree[0].pathKey, tree[1].pathKey].sort(), ["apps/web", "packages/web"]);
  });
});
