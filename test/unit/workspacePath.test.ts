import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { projectFolderDescription, relativeToWorkspaceRoots } from "../../src/services/workspacePath";

describe("relativeToWorkspaceRoots", () => {
  it("returns a posix-relative path under the matching root", () => {
    const root = path.join(path.sep, "Users", "dev", "repo");
    const target = path.join(root, "apps", "web");

    assert.equal(relativeToWorkspaceRoots(target, [root]), "apps/web");
  });

  it("returns . for the workspace root itself", () => {
    const root = path.join(path.sep, "Users", "dev", "repo");

    assert.equal(relativeToWorkspaceRoots(root, [root]), ".");
  });

  it("prefers the longest matching workspace root", () => {
    const outer = path.join(path.sep, "Users", "dev");
    const inner = path.join(outer, "repo");
    const target = path.join(inner, "apps", "web");

    assert.equal(relativeToWorkspaceRoots(target, [outer, inner]), "apps/web");
  });

  it("returns undefined when the path is outside every root", () => {
    const root = path.join(path.sep, "Users", "dev", "repo");
    const other = path.join(path.sep, "Users", "dev", "other", "apps", "web");

    assert.equal(relativeToWorkspaceRoots(other, [root]), undefined);
  });
});

describe("projectFolderDescription", () => {
  it("omits a description for workspace-root packages", () => {
    assert.equal(projectFolderDescription(".", "taskingen"), "");
    assert.equal(projectFolderDescription("./", "taskingen"), "");
    assert.equal(projectFolderDescription("", "taskingen"), "");
  });

  it("uses the folder basename when it differs from the package name", () => {
    assert.equal(projectFolderDescription("apps/web", "my-web"), "web");
  });

  it("keeps the relative path when the folder name matches the package name", () => {
    assert.equal(projectFolderDescription("apps/web", "web"), "apps/web");
  });
});
