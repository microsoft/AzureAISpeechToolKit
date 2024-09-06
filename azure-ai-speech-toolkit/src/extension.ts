// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommandKey as CommandKeys } from "./constants";
import * as handlers from "./handlers";
import { initializeGlobalVariables } from './globalVariables';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "azure-ai-speech-toolkit" is now active!');

	initializeGlobalVariables(context);

	const openSamples = vscode.commands.registerCommand(CommandKeys.OpenSamples, handlers.openSamplesHandler);
	context.subscriptions.push(openSamples);

	await vscode.commands.executeCommand("setContext", "azure-ai-speech-toolkit.initialized", true);
}

// This method is called when your extension is deactivated
export function deactivate() {}
