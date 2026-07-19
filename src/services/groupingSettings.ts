import * as vscode from "vscode";
import { normalizeDefaultExpandedDepth } from "./treeExpansion";

export interface NpmScriptGroupingSettings {
  readonly separator: string;
  readonly maxDepth: number;
}

export interface NpmProjectGroupingSettings {
  readonly groupByScope: boolean;
}

export type ScriptClickAction = "open" | "execute";

export type ScriptClickMode = "singleClick" | "doubleClick";

export interface TaskHistorySettings {
  readonly enabled: boolean;
  readonly maxItems: number;
}

export function readNpmScriptGroupingSettings(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("taskingen"),
): NpmScriptGroupingSettings {
  const separatorValue = configuration.get("npmScriptGrouping.separator");
  const maxDepthValue = configuration.get("npmScriptGrouping.maxDepth");

  return {
    separator: typeof separatorValue === "string" ? separatorValue : ":",
    maxDepth: normalizeBoundedInteger(maxDepthValue, 1),
  };
}

export function readNpmProjectGroupingSettings(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("taskingen"),
): NpmProjectGroupingSettings {
  const groupByScopeValue = configuration.get("npmProjectGrouping.groupByScope");

  return {
    groupByScope: typeof groupByScopeValue === "boolean" ? groupByScopeValue : true,
  };
}

export function readScriptClickAction(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("taskingen"),
): ScriptClickAction {
  const value = configuration.get("scriptClickAction");
  return value === "execute" ? "execute" : "open";
}

export function readScriptClickMode(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("taskingen"),
): ScriptClickMode {
  const value = configuration.get("scriptClickMode");
  return value === "singleClick" ? "singleClick" : "doubleClick";
}

export function readDefaultExpandedDepth(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("taskingen"),
): number {
  return normalizeDefaultExpandedDepth(configuration.get("tree.defaultExpandedDepth"));
}

export function readTaskHistorySettings(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("taskingen"),
): TaskHistorySettings {
  const enabledValue = configuration.get("taskHistory.enabled");
  const maxItemsValue = configuration.get("taskHistory.maxItems");

  return {
    enabled: typeof enabledValue === "boolean" ? enabledValue : true,
    maxItems: normalizeHistoryMaxItems(maxItemsValue),
  };
}

export function affectsTaskingenTree(event: vscode.ConfigurationChangeEvent): boolean {
  return (
    event.affectsConfiguration("taskingen.npmScriptGrouping.separator") ||
    event.affectsConfiguration("taskingen.npmScriptGrouping.maxDepth") ||
    event.affectsConfiguration("taskingen.npmProjectGrouping.groupByScope") ||
    event.affectsConfiguration("taskingen.scriptClickAction") ||
    event.affectsConfiguration("taskingen.tree.defaultExpandedDepth") ||
    event.affectsConfiguration("taskingen.taskHistory.enabled") ||
    event.affectsConfiguration("taskingen.taskHistory.maxItems")
  );
}

function normalizeBoundedInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(10, Math.trunc(value)));
}

function normalizeHistoryMaxItems(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 5;
  }

  return Math.max(1, Math.min(50, Math.trunc(value)));
}
