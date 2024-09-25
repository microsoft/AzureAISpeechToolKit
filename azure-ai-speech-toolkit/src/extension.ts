// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommandKey as CommandKeys, TerminalName, VSCodeCommands } from "./constants";
import * as handlers from "./handlers";
import { initializeGlobalVariables, isSpeechFxProject } from './globalVariables';
import { VSCodeUI } from './ui/ui';
import accountTreeViewProviderInstance from "./treeview/account/accountTreeViewProvider";
import { AzureAccountManager } from './common/azureLogin';
import TreeViewManagerInstance from "./treeview/treeViewManager";
import { isSpeechResourceSeleted } from './utils';
import { TreeViewCommand } from './treeview/treeViewCommand';

export let VS_CODE_UI: VSCodeUI;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "azure-ai-speech-toolkit" is now active!');

	VS_CODE_UI = new VSCodeUI(TerminalName);
	initializeGlobalVariables(context);

	const openSamples = vscode.commands.registerCommand(CommandKeys.OpenSamples, handlers.openSamplesHandler);
	context.subscriptions.push(openSamples);

	const configureResource = vscode.commands.registerCommand(CommandKeys.ConfigureResource, handlers.ConfigureResourcehandler);
	context.subscriptions.push(configureResource);

	const openDocument = vscode.commands.registerCommand(CommandKeys.OpenDocument, handlers.openDocumentHandler);
	context.subscriptions.push(openDocument);

	// README
	const openReadMe = vscode.commands.registerCommand(CommandKeys.OpenReadMe, handlers.openReadMeHandler);
	context.subscriptions.push(openReadMe);

	// const signInAzure = vscode.commands.registerCommand(CommandKeys.SigninAzure, handlers.signInAzureHandler);
	// context.subscriptions.push(signInAzure);

	// const signOutAzure = vscode.commands.registerCommand(CommandKeys.SignOutAzure, handlers.signOutAzureHandler);
	// context.subscriptions.push(signOutAzure);

	console.log("isSpeechFxProject", isSpeechFxProject);
	if (isSpeechFxProject) {
		activateSpeechFxRegistration(context);

		vscode.commands.executeCommand(CommandKeys.OpenReadMe);

		if (!isSpeechResourceSeleted()) {
			vscode.window.showInformationMessage(
				'Environment file not found. Would you like to configure a Speech Service?',
				'Configure a Speech Resource',
			).then(selection => {
				if (selection === 'Configure a Speech Resource') {
					vscode.commands.executeCommand(CommandKeys.ConfigureResource);
				}
			});
			// vscode.commands.executeCommand(CommandKeys.Provision);
		}
	}
	// UI is ready to show & interact
	await vscode.commands.executeCommand(VSCodeCommands.SetContext, "azure-ai-speech-toolkit.isSpeechFx", isSpeechFxProject);


	await vscode.commands.executeCommand(VSCodeCommands.SetContext, "azure-ai-speech-toolkit.initialized", true);
}

function activateSpeechFxRegistration(context: vscode.ExtensionContext) {
	// registerTreeViewCommandsInDevelopment(context);
	// registerTreeViewCommandsInLifecycle(context);
	// registerTreeViewCommandsInHelper(context);
	// registerTeamsFxCommands(context);
	// registerMenuCommands(context);
	// registerAccountMenuCommands(context);
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

// async function registerAccountMenuCommands(context: vscode.ExtensionContext) {
// 	// Register SignOut tree view command
// 	context.subscriptions.push(
// 		vscode.commands.registerCommand(CommandKeys.SignOutAzure, async (node: TreeViewCommand) => {
// 			try {
// 				switch (node.contextValue) {
// 					// case "signedinM365": {
// 					//   await Correlator.run(async () => {
// 					// 	await signOutM365(true);
// 					//   });
// 					//   break;
// 					// }
// 					case "signedinAzure": {
// 						vscode.window.showInformationMessage("Azure account Sign Out is moved to the Accounts section on the bottom left panel. To sign out of Azure, hover on your Azure account email and click Sign Out.");
// 						break;
// 					}
// 				}
// 			} catch (e) {
// 				console.error(e);
// 			}
// 		})
// 	);
// }
// This method is called when your extension is deactivated
export function deactivate() { }
