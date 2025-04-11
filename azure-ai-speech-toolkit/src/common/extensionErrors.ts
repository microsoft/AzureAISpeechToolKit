// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const ExtensionSource = "Extension";

export enum ErrorNames {
  UserCancel = "UserCancel",
  LoginTimeout = "LoginTimeout",
  MissingKeyOrRegion = "MissingKeyOrRegion",
  UnknownSubscription = "UnknownSubscription",
  UpdateConfigJsonFileError = "UpdateConfigJsonFileError",
  MissingAzureSpeechResource = "MissingAzureSpeechResource",
  InvalidResourceType = "InvalidResourceType",
  EmptySubscriptionInAccount = "EmptySubscriptionInAccount",
  InvalidArgs = "InvalidArgs",
  EmptyFolderSelected = "EmptyFolderSelected",
  InvalidLoginStatus = "InvalidLoginStatus",
  NoPricingTierAvailableInRegion = "NoPricingTierAvailableInRegion",
  FailedToGetSpeechResourceKeyAndRegion = "FailedToFetchSpeechServiceInfo",
  FailedToGetResourceGroupListBySubscriptionId = "FailedToGetResourceGroupListBySubscriptionId",
  FailedToGetSpeechServiceAvailablePricingTiers = "FailedToGetSpeechServiceAvailablePricingTiers",
  FailedToGetSpeechServiceAvailableRegions = "FailedToGetSpeechServiceAvailableRegions",
  FailedToCheckResourceExistence = "FailedToCheckResourceExistence",
  AuthorizationError = "AuthorizationError",
  FailedToCheckResourceGroupExistence = "FailedToCheckResourceGroupExistence",
  FailedToCreateResource = "FailedToCreateResource",
}


export enum ErrorMessages {
  UserCancelSignIn = "User canceled to sign in.",
  UserCancelSignOut = "User canceled to sign out.",
  LoginTimeout = "Login took too long. Please try again.",
  UnknownSubscription = "We're unable to set this subscription. Select a subscription you have access to.",
  MissingKeyOrRegion = "Missing key or region.",
  UpdateConfigJsonFileError = "Failed to update config.json file.",
  MissingAzureSpeechResource = "Missing Azure speech resource information.",
  InvalidResourceType = "Invalid resource type: ",
  EmptySubscriptionInAccount = "Empty subscription found in azure account.",
  InValidSampleId = "Invalid sample id: ",
  EmptyFolderSelected = "No folder is selected.",
  InvalidLoginStatusFetchingSpeechServiceInfo = "Invalid login status. You can only fetch speech service information when you are logged in.",
  InvalidLoginStatusSelectingResourceGroup = "Invalid login status. You can only select resource group when you are logged in.",
  UserCancelInputResourceGroupName = "User canceled to input resource group name.",
  NoPricingTierAvailableInRegion = "No pricing tier available in the selected region: ",
  FailedToGetSpeechResourceKeyAndRegion = "Failed to fetch key and region for Azure speech resource: ",
  FailedToGetResourceGroupListBySubscriptionId = "Failed to get resource group list by subscription: ",
  FailedToGetAISpeechAvailablePricingTiers = "Failed to get available pricing tiers for Azure speech resource.",
  FailedToGetSpeechServiceAvailableRegions = "Failed to get available regions for Azure speech resource.",
  FailedToCheckResourceExistence = "Failed to check resource existence with name: ",
  AuthorizationErrorWhenCheckingResourceGroupExistence = "You do not have permission to check resource group existence. Resource group name: ",
  FailedToCheckResourceGroupExistence = "Failed to check resource group existence with name: ",
  FailedToCreateCognitiveServiceResource = "Failed to create cognitive service resource with name: ",
}
