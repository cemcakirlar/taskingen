import * as vscode from "vscode";
import { findNpmScriptKeyRange } from "./npmScriptKeyLocator";
import type { RunnableTask } from "./runner";

export { findNpmScriptKeyRange } from "./npmScriptKeyLocator";

export async function openTaskSource(task: RunnableTask): Promise<void> {
  if (task.kind === "shell") {
    const document = await vscode.workspace.openTextDocument(task.scriptUri);
    await vscode.window.showTextDocument(document, { preview: false });
    return;
  }

  const document = await vscode.workspace.openTextDocument(task.packageJsonUri);
  const editor = await vscode.window.showTextDocument(document, { preview: false });
  const keyRange = findNpmScriptKeyRange(document.getText(), task.name);
  if (keyRange === undefined) {
    return;
  }

  const start = document.positionAt(keyRange.offset);
  const end = document.positionAt(keyRange.offset + keyRange.length);
  const selection = new vscode.Range(start, end);
  editor.selection = new vscode.Selection(selection.start, selection.end);
  editor.revealRange(selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}
