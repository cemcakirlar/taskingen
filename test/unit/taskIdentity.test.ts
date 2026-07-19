import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLegacyTaskIdentities,
  getTaskIdentity,
  getTaskShortLabel,
  getTaskTerminalName,
} from "../../src/services/taskIdentity";
import type { NpmScriptTask } from "../../src/services/packageJsonScanner";
import type { ShellScriptTask } from "../../src/services/shellScriptScanner";

function npmTask(name: string, cwd: string): NpmScriptTask {
  const packageJsonUri = {
    fsPath: `${cwd}/package.json`,
    toString: () => `file://${cwd}/package.json`,
  } as NpmScriptTask["packageJsonUri"];

  return {
    kind: "npm",
    name,
    command: "echo",
    packageJsonUri,
    cwd,
  };
}

function shellTask(fsPath: string): ShellScriptTask {
  const scriptUri = {
    fsPath,
    toString: () => `file://${fsPath}`,
  } as ShellScriptTask["scriptUri"];

  return {
    kind: "shell",
    name: fsPath.split("/").at(-1) ?? fsPath,
    scriptUri,
    cwd: fsPath.split("/").slice(0, -1).join("/") || "/",
  };
}

describe("getTaskIdentity", () => {
  it("uses packageJsonUri for npm scripts", () => {
    const task = npmTask("build", "/apps/web");
    assert.equal(getTaskIdentity(task), "npm:file:///apps/web/package.json::build");
  });

  it("uses script URI for shell scripts", () => {
    const task = shellTask("/repo/scripts/build.sh");
    assert.equal(getTaskIdentity(task), "shell:file:///repo/scripts/build.sh");
  });
});

describe("getLegacyTaskIdentities", () => {
  it("returns cwd-based npm keys for history migration", () => {
    const task = npmTask("test", "/apps/api");
    assert.deepEqual(getLegacyTaskIdentities(task), ["npm:/apps/api::test"]);
  });

  it("returns no legacy keys for shell scripts", () => {
    assert.deepEqual(getLegacyTaskIdentities(shellTask("/x.sh")), []);
  });
});

describe("getTaskTerminalName", () => {
  it("makes shell terminal names path-aware and unique", () => {
    const left = getTaskTerminalName(shellTask("/a/scripts/build.sh"));
    const right = getTaskTerminalName(shellTask("/b/scripts/build.sh"));
    assert.match(left, /^Taskingen: scripts\/build\.sh · /);
    assert.match(right, /^Taskingen: scripts\/build\.sh · /);
    assert.notEqual(left, right);
  });

  it("keeps a readable npm short label", () => {
    const name = getTaskTerminalName(npmTask("dev", "/apps/web"));
    assert.match(name, /^Taskingen: web \/ dev · /);
    assert.equal(getTaskShortLabel(npmTask("dev", "/apps/web")), "web / dev");
  });
});
