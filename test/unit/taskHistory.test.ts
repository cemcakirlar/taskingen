import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as vscode from "vscode";
import type { NpmProject } from "../../src/services/packageJsonScanner";
import type { NpmScriptTask } from "../../src/services/packageJsonScanner";
import { TaskHistoryStore } from "../../src/services/taskHistory";
import { getLegacyTaskIdentities, getTaskIdentity } from "../../src/services/taskIdentity";

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

function npmProject(cwd: string, scripts: readonly NpmScriptTask[]): NpmProject {
  return {
    name: cwd.split("/").at(-1) ?? cwd,
    cwd,
    packageJsonUri: scripts[0]!.packageJsonUri,
    scripts: [...scripts],
  };
}

function createMemento(initial?: unknown): vscode.Memento {
  const values = new Map<string, unknown>();
  if (initial !== undefined) {
    values.set("taskingen.taskHistory", initial);
  }

  return {
    get<T>(key: string): T | undefined {
      return values.get(key) as T | undefined;
    },
    update(key: string, value: unknown): Thenable<void> {
      if (value === undefined) {
        values.delete(key);
      } else {
        values.set(key, value);
      }
      return Promise.resolve();
    },
    keys(): readonly string[] {
      return [...values.keys()];
    },
  };
}

function stubWorkspaceFolder(cwd: string): void {
  Object.assign(vscode.workspace, {
    workspaceFolders: [{ uri: { fsPath: cwd } }],
  });
}

describe("TaskHistoryStore", () => {
  it("removes a single history entry without clearing the rest", () => {
    stubWorkspaceFolder("/workspace");
    const build = npmTask("build", "/workspace/app");
    const test = npmTask("test", "/workspace/app");
    const store = new TaskHistoryStore(
      createMemento([
        { identity: getTaskIdentity(build), usedAt: 2 },
        { identity: getTaskIdentity(test), usedAt: 1 },
      ]),
    );

    store.remove(build);

    const remaining = store.resolveRecentTasks([npmProject("/workspace/app", [build, test])], [], []);
    assert.deepEqual(
      remaining.map((task) => task.name),
      ["test"],
    );
  });

  it("removes legacy npm history keys when removing a script", () => {
    stubWorkspaceFolder("/workspace");
    const build = npmTask("build", "/workspace/app");
    const legacyIdentity = getLegacyTaskIdentities(build)[0];
    assert.notEqual(legacyIdentity, undefined);

    const store = new TaskHistoryStore(createMemento([{ identity: legacyIdentity!, usedAt: 1 }]));
    store.remove(build);

    assert.deepEqual(store.resolveRecentTasks([npmProject("/workspace/app", [build])], [], []), []);
  });
});
