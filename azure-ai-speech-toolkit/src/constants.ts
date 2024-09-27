// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum CommandKey {
  // Create = "azure-ai-speech-toolkit.create",
  // OpenWelcome = "azure-ai-speech-toolkit.openWelcome",
  // BuildIntelligentAppsWalkthrough = "azure-ai-speech-toolkit.buildIntelligentAppsWalkthrough",
  // CheckCopilotAccess = "azure-ai-speech-toolkit.checkCopilotAccess",
  OpenDocument = "azure-ai-speech-toolkit.openDocument",
  OpenSamples = "azure-ai-speech-toolkit.openSamples",
  DownloadSample = "azure-ai-speech-toolkit.downloadSample",
  // ValidateGetStartedPrerequisites = "azure-ai-speech-toolkit.validate-getStarted-prerequisites",
  OpenReadMe = "azure-ai-speech-toolkit.openReadMe",
  // DebugInTestToolFromMessage = "azure-ai-speech-toolkit.debugInTestToolFromMessage",
  // SigninM365 = "azure-ai-speech-toolkit.signinM365",
  // LocalDebug = "azure-ai-speech-toolkit.localdebug",
  // SigninAzure = "azure-ai-speech-toolkit.signinAzure",
  // SignOutAzure = "azure-ai-speech-toolkit.signOutAzure",
  ConfigureResource = "azure-ai-speech-toolkit.configureResource",
  BuildSampleApp = "azure-ai-speech-toolkit.buildSampleApp",
  RunSampleApp = "azure-ai-speech-toolkit.runSampleApp",
  // Deploy = "azure-ai-speech-toolkit.deploy",
  // Publish = "azure-ai-speech-toolkit.publish",
  // Preview = "azure-ai-speech-toolkit.preview",
  // installDependency = "azure-ai-speech-toolkit.installDependency",
  // publishToAppSource = "azure-ai-speech-toolkit.publishToAppSource",
  // openDeployLink = "azure-ai-speech-toolkit.officeDevDeploy",
  // openOfficeDevDocument = "azure-ai-speech-toolkit.openOfficeDevDocument",
}

export enum ContextKeys {
  IsSpeechFx = "azure-ai-speech-toolkit.isSpeechFx",
  Initialized = "azure-ai-speech-toolkit.initialized",
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
  // static readonly UTF8Encoding = "utf-8";
  // static readonly DeploymentResourceType = "Microsoft.Resources/deployments";
  // static readonly DeploymentNotFound = "DeploymentNotFound";
  static readonly RootFolder = "AzureAISpeechApps";
  static readonly EnvFolderName = ".env";
  static readonly EnvFileName = ".env.dev";
  static readonly AzureAISpeechAppYmlFileName = "azureAiSpeechApp.yml";
}

export enum TaskName {
  BuildApp = "Build the App",
  RunApp = "Run the App",
}