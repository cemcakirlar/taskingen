import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDiscoveryExcludeGlob, isDiscoveryPathExcluded, parseDiscoveryExcludePatterns } from "../../src/services/discoveryExclude";

describe("parseDiscoveryExcludePatterns", () => {
  it("returns an empty list by default", () => {
    assert.deepEqual(parseDiscoveryExcludePatterns(undefined), []);
    assert.deepEqual(parseDiscoveryExcludePatterns([]), []);
  });

  it("parses array entries and ignores comments", () => {
    assert.deepEqual(parseDiscoveryExcludePatterns(["legacy/**", "# ignore me", "tools"]), ["legacy/**", "tools"]);
  });

  it("parses multiline strings", () => {
    assert.deepEqual(parseDiscoveryExcludePatterns("legacy/**\n# comment\n/tools"), ["legacy/**", "/tools"]);
  });
});

describe("isDiscoveryPathExcluded", () => {
  it("excludes folder trees anywhere in the workspace", () => {
    const patterns = ["legacy/**"];

    assert.equal(isDiscoveryPathExcluded("legacy/package.json", patterns), true);
    assert.equal(isDiscoveryPathExcluded("packages/legacy/package.json", patterns), true);
    assert.equal(isDiscoveryPathExcluded("packages/demo/package.json", patterns), false);
  });

  it("supports root-anchored patterns", () => {
    const patterns = ["/tools"];

    assert.equal(isDiscoveryPathExcluded("tools/build.sh", patterns), true);
    assert.equal(isDiscoveryPathExcluded("packages/tools/build.sh", patterns), false);
  });

  it("supports simple folder names", () => {
    const patterns = ["generated"];

    assert.equal(isDiscoveryPathExcluded("apps/generated/package.json", patterns), true);
    assert.equal(isDiscoveryPathExcluded("apps/demo/package.json", patterns), false);
  });
});

describe("getDiscoveryExcludeGlob", () => {
  it("keeps built-in excludes when no custom patterns are set", () => {
    assert.match(getDiscoveryExcludeGlob([]), /\*\*\/node_modules\/\*\*/);
  });

  it("adds user patterns to the exclude glob", () => {
    const glob = getDiscoveryExcludeGlob(["legacy/**", "/tools"]);

    assert.match(glob, /\*\*\/legacy\/\*\*/);
    assert.match(glob, /tools\/\*\*/);
  });
});
