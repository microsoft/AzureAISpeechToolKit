// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommandKey as CommandKeys, TerminalName } from "./constants";
import * as handlers from "./handlers";
import { initializeGlobalVariables, isSpeechFxProject } from './globalVariables';
import { VSCodeUI } from './ui/ui';
import accountTreeViewProviderInstance from "./treeview/account/accountTreeViewProvider";
import { AzureAccountManager } from './common/azureLogin';
import TreeViewManagerInstance from "./treeview/treeViewManager";

export let VS_CODE_UI: VSCodeUI;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "azure-ai-speech-toolkit" is now active!');

	VS_CODE_UI = new VSCodeUI(TerminalName);
	initializeGlobalVariables(context);

	const openSamples = vscode.commands.registerCommand(CommandKeys.OpenSamples, handlers.openSamplesHandler);
	context.subscriptions.push(openSamples);
	
	const provisionResources = vscode.commands.registerCommand(CommandKeys.Provision, handlers.provisionHandler);
	context.subscriptions.push(provisionResources);

	// const signInAzure = vscode.commands.registerCommand(CommandKeys.SigninAzure, handlers.signInAzureHandler);
	// context.subscriptions.push(signInAzure);
	
	// const signOutAzure = vscode.commands.registerCommand(CommandKeys.SignOutAzure, handlers.signOutAzureHandler);
	// context.subscriptions.push(signOutAzure);

	if (isSpeechFxProject) {
		activateSpeechFxRegistration(context);
	  }
	// UI is ready to show & interact
	await vscode.commands.executeCommand("setContext", "azure-ai-speech-toolkit.isSpeechFx", isSpeechFxProject);

	const openDocument = vscode.commands.registerCommand(CommandKeys.OpenDocument, handlers.openDocumentHandler);
	context.subscriptions.push(openDocument);

	await vscode.commands.executeCommand("setContext", "azure-ai-speech-toolkit.initialized", true);
}

function activateSpeechFxRegistration(context: vscode.ExtensionContext) {
	// registerTreeViewCommandsInDevelopment(context);
	// registerTreeViewCommandsInLifecycle(context);
	// registerTreeViewCommandsInHelper(context);
	// registerTeamsFxCommands(context);
	// registerMenuCommands(context);
	// handlers.registerAccountMenuCommands(context);
	console.log("activateSpeechFxRegistration");
  
	TreeViewManagerInstance.registerTreeViews(context);
	accountTreeViewProviderInstance.subscribeToStatusChanges({
	  azureAccountProvider: AzureAccountManager.getInstance(),
	//   m365TokenProvider: M365TokenInstance,
	});
	// // Set region for M365 account every
	// void M365TokenInstance.setStatusChangeMap(
	//   "set-region",
	//   { scopes: AuthSvcScopes },
	//   async (status, token, accountInfo) => {
	// 	if (status === "SignedIn") {
	// 	  const tokenRes = await M365TokenInstance.getAccessToken({ scopes: AuthSvcScopes });
	// 	  if (tokenRes.isOk()) {
	// 		await setRegion(tokenRes.value);
	// 	  }
	// 	}
	//   }
	// );
  
	// if (vscode.workspace.isTrusted) {
	//   registerCodelensAndHoverProviders(context);
	// }
  
	// registerDebugConfigProviders(context);
  
	// // Register task and debug event handlers, as well as sending telemetries
	// registerTeamsfxTaskAndDebugEvents();
  
	// registerRunIcon().catch(() => {
	//   // do nothing
	// });
  
	// Register teamsfx task provider
	// const taskProvider: TeamsfxTaskProvider = new TeamsfxTaskProvider();
	// context.subscriptions.push(
	//   vscode.tasks.registerTaskProvider(TeamsfxTaskProvider.type, taskProvider)
	// );
  
	// context.subscriptions.push(
	//   vscode.workspace.onWillSaveTextDocument(handlers.saveTextDocumentHandler)
	// );
  }

// This method is called when your extension is deactivated
export function deactivate() {}
