import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as vscode from "vscode";
import { readHideEmptyScriptRoots } from "../../src/services/settings";

function configurationStub(getValue: (key: string) => unknown): vscode.WorkspaceConfiguration {
  return {
    get: getValue,
    has: () => false,
    inspect: () => undefined,
    update: async () => undefined,
  } as vscode.WorkspaceConfiguration;
}

describe("readHideEmptyScriptRoots", () => {
  it("defaults to true", () => {
    assert.equal(readHideEmptyScriptRoots(configurationStub(() => undefined)), true);
  });

  it("reads explicit boolean values", () => {
    assert.equal(readHideEmptyScriptRoots(configurationStub((key) => (key === "tree.hideEmptyScriptRoots" ? false : undefined))), false);
    assert.equal(readHideEmptyScriptRoots(configurationStub((key) => (key === "tree.hideEmptyScriptRoots" ? true : undefined))), true);
  });
});
