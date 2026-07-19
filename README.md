# Taskingen

Run npm and shell scripts from the Explorer sidebar in VS Code / Cursor.

Taskingen discovers `package.json` scripts and `*.sh` / `*.bash` files in your workspace, shows them in a dedicated tree view, and runs them in dedicated terminals — with open, stop, refresh, and recent-history support.

## Features

- **npm scripts** — Scans all `package.json` files (JSONC supported), detects npm / pnpm / yarn from lockfiles, and runs `pm run <script>`
- **Shell scripts** — Discovers `*.sh` and `*.bash` files and runs them with bash
- **Grouped tree** — Nest npm scripts by separator (e.g. `test:unit`), group scoped packages (`@scope/...`), and control default expand depth
- **Run / stop / open** — Inline actions on each script; running scripts show a stop control
- **Click to activate** — Configure whether clicking a script opens the source or runs it (single or double click)
- **Task History** — Recently run scripts from the current workspace at the top of the tree
- **Live refresh** — Watches `package.json` and shell script changes (debounced); also refreshes on workspace folder and relevant setting changes

## Install (local)

1. Build a VSIX: `npm run package` → creates `taskingen-<version>.vsix`
2. Command Palette → **Extensions: Install from VSIX…** → select that file

Requires VS Code / Cursor `^1.125.0`.

## Usage

1. Open a folder or multi-root workspace.
2. In the **Explorer** sidebar, find the **Taskingen** view (below the file tree).
3. Expand **npm Scripts** or **Shell Scripts**, then:
   - Use the inline **Open** / **Run** / **Stop** icons, or
   - Activate a script name (see [Settings](#settings) for click behavior).
4. **Task History** lists recently run scripts; clear it from the history group’s inline action.
5. Use the view’s **Refresh** button (or **Taskingen: Refresh Scripts**) after large changes if needed.

You can drag the view to the primary/secondary sidebar or panel. Use **Reset Location** on the view title menu to return it to Explorer.

### Commands

| Command                         | Description                                                    |
| ------------------------------- | -------------------------------------------------------------- |
| `Taskingen: Refresh Scripts`    | Rescan the workspace                                           |
| `Taskingen: Open Script Source` | Open `package.json` (script key highlighted) or the shell file |
| `Taskingen: Run Script`         | Run in a dedicated terminal                                    |
| `Taskingen: Stop Script`        | Soft-stop (Ctrl+C) and clear running state                     |
| `Taskingen: Clear Task History` | Clear stored recent runs for this workspace                    |

## Settings

| Setting                                     | Default       | Description                                                                  |
| ------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `taskingen.npmScriptGrouping.separator`     | `:`           | Nest script names on this separator; empty disables grouping                 |
| `taskingen.npmScriptGrouping.maxDepth`      | `1`           | Max group levels under each project (`0` = flat)                             |
| `taskingen.npmProjectGrouping.groupByScope` | `true`        | Group `@scope/name` packages under `@scope`                                  |
| `taskingen.scriptClickAction`               | `open`        | On activate: `open` source or `execute` the script                           |
| `taskingen.scriptClickMode`                 | `doubleClick` | Activate on single or double click (also respects `workbench.list.openMode`) |
| `taskingen.tree.defaultExpandedDepth`       | `1`           | How many tree levels start expanded                                          |
| `taskingen.taskHistory.enabled`             | `true`        | Show the Task History group                                                  |
| `taskingen.taskHistory.maxItems`            | `5`           | How many recent scripts to show                                              |

## Development

```bash
npm install
npm run compile    # build extension → out/
npm run watch      # rebuild on change
npm test           # unit tests
npm run package    # produce .vsix
```

Press **F5** in VS Code/Cursor (Extension Development Host) using the launch config in `.vscode/`.

## Notes

- Discovery skips common noise paths such as `node_modules`, `.git`, `dist`, `coverage`, `vendor`, `.venv`, and `out`.
- Without terminal shell integration, Taskingen still starts the command; running state clears when you Stop or close the terminal.
- Errors and skip reasons are logged to the **Taskingen** output channel.
