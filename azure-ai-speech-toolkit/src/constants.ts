// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum CommandKeys {
  CreateAzureAIService = "azure-ai-speech-toolkit.createAzureAIService",
  OpenDocument = "azure-ai-speech-toolkit.openDocument",
  OpenAzureAccountHelp = "azure-ai-speech-toolkit.openAzureAccountHelp",
  OpenSamples = "azure-ai-speech-toolkit.openSamples",
  DownloadSample = "azure-ai-speech-toolkit.downloadSample",
  OpenReadMe = "azure-ai-speech-toolkit.openReadMe",
  SigninAzure = "azure-ai-speech-toolkit.signinAzure",
  ConfigureResource = "azure-ai-speech-toolkit.configureResource",
  SelectResource = "azure-ai-speech-toolkit.selectResource",
  ConfigureAndSetupApp = "azure-ai-speech-toolkit.ConfigureAndSetupApp",
  BuildApp = "azure-ai-speech-toolkit.buildApp",
  RunApp = "azure-ai-speech-toolkit.runApp",
  ViewSpeechResourceProperties = "azure-ai-speech-toolkit.viewSpeechResourceProperties",
  OpenSpeechResourceInAzurePortalUrl = "azure-ai-speech-toolkit.openInAzurePortal",
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
  CustomSubDomainName = 'CUSTOM_SUBDOMAIN_NAME',
}

export class ConstantString {
  static readonly RootFolder = "AzureAISpeechApps";
  static readonly EnvFolderName = ".env";
  static readonly EnvFileName = ".env.dev";
  static readonly AzureAISpeechAppYmlFileName = "azureAiSpeechApp.yml";
}

export enum TaskName {
  ConfigureAndSetupApp = "Configuration and Setup",
  BuildApp = "Build the App",
  RunApp = "Run the App",
}

export enum ExternalUrls {
  CreateAzureAccount = "https://go.microsoft.com/fwlink/?linkid=2293436", // https://azure.microsoft.com/free/cognitive-services
  OpenSpeechDocument = "https://go.microsoft.com/fwlink/?linkid=2292021", // https://learn.microsoft.com/en-us/azure/ai-services/speech-service/
  CreateAzureSubscription = "https://go.microsoft.com/fwlink/?linkid=2293519" // https://docs.microsoft.com/en-us/azure/cost-management-billing/manage/create-subscription
}