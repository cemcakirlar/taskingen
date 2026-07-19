import * as vscode from "vscode";
import type { IdentityTask } from "./taskIdentity";
import { getTaskIdentity } from "./taskIdentity";

export interface RunningTaskEntry {
  readonly identity: string;
  readonly task: IdentityTask;
  readonly terminal: vscode.Terminal;
  readonly label: string;
}

export class RunningTaskRegistry implements vscode.Disposable {
  private readonly entries = new Map<string, RunningTaskEntry>();
  private readonly changeEmitter = new vscode.EventEmitter<void>();

  public readonly onDidChange = this.changeEmitter.event;

  public isRunning(task: IdentityTask): boolean {
    return this.entries.has(getTaskIdentity(task));
  }

  public get(task: IdentityTask): RunningTaskEntry | undefined {
    return this.entries.get(getTaskIdentity(task));
  }

  public register(entry: RunningTaskEntry): void {
    this.entries.set(entry.identity, entry);
    this.changeEmitter.fire();
  }

  public unregister(identity: string): boolean {
    const removed = this.entries.delete(identity);
    if (removed) {
      this.changeEmitter.fire();
    }

    return removed;
  }

  public unregisterByTerminal(terminal: vscode.Terminal): boolean {
    for (const [identity, entry] of this.entries) {
      if (entry.terminal === terminal) {
        this.entries.delete(identity);
        this.changeEmitter.fire();
        return true;
      }
    }

    return false;
  }

  public dispose(): void {
    this.entries.clear();
    this.changeEmitter.dispose();
  }
}
