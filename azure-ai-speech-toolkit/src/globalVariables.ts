import * as fs from "fs-extra";
import path = require("path");
import * as vscode from "vscode";
import { ConstantString } from "./constants";

/**
 * Common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export let context: vscode.ExtensionContext;
export let workspaceUri: vscode.Uri | undefined;
export let isSpeechFxProject = false;
export let defaultExtensionLogPath: string;

if (vscode.workspace && vscode.workspace.workspaceFolders) {
  if (vscode.workspace.workspaceFolders.length > 0) {
    workspaceUri = vscode.workspace.workspaceFolders[0].uri;
  }
}

export function initializeGlobalVariables(ctx: vscode.ExtensionContext): void {
  context = ctx;
  isSpeechFxProject = isValidProject(workspaceUri?.fsPath);

  // isExistingUser = context.globalState.get<string>(UserState.IsExisting) || "no";
  // isOfficeAddInProject = isValidOfficeAddInProject(workspaceUri?.fsPath);
  // if (isOfficeAddInProject) {
  //   isOfficeManifestOnlyProject = isManifestOnlyOfficeAddinProject(workspaceUri?.fsPath);
  // }
  // // Default Extension log path
  // // e.g. C:/Users/xx/AppData/Roaming/Code/logs/20230221T095340/window7/exthost/TeamsDevApp.ms-teams-vscode-extension
  defaultExtensionLogPath = ctx.logUri.fsPath;
  if (!fs.pathExistsSync(defaultExtensionLogPath)) {
    fs.mkdirSync(defaultExtensionLogPath);
  }
}

export function isValidProject(workspacePath?: string): boolean {
  if (!workspacePath) return false;

  const ymlPath = path.join(workspacePath, ConstantString.AzureAISpeechAppYmlFileName);
  if (!fs.existsSync(ymlPath)) {
    return false;
  }
  return true;
}

