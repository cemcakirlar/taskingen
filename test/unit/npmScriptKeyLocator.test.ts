import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findDenoTaskKeyRange, findNpmScriptKeyRange } from "../../src/services/npmScriptKeyLocator";

describe("findNpmScriptKeyRange", () => {
  it("locates the scripts key range", () => {
    const content = `{
  "scripts": {
    "build": "tsc"
  }
}`;
    const range = findNpmScriptKeyRange(content, "build");
    assert.ok(range !== undefined);
    assert.equal(content.slice(range!.offset, range!.offset + range!.length), '"build"');
  });
});

describe("findDenoTaskKeyRange", () => {
  it("locates the tasks key range for string and object tasks", () => {
    const content = `{
  "tasks": {
    "build": "deno run build.ts",
    "analyze": {
      "description": "Run analysis",
      "command": "deno run analyze.ts"
    }
  }
}`;
    const buildRange = findDenoTaskKeyRange(content, "build");
    const analyzeRange = findDenoTaskKeyRange(content, "analyze");
    assert.ok(buildRange !== undefined);
    assert.ok(analyzeRange !== undefined);
    assert.equal(content.slice(buildRange!.offset, buildRange!.offset + buildRange!.length), '"build"');
    assert.equal(content.slice(analyzeRange!.offset, analyzeRange!.offset + analyzeRange!.length), '"analyze"');
  });

  it("returns undefined for missing tasks", () => {
    assert.equal(findDenoTaskKeyRange(`{ "tasks": { "build": "x" } }`, "missing"), undefined);
  });
});
