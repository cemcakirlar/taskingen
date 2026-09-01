import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

interface PackageMenuEntry {
  readonly command: string;
  readonly when?: string;
  readonly group?: string;
}

interface PackageManifest {
  readonly contributes?: {
    readonly menus?: {
      readonly "view/item/context"?: readonly PackageMenuEntry[];
    };
  };
}

function readContextMenus(): readonly PackageMenuEntry[] {
  const manifest = JSON.parse(readFileSync("package.json", "utf8")) as PackageManifest;
  return manifest.contributes?.menus?.["view/item/context"] ?? [];
}

function findContextMenuEntries(command: string, groupPrefix: string): PackageMenuEntry[] {
  return readContextMenus().filter((entry) => entry.command === command && entry.group?.startsWith(groupPrefix));
}

describe("script context menus", () => {
  it("includes non-inline Open, Run, and Stop entries for script items", () => {
    const open = findContextMenuEntries("taskingen.open", "actions");
    const run = findContextMenuEntries("taskingen.run", "actions");
    const stop = findContextMenuEntries("taskingen.stop", "actions");

    assert.equal(open.length, 1);
    assert.equal(run.length, 1);
    assert.equal(stop.length, 1);

    assert.match(open[0]?.when ?? "", /view == taskingen\.scripts/);
    assert.match(run[0]?.when ?? "", /view == taskingen\.scripts/);
    assert.match(stop[0]?.when ?? "", /view == taskingen\.scripts/);
    assert.match(open[0]?.when ?? "", /\(History\)\?/);
    assert.match(stop[0]?.when ?? "", /Running/);
  });

  it("includes inline and text Remove from History entries for history scripts only", () => {
    const inline = findContextMenuEntries("taskingen.removeFromHistory", "inline");
    const text = findContextMenuEntries("taskingen.removeFromHistory", "history");

    assert.equal(inline.length, 1);
    assert.equal(text.length, 1);
    assert.match(inline[0]?.when ?? "", /ScriptHistory\(Favorited\)\?\(Running\)\?\$/);
  });
});
