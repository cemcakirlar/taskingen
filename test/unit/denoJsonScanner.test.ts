import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDenoJsonContent, parseDenoTaskValue } from "../../src/services/denoJsonScanner";

describe("parseDenoJsonContent", () => {
  it("parses JSONC with comments and tasks", () => {
    const parsed = parseDenoJsonContent(`{
      // project name
      "name": "@acme/demo",
      "tasks": {
        "build": "deno run build.ts"
      }
    }`);

    assert.equal(parsed?.name, "@acme/demo");
    assert.equal(parsed?.tasks?.build, "deno run build.ts");
  });

  it("rejects non-objects", () => {
    assert.equal(parseDenoJsonContent("[]"), undefined);
    assert.equal(parseDenoJsonContent('"x"'), undefined);
  });
});

describe("parseDenoTaskValue", () => {
  it("accepts string tasks", () => {
    assert.deepEqual(parseDenoTaskValue("deno run main.ts"), { command: "deno run main.ts" });
  });

  it("accepts object tasks with command and description", () => {
    assert.deepEqual(
      parseDenoTaskValue({
        description: "Run analysis",
        command: "deno run analyze.ts",
      }),
      { command: "deno run analyze.ts", description: "Run analysis" },
    );
  });

  it("accepts object tasks without description", () => {
    assert.deepEqual(parseDenoTaskValue({ command: "deno test" }), { command: "deno test" });
  });

  it("ignores invalid task values", () => {
    assert.equal(parseDenoTaskValue(42), undefined);
    assert.equal(parseDenoTaskValue({ description: "missing command" }), undefined);
    assert.equal(parseDenoTaskValue({ command: 1 }), undefined);
    assert.equal(parseDenoTaskValue(null), undefined);
  });
});
