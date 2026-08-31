import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import * as vscode from "vscode";
import { FavoritesStore } from "../../src/services/favorites";
import type { NpmProject } from "../../src/services/packageJsonScanner";
import type { NpmScriptTask } from "../../src/services/packageJsonScanner";
import { getTaskIdentity } from "../../src/services/taskIdentity";
import { readFavoritesSettings } from "../../src/services/settings";

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
    values.set("taskingen.favorites", initial);
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

type MutableWorkspace = {
  workspaceFolders: typeof vscode.workspace.workspaceFolders;
  getConfiguration: typeof vscode.workspace.getConfiguration;
};

const mutableWorkspace = vscode.workspace as unknown as MutableWorkspace;

function configurationStub(getValue: (key: string) => unknown): vscode.WorkspaceConfiguration {
  return {
    get: getValue,
    has: () => false,
    inspect: () => undefined,
    update: async () => undefined,
  } as vscode.WorkspaceConfiguration;
}

function setWorkspaceFolders(folderPaths: readonly string[]): void {
  mutableWorkspace.workspaceFolders = folderPaths.map((folderPath, index) => ({
    uri: vscode.Uri.file(folderPath),
    name: folderPath.split("/").at(-1) ?? folderPath,
    index,
  }));
}

function setFavoritesConfig(values: { enabled?: boolean; maxItems?: number }): void {
  mutableWorkspace.getConfiguration = (() =>
    configurationStub((key: string) => {
      if (key === "favorites.enabled") {
        return values.enabled;
      }
      if (key === "favorites.maxItems") {
        return values.maxItems;
      }
      return undefined;
    })) as typeof vscode.workspace.getConfiguration;
}

afterEach(() => {
  mutableWorkspace.workspaceFolders = undefined;
  mutableWorkspace.getConfiguration = (() => configurationStub(() => undefined)) as typeof vscode.workspace.getConfiguration;
});

describe("readFavoritesSettings", () => {
  it("defaults enabled true and maxItems 5", () => {
    assert.deepEqual(readFavoritesSettings(configurationStub(() => undefined)), {
      enabled: true,
      maxItems: 5,
    });
  });

  it("clamps maxItems to 1..50", () => {
    assert.equal(readFavoritesSettings(configurationStub((key) => (key === "favorites.maxItems" ? 0 : undefined))).maxItems, 1);
    assert.equal(readFavoritesSettings(configurationStub((key) => (key === "favorites.maxItems" ? 99 : undefined))).maxItems, 50);
  });
});

describe("FavoritesStore", () => {
  it("prepends new pins at the top and ignores duplicates", () => {
    setWorkspaceFolders(["/repo"]);
    const store = new FavoritesStore(createMemento());
    const first = npmTask("build", "/repo/web");
    const second = npmTask("test", "/repo/web");

    store.add(first);
    store.add(second);
    store.add(first);

    const resolved = store.resolveFavoriteTasks([npmProject("/repo/web", [first, second])], [], []);
    assert.deepEqual(
      resolved.map((task) => getTaskIdentity(task)),
      [getTaskIdentity(second), getTaskIdentity(first)],
    );
  });

  it("toggles a pin off and clears all pins for this workspace", async () => {
    setWorkspaceFolders(["/repo"]);
    const store = new FavoritesStore(createMemento());
    const task = npmTask("dev", "/repo/app");

    store.add(task);
    assert.equal(store.isFavorite(task), true);
    store.toggle(task);
    assert.equal(store.isFavorite(task), false);

    store.add(task);
    await store.clear();
    assert.equal(store.isFavorite(task), false);
    assert.deepEqual(store.resolveFavoriteTasks([npmProject("/repo/app", [task])], [], []), []);
  });

  it("removes a single pin without clearing the rest", () => {
    setWorkspaceFolders(["/repo"]);
    const store = new FavoritesStore(createMemento());
    const first = npmTask("a", "/repo/web");
    const second = npmTask("b", "/repo/web");
    store.add(first);
    store.add(second);

    store.remove(second);

    assert.equal(store.isFavorite(second), false);
    assert.deepEqual(
      store.resolveFavoriteTasks([npmProject("/repo/web", [first, second])], [], []).map((task) => getTaskIdentity(task)),
      [getTaskIdentity(first)],
    );
  });

  it("hides missing pins without deleting them from storage", () => {
    setWorkspaceFolders(["/repo"]);
    setFavoritesConfig({ enabled: true, maxItems: 5 });
    const task = npmTask("build", "/repo/web");
    const store = new FavoritesStore(
      createMemento([{ identity: getTaskIdentity(task) }, { identity: "npm:file:///repo/web/package.json::gone" }]),
    );

    assert.deepEqual(
      store.resolveFavoriteTasks([npmProject("/repo/web", [task])], [], []).map((item) => getTaskIdentity(item)),
      [getTaskIdentity(task)],
    );
    assert.equal(store.isFavorite(task), true);
    assert.equal(store.isFavorite(npmTask("gone", "/repo/web")), true);
  });

  it("shows newest pins first and reveals older pins when maxItems grows or a newer pin is removed", () => {
    setWorkspaceFolders(["/repo"]);
    setFavoritesConfig({ enabled: true, maxItems: 1 });
    const first = npmTask("a", "/repo/web");
    const second = npmTask("b", "/repo/web");
    const store = new FavoritesStore(createMemento());
    store.add(first);
    store.add(second);

    assert.deepEqual(
      store.resolveFavoriteTasks([npmProject("/repo/web", [first, second])], [], []).map((task) => getTaskIdentity(task)),
      [getTaskIdentity(second)],
    );

    store.remove(second);
    assert.deepEqual(
      store.resolveFavoriteTasks([npmProject("/repo/web", [first, second])], [], []).map((task) => getTaskIdentity(task)),
      [getTaskIdentity(first)],
    );

    store.add(second);
    setFavoritesConfig({ enabled: true, maxItems: 5 });
    assert.deepEqual(
      store.resolveFavoriteTasks([npmProject("/repo/web", [first, second])], [], []).map((task) => getTaskIdentity(task)),
      [getTaskIdentity(second), getTaskIdentity(first)],
    );
  });

  it("returns no favorites when disabled", () => {
    setWorkspaceFolders(["/repo"]);
    setFavoritesConfig({ enabled: false, maxItems: 5 });
    const task = npmTask("dev", "/repo/web");
    const store = new FavoritesStore(createMemento());
    store.add(task);

    assert.deepEqual(store.resolveFavoriteTasks([npmProject("/repo/web", [task])], [], []), []);
    assert.equal(store.isFavorite(task), true);
  });
});
