import * as fs from "fs-extra";
import * as vscode from "vscode";

/**
 * Common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export let context: vscode.ExtensionContext;
export let workspaceUri: vscode.Uri | undefined;
export let isSpeechFxProject = false;
// export let isOfficeAddInProject = false;
// export let isOfficeManifestOnlyProject = false;
// export let isSPFxProject = false;
// export let isExistingUser = "no";
// export let uriEventHandler: UriHandler;
export let defaultExtensionLogPath: string;
// export let commandIsRunning = false;

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
  // if (isTeamsFxProject && workspaceUri?.fsPath) {
  //   isSPFxProject = checkIsSPFx(workspaceUri?.fsPath);
  // } else {
  //   isSPFxProject = fs.existsSync(path.join(workspaceUri?.fsPath ?? "./", "SPFx"));
  // }
}

function isValidProject(workspacePath?: string): boolean {
  if (!workspacePath) return false;

  // TODO: have a speechFx signal file inserted into project as a flag showing whether it is a speech project.
  // right now just take every project as a valid speech project.
  return true;
}
  