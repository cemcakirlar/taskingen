import * as vscode from "vscode";
import { parseDiscoveryExcludePatterns } from "./discoveryExclude";
import { normalizeDefaultExpandedDepth } from "./treeExpansion";

export interface NpmScriptGroupingSettings {
  readonly separator: string;
  readonly maxDepth: number;
}

export interface NpmProjectGroupingSettings {
  readonly groupByScope: boolean;
  readonly folderMaxDepth: number;
}

export type ScriptClickAction = "open" | "execute";

export type ScriptClickMode = "singleClick" | "doubleClick";

export interface TaskHistorySettings {
  readonly enabled: boolean;
  readonly maxItems: number;
}

export interface FavoritesSettings {
  readonly enabled: boolean;
  readonly maxItems: number;
}

export function readDiscoveryExcludePatterns(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("taskingen"),
): string[] {
  return parseDiscoveryExcludePatterns(configuration.get("discovery.exclude"));
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
  const folderMaxDepthValue = configuration.get("npmProjectGrouping.folderMaxDepth");

  return {
    groupByScope: typeof groupByScopeValue === "boolean" ? groupByScopeValue : true,
    folderMaxDepth: normalizeBoundedInteger(folderMaxDepthValue, 1),
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
    maxItems: normalizeVisibleMaxItems(maxItemsValue),
  };
}

export function readFavoritesSettings(
  configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("taskingen"),
): FavoritesSettings {
  const enabledValue = configuration.get("favorites.enabled");
  const maxItemsValue = configuration.get("favorites.maxItems");

  return {
    enabled: typeof enabledValue === "boolean" ? enabledValue : true,
    maxItems: normalizeVisibleMaxItems(maxItemsValue),
  };
}

export function affectsTaskingenTree(event: vscode.ConfigurationChangeEvent): boolean {
  return (
    event.affectsConfiguration("taskingen.npmScriptGrouping.separator") ||
    event.affectsConfiguration("taskingen.npmScriptGrouping.maxDepth") ||
    event.affectsConfiguration("taskingen.npmProjectGrouping.groupByScope") ||
    event.affectsConfiguration("taskingen.npmProjectGrouping.folderMaxDepth") ||
    event.affectsConfiguration("taskingen.tree.defaultExpandedDepth") ||
    event.affectsConfiguration("taskingen.taskHistory.enabled") ||
    event.affectsConfiguration("taskingen.taskHistory.maxItems") ||
    event.affectsConfiguration("taskingen.favorites.enabled") ||
    event.affectsConfiguration("taskingen.favorites.maxItems") ||
    event.affectsConfiguration("taskingen.discovery.exclude")
  );
}

function normalizeBoundedInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(10, Math.trunc(value)));
}

function normalizeVisibleMaxItems(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 5;
  }

  return Math.max(1, Math.min(50, Math.trunc(value)));
}
