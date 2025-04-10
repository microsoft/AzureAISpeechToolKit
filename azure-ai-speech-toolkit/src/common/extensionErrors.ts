// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// export const ExtensionSource = "Ext";

export enum ExtensionErrors {
    UserCancel = "UserCancel",
    LoginTimeout = "LoginTimeout",


    UnknwonError = "UnknwonError",
  UnsupportedOperation = "UnsupportedOperation",
  ConcurrentTriggerTask = "ConcurrentTriggerTask",
  EmptySelectOption = "EmptySelectOption",
  UnsupportedNodeType = "UnsupportedNodeType",
  UnknownSubscription = "UnknownSubscription",
  PortAlreadyInUse = "PortAlreadyInUse",
  PrerequisitesValidationError = "PrerequisitesValidationError",
  PrerequisitesNoM365AccountError = "PrerequisitesNoM365AccountError",
  PrerequisitesNoCopilotAccessError = "PrerequisitesNoCopilotAccessError",
  PrerequisitesSideloadingDisabledError = "PrerequisitesSideloadingDisabledError",
  PrerequisitesInstallPackagesError = "PrerequisitesPackageInstallError",
  DebugServiceFailedBeforeStartError = "DebugServiceFailedBeforeStartError",
  DebugTestToolFailedToStartError = "DebugTestToolFailedToStartError",
  DebugNpmInstallError = "DebugNpmInstallError",
  OpenExternalFailed = "OpenExternalFailed",
  FolderAlreadyExist = "FolderAlreadyExist",
  InvalidProject = "InvalidProject",
  InvalidArgs = "InvalidArgs",
  FetchSampleError = "FetchSampleError",
  EnvConfigNotFoundError = "EnvConfigNotFoundError",
  EnvStateNotFoundError = "EnvStateNotFoundError",
  EnvFileNotFoundError = "EnvFileNotFoundError",
  EnvResourceInfoNotFoundError = "EnvResourceInfoNotFoundError",
  NoWorkspaceError = "NoWorkSpaceError",
  UpdatePackageJsonError = "UpdatePackageJsonError",
  UpdateManifestError = "UpdateManifestError",
  UpdateCodeError = "UpdateCodeError",
  UpdateCodesError = "UpdateCodesError",
//   TeamsAppIdNotFoundError = "TeamsAppIdNotFoundError",
  TaskDefinitionError = "TaskDefinitionError",
  TaskCancelError = "TaskCancelError",
  NoTunnelServiceError = "NoTunnelServiceError",
  MultipleTunnelServiceError = "MultipleTunnelServiceError",
  NgrokStoppedError = "NgrokStoppedError",
  NgrokProcessError = "NgrokProcessError",
  NgrokNotFoundError = "NgrokNotFoundError",
  NgrokInstallationError = "NgrokInstallationError",
  TunnelServiceNotStartedError = "TunnelServiceNotStartedError",
  TunnelEndpointNotFoundError = "TunnelEndpointNotFoundError",
  TunnelEnvError = "TunnelEnvError",
  DevTunnelOperationError = "DevTunnelOperationError",
  StartTunnelError = "StartTunnelError",
  TunnelResourceLimitExceededError = "TunnelResourceLimitExceededError",
  NgrokTimeoutError = "NgrokTimeoutError",
//   LaunchTeamsWebClientError = "LaunchTeamsWebClientError",
  SetUpTabError = "SetUpTabError",
  SetUpBotError = "SetUpBotError",
  SetUpSSOError = "SetUpSSOError",
  PrepareManifestError = "PrepareManifestError",
  LoginCacheError = "LoginCacheError",
  DefaultManifestTemplateNotExistsError = "DefaultManifestTemplateNotExistsError",
  DefaultAppPackageNotExistsError = "DefaultAppPackageNotExistsError",
  DevTunnelStartError = "DevTunnelStartError",
//   LaunchTeamsDesktopClientError = "LaunchTeamsDesktopClientError",
}


export enum ErrorMessages {
    UserCancel = "User canceled.",
    LoginTimeout = "Login took too long. Please try again.",
    UnknownSubscription = "We're unable to set this subscription. Select a subscription you have access to.",
}

export enum ErrorSource {
    login = "Log In",
    logout = "Log Out",
}