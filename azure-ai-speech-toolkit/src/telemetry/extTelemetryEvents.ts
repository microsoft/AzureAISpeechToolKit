// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryEvent {
  AzureLogin = "azure-login",
  BuildSample = "build-sample",
  RunSample = "run-sample"
}

export enum AzureLoginTelemetryProperty {
  IdType = "idtyp",
  Name = "name",
  AzureSubscriptionId = "oid",
  AzureTenantId = "tid",
  Email = "upn"
}

export enum BuildAndRunSampleTelemetryProperty {
  Success = "success",
  AzureSubscriptionId = "azure-subscription-id",
  SpeechResourceName = "speech-resource-name"
}
