import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import * as vscode from "vscode";
import { FavoritesStore } from "../../src/services/favorites";
import { RunningTaskRegistry } from "../../src/services/runningTaskRegistry";
import { TaskHistoryStore } from "../../src/services/taskHistory";
import { getTaskIdentity, getTaskShortLabel } from "../../src/services/taskIdentity";
import type { NpmScriptTask } from "../../src/services/packageJsonScanner";
import { TaskTreeProvider } from "../../src/tree/TaskTreeProvider";
import { TaskGroupItem, TaskItem } from "../../src/tree/TaskItem";

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

function createMemento(): vscode.Memento {
  const values = new Map<string, unknown>();

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

function setConfiguration(getValue: (key: string) => unknown): void {
  mutableWorkspace.getConfiguration = () => configurationStub(getValue);
}

function createProvider(registry: RunningTaskRegistry): TaskTreeProvider {
  const outputChannel = vscode.window.createOutputChannel("test");
  return new TaskTreeProvider(outputChannel, registry, new TaskHistoryStore(createMemento()), new FavoritesStore(createMemento()));
}

function registerRunningTask(registry: RunningTaskRegistry, task: NpmScriptTask): void {
  registry.register({
    identity: getTaskIdentity(task),
    task,
    terminal: { show() {}, sendText() {}, dispose() {} } as unknown as vscode.Terminal,
    label: getTaskShortLabel(task),
  });
}

describe("Running root", () => {
  afterEach(() => {
    setConfiguration(() => undefined);
  });

  it("omits the Running root when no tasks are running", () => {
    const provider = createProvider(new RunningTaskRegistry());
    const roots = provider.getChildren();

    assert.equal(roots.some((root) => root instanceof TaskGroupItem && root.groupKind === "running"), false);
    assert.equal(provider.getCounts().running, 0);
  });

  it("shows Running first when tasks are active", () => {
    const registry = new RunningTaskRegistry();
    registerRunningTask(registry, npmTask("build", "/workspace"));
    registerRunningTask(registry, npmTask("test", "/workspace"));
    const provider = createProvider(registry);

    const roots = provider.getChildren();
    const runningRoot = roots[0];

    assert.ok(runningRoot instanceof TaskGroupItem);
    assert.equal(runningRoot.groupKind, "running");
    assert.equal(runningRoot.description, "2");
    assert.equal(provider.getCounts().running, 2);
  });

  it("hides the Running root when the setting is disabled", () => {
    setConfiguration((key) => (key === "running.enabled" ? false : undefined));
    const registry = new RunningTaskRegistry();
    registerRunningTask(registry, npmTask("build", "/workspace"));
    const provider = createProvider(registry);

    const roots = provider.getChildren();

    assert.equal(roots.some((root) => root instanceof TaskGroupItem && root.groupKind === "running"), false);
  });

  it("lists running tasks under the Running group with running styling", () => {
    const registry = new RunningTaskRegistry();
    const task = npmTask("build", "/workspace");
    registerRunningTask(registry, task);
    const provider = createProvider(registry);
    const runningRoot = provider.getChildren().find((root) => root instanceof TaskGroupItem && root.groupKind === "running");

    assert.ok(runningRoot instanceof TaskGroupItem);
    const items = provider.getChildren(runningRoot);

    assert.equal(items.length, 1);
    const item = items[0];
    assert.ok(item instanceof TaskItem);
    assert.equal(item.contextValue, "npmScriptRunning");
    assert.equal(item.description, "running");
    assert.equal(item.id, `running:${getTaskIdentity(task)}`);
  });
});
