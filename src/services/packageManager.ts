import * as path from "node:path";
import * as vscode from "vscode";

export type PackageManager = "npm" | "pnpm" | "yarn";

export function choosePackageManager(hasPnpmLock: boolean, hasYarnLock: boolean): PackageManager {
  if (hasPnpmLock) {
    return "pnpm";
  }

  return hasYarnLock ? "yarn" : "npm";
}

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  const [hasPnpmLock, hasYarnLock] = await Promise.all([
    fileExists(path.join(cwd, "pnpm-lock.yaml")),
    fileExists(path.join(cwd, "yarn.lock")),
  ]);

  return choosePackageManager(hasPnpmLock, hasYarnLock);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
    return true;
  } catch {
    return false;
  }
}
