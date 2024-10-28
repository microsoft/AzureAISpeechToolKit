// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommandKey as CommandKeys, ContextKeys, TerminalName, VSCodeCommands } from "./constants";
import * as handlers from "./handlers";
import { initializeGlobalVariables, isSpeechFxProject } from './globalVariables';
import { VSCodeUI } from './ui/ui';
import accountTreeViewProviderInstance from "./treeview/account/accountTreeViewProvider";
import { AzureAccountManager } from './common/azureLogin';
import TreeViewManagerInstance from "./treeview/treeViewManager";
import { isSpeechResourceSeleted } from './utils';
import resourceTreeViewProvider from './treeview/resourceTreeViewProvider';
import TelemetryReporter from '@vscode/extension-telemetry';
import * as extensionPackage from "../package.json";

export let VS_CODE_UI: VSCodeUI;
export let telemetryReporter: TelemetryReporter;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "azure-ai-speech-toolkit" is now active!');

	telemetryReporter = new TelemetryReporter(extensionPackage.aiKey, extensionPackage.version, extensionPackage.name);
	context.subscriptions.push(telemetryReporter);

	VS_CODE_UI = new VSCodeUI(TerminalName);
	initializeGlobalVariables(context);

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.OpenSamples, handlers.openSamplesHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.ConfigureResource, handlers.configureResourcehandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.SelectResource, handlers.configureResourcehandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.BuildApp, handlers.buildAppHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.RunApp, handlers.runAppHandler));

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
		vscode.commands.registerCommand(CommandKeys.OpenSpeechResourceInAzurePortalUrl, handlers.OpenSpeechResourceInAzurePortalUrlHandler));

	context.subscriptions.push(
		vscode.commands.registerCommand(CommandKeys.CreateAzureAIService, handlers.createAzureAIServiceHandler));

	// set loading status as true for extension initialization to load account status
	await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.IsLoadingAccountStatus, true);

	// UI is ready to show & interact
	await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.IsSpeechFx, isSpeechFxProject);

	activateSpeechFxRegistration(context);

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

	await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.Initialized, true);
}

function activateSpeechFxRegistration(context: vscode.ExtensionContext) {
	TreeViewManagerInstance.registerTreeViews(context);

	accountTreeViewProviderInstance.subscribeToStatusChanges({
		azureAccountProvider: AzureAccountManager.getInstance(),
	});

	resourceTreeViewProvider.subscribeToStatusChanges({
		azureAccountProvider: AzureAccountManager.getInstance(),
	});
}

// This method is called when your extension is deactivated
export async function deactivate() {
	await telemetryReporter.dispose();
 }
