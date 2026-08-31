# Taskingen

VS Code / Cursor sidebar that discovers and runs npm scripts, Deno tasks, and shell scripts in the open workspace.

## Language

**Favorite**:
A user pin on a leaf script (npm, Deno, or shell). Manual; not derived from runs.
_Avoid_: bookmark, starred task, pinned history

**Task History**:
Recently run scripts in the open workspace, recorded automatically.
_Avoid_: recent, favorites, run log

**Leaf script**:
A runnable tree item: one npm script, Deno task, or shell script. Not a project, folder, or script group.
_Avoid_: task group, project node

**Task identity**:
The stable key for one leaf script (`getTaskIdentity`), shared by History and Favorites.
_Avoid_: label, path alone, cwd alone
