import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choosePackageManager } from "../../src/services/packageManager";
import { parsePackageJsonContent } from "../../src/services/packageJsonScanner";
import { quoteShellArgument } from "../../src/services/runner";

describe("choosePackageManager", () => {
  it("prefers pnpm, then yarn, then npm", () => {
    assert.equal(choosePackageManager(true, true), "pnpm");
    assert.equal(choosePackageManager(false, true), "yarn");
    assert.equal(choosePackageManager(false, false), "npm");
  });
});

describe("quoteShellArgument", () => {
  it("wraps values in single quotes and escapes embedded quotes", () => {
    assert.equal(quoteShellArgument("plain"), "'plain'");
    assert.equal(quoteShellArgument("it's"), "'it'\"'\"'s'");
  });
});

describe("parsePackageJsonContent", () => {
  it("parses JSONC with comments", () => {
    const parsed = parsePackageJsonContent(`{
      // package name
      "name": "demo",
      "scripts": {
        "build": "tsc"
      }
    }`);

    assert.equal(parsed?.name, "demo");
    assert.equal(parsed?.scripts?.build, "tsc");
  });

  it("rejects non-objects", () => {
    assert.equal(parsePackageJsonContent("[]"), undefined);
    assert.equal(parsePackageJsonContent('"x"'), undefined);
  });
});
