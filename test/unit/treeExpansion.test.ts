import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTreeLevelExpanded, normalizeDefaultExpandedDepth } from "../../src/services/treeExpansion";

describe("normalizeDefaultExpandedDepth", () => {
  it("falls back for non-numbers", () => {
    assert.equal(normalizeDefaultExpandedDepth(undefined), 1);
    assert.equal(normalizeDefaultExpandedDepth("2"), 1);
  });

  it("clamps and truncates", () => {
    assert.equal(normalizeDefaultExpandedDepth(-1), 0);
    assert.equal(normalizeDefaultExpandedDepth(11), 10);
    assert.equal(normalizeDefaultExpandedDepth(2.9), 2);
  });
});

describe("isTreeLevelExpanded", () => {
  it("expands nodes shallower than the default depth", () => {
    assert.equal(isTreeLevelExpanded(0, 1), true);
    assert.equal(isTreeLevelExpanded(1, 1), false);
    assert.equal(isTreeLevelExpanded(0, 0), false);
  });
});
