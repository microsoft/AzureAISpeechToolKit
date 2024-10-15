// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum CommandKey {
  CreateAzureAIService = "azure-ai-speech-toolkit.createAzureAIService",
  OpenDocument = "azure-ai-speech-toolkit.openDocument",
  OpenAzureAccountHelp = "azure-ai-speech-toolkit.openAzureAccountHelp",
  OpenSamples = "azure-ai-speech-toolkit.openSamples",
  DownloadSample = "azure-ai-speech-toolkit.downloadSample",
  OpenReadMe = "azure-ai-speech-toolkit.openReadMe",
  SigninAzure = "azure-ai-speech-toolkit.signinAzure",
  ConfigureResource = "azure-ai-speech-toolkit.configureResource",
  SelectResource = "azure-ai-speech-toolkit.selectResource",
  BuildApp = "azure-ai-speech-toolkit.buildApp",
  RunApp = "azure-ai-speech-toolkit.runApp",
  ViewSpeechResourceProperties = "azure-ai-speech-toolkit.viewSpeechResourceProperties",
}

export enum ViewId {
  ResourceView = "azure-ai-speech-toolkit-resources",
  SampleView = "azure-ai-speech-toolkit-samples"
}

export enum ContextKeys {
  IsSpeechFx = "azure-ai-speech-toolkit.isSpeechFx",
  Initialized = "azure-ai-speech-toolkit.initialized",
  IsLoadingAccountStatus = "azure-ai-speech-toolkit.isLoadingAccountStatus",
}

export enum VSCodeCommands {
  OpenFolder = "vscode.openFolder",
  OpenDocument = "vscode.open",
  MarkdownPreview = "markdown.showPreview",
  SetContext = "setContext",
}


export enum GlobalKey {
  SampleGalleryInitialSample = "teamsToolkit:sampleGallery:initialSample",
  OpenWalkThrough = "fx-extension.openWalkThrough",
  OpenReadMe = "fx-extension.openReadMe",
  OpenSampleReadMe = "fx-extension.openSampleReadMe",
  ShowLocalDebugMessage = "ShowLocalDebugMessage",
  CreateWarnings = "CreateWarnings",
  SampleGalleryLayout = "teamsToolkit:sampleGallery:layout",
  AutoInstallDependency = "teamsToolkit:autoInstallDependency",
}
export const AzureScopes = ["https://management.core.windows.net/user_impersonation"];
export const TerminalName = "Azure AI Speech Toolkit";

// Enum for environment keys
export enum EnvKeys {
  SpeechResourceKey = 'SPEECH_RESOURCE_KEY',
  ServiceRegion = 'SERVICE_REGION',
  AzureSubscriptionId = 'AZURE_SUBSCRIPTION_ID',
  TenantId = 'TENANT_ID',
  SpeechResourceName = 'SPEECH_RESOURCE_NAME',
  SpeechResourceSKU = 'SPEECH_RESOURCE_SKU',
}

export class ConstantString {
  static readonly RootFolder = "AzureAISpeechApps";
  static readonly EnvFolderName = ".env";
  static readonly EnvFileName = ".env.dev";
  static readonly AzureAISpeechAppYmlFileName = "azureAiSpeechApp.yml";
}

export enum TaskName {
  BuildApp = "Build the App",
  RunApp = "Run the App",
}