// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommandKeys, ContextKeys, TaskName, TerminalName, VSCodeCommands } from "./constants";
import * as handlers from "./handlers";
import { initializeGlobalVariables, isSpeechFxProject } from './globalVariables';
import { VSCodeUI } from './ui/ui';
import accountTreeViewProviderInstance from "./treeview/account/accountTreeViewProvider";
import { AzureAccountManager } from './common/azureLogin';
import TreeViewManagerInstance from "./treeview/treeViewManager";
import { isSpeechResourceSeleted } from './utils';
import resourceTreeViewProvider from './treeview/resourceTreeViewProvider';
import { ExtTelemetry } from './telemetry/extTelemetry';
import { signedIn } from './common/constants';
import { ExtensionSurvey } from './utils/survey';

export let VS_CODE_UI: VSCodeUI;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "azure-ai-speech-toolkit" is now active!');

	context.subscriptions.push(new ExtTelemetry.Reporter(context));

	VS_CODE_UI = new VSCodeUI(TerminalName);
	initializeGlobalVariables(context);

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.OpenSamples, handlers.openSamplesHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.ConfigureResource, handlers.configureResourcehandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.SelectResource, handlers.configureResourcehandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.ConfigureAndSetupApp, () => handlers.taskHandler(TaskName.ConfigureAndSetupApp)));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.BuildApp, () => handlers.taskHandler(TaskName.BuildApp)));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.RunApp, () => handlers.taskHandler(TaskName.RunApp)));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.OpenDocument, handlers.openDocumentHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.OpenAzureAccountHelp, handlers.openAzureAccountHelpHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.OpenReadMe, handlers.openReadMeHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.SigninAzure, handlers.signInAzureHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.ViewSpeechResourceProperties, handlers.viewSpeechResourcePropertiesHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.OpenSpeechResourceInAzurePortal, handlers.openSpeechResourceInAzurePortalUrlHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.CreateAzureAIService, async () => {
			try {
				await handlers.createAzureAIServiceHandler();
			} catch (error) {
				console.error("Error executing createAzureAIServiceHandler command:", error);
				// TODO: if user cancels the operation, do not show error message
				// vscode.window.showErrorMessage("Failed to create Azure AI Service.");
			}
		}));

	// when first activate extension, azure account status is not loaded yet
	await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.azureAccountStatusLoaded, false);

	// UI is ready to show & interact
	await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.IsSpeechFx, isSpeechFxProject);

	await activateResourceTreeRegistration(context);

	// after loading a SpeechFx project, open the README.md file and ask user to configure a Speech Resource if not already selected.
	if (isSpeechFxProject) {
		await vscode.commands.executeCommand(CommandKeys.OpenReadMe);

		if (!isSpeechResourceSeleted()) {
			const ConfigureSpeechResourceOption = 'Configure Speech Resource';
			vscode.window.showInformationMessage(
				'Environment file not found. Would you like to configure a Speech Service?',
				ConfigureSpeechResourceOption,
			).then(selection => {
				if (selection === ConfigureSpeechResourceOption) {
					vscode.commands.executeCommand(CommandKeys.ConfigureResource);
				}
			});
		}
	}

	// Don't wait this async method to let it run in background.
	void runBackgroundAsyncTasks();

	await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.Initialized, true);
}

async function activateResourceTreeRegistration(context: vscode.ExtensionContext) {
	TreeViewManagerInstance.registerTreeViews(context);

	accountTreeViewProviderInstance.subscribeToStatusChanges({
		azureAccountProvider: AzureAccountManager.getInstance(),
	});

	resourceTreeViewProvider.subscribeToStatusChanges({
		azureAccountProvider: AzureAccountManager.getInstance(),
	});

	const azureAccountProvider = AzureAccountManager.getInstance();
	const accountInfo = await azureAccountProvider.getStatus();
	// set context to indicate that the account status has been loaded
	await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.azureAccountStatusLoaded, true);
	if (accountInfo.status === signedIn) {
		await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.isAzureAccountLoggedIn, true);
	}
}

/**
 * Tasks that doesn't block the user interaction so that they can be processed in background.
 */
async function runBackgroundAsyncTasks() {
	// Send cached telemetry events
	await ExtTelemetry.sendCachedTelemetryEventsAsync();

	// Survey
	const survey = ExtensionSurvey.getInstance();
	survey.activate();
}

// This method is called when your extension is deactivated
export async function deactivate() {
	await ExtTelemetry.dispose();
}
