"use strict";

const Module = require("node:module");

function createUri(fsPath) {
  const normalized = String(fsPath).replaceAll("\\", "/");
  return {
    fsPath: normalized,
    scheme: "file",
    path: normalized,
    toString() {
      return `file://${normalized}`;
    },
  };
}

const vscodeMock = {
  Uri: {
    file: createUri,
    joinPath(base, ...paths) {
      const joined = [base.fsPath, ...paths].join("/").replaceAll("//", "/");
      return createUri(joined);
    },
  },
  workspace: {
    workspaceFolders: undefined,
    getConfiguration() {
      return {
        get() {
          return undefined;
        },
      };
    },
    fs: {
      async stat() {
        throw new Error("not found");
      },
      async readFile() {
        return new Uint8Array();
      },
    },
    findFiles: async () => [],
    asRelativePath(pathOrUri) {
      return typeof pathOrUri === "string" ? pathOrUri : pathOrUri.fsPath;
    },
  },
  window: {
    createOutputChannel() {
      return { appendLine() {}, dispose() {} };
    },
    terminals: [],
    createTerminal() {
      return { show() {}, sendText() {}, dispose() {} };
    },
    onDidCloseTerminal() {
      return { dispose() {} };
    },
    onDidEndTerminalShellExecution() {
      return { dispose() {} };
    },
    onDidChangeTerminalShellIntegration() {
      return { dispose() {} };
    },
  },
  EventEmitter: class {
    event = () => ({ dispose() {} });
    fire() {}
    dispose() {}
  },
  ThemeIcon: class {
    static Folder = {};
    constructor() {}
  },
  TreeItem: class {
    constructor() {}
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
};

const originalLoad = Module._load;
Module._load = function loadWithVscodeMock(request, parent, isMain) {
  if (request === "vscode") {
    return vscodeMock;
  }

  return originalLoad.call(this, request, parent, isMain);
};
