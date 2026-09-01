import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScriptContextValue } from "../../src/tree/TaskItem";
import type { NpmScriptTask } from "../../src/services/packageJsonScanner";

function npmTask(): NpmScriptTask {
  return {
    kind: "npm",
    name: "build",
    command: "tsc",
    packageJsonUri: {
      fsPath: "/workspace/package.json",
      toString: () => "file:///workspace/package.json",
    } as NpmScriptTask["packageJsonUri"],
    cwd: "/workspace",
  };
}

describe("buildScriptContextValue", () => {
  it("marks history items with a History suffix", () => {
    assert.equal(buildScriptContextValue(npmTask(), { isHistoryItem: true }), "npmScriptHistory");
    assert.equal(
      buildScriptContextValue(npmTask(), { isHistoryItem: true, isRunning: true, isFavorite: true }),
      "npmScriptHistoryFavoritedRunning",
    );
  });

  it("keeps non-history script context values unchanged", () => {
    assert.equal(buildScriptContextValue(npmTask(), { isFavorite: true, isRunning: true }), "npmScriptFavoritedRunning");
  });
});
