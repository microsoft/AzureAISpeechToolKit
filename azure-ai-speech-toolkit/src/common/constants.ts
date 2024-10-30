// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

export const signedIn = "SignedIn";
export const signedOut = "SignedOut";
export const signingIn = "SigningIn";
export const loggedOut = "LoggedOut";
export const loggedIn = "LoggedIn";
export const loggingIn = "LoggingIn";
export const switching = "Switching";
export const initializing = "Initializing";

export const m365CacheName = "m365";

export const extensionID = "TeamsDevApp.ms-teams-vscode-extension";
export const codeSpacesAuthComplete = "auth-complete";
export const vscodeRedirect = "https://vscode.dev/redirect";

export enum SummaryConstant {
  Succeeded = "(√) Done:",
  Failed = "(×) Error:",
  NotExecuted = "(!) Warning:",
  Warning = "(!) Warning:",
}


export const ConfigFolderName = "azureSpeech";
export const ProductName = "azureAISpeech";

export enum AzureResourceAccountType {
  SpeechServices = "SpeechServices",
  AIService = "AIServices",
  CognitiveServices = "CognitiveServices"
}

export enum AzureResourceDisplayName {
  SpeechService = "Speech Service",
  AIService = "Azure AI service",
  CognitiveServices = "Azure AI services multi-service account"
}
