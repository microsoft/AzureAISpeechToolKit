// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryEvent {
  AzureLogin = "azure-login",
  DownloadSample = "download-sample",
  ConfigureAndSetupSample = "configure-and-setup-sample",
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

export enum DownloadSampleTelemetryProperty {
  SAMPLE_ID = "sample-id"
}

export enum BuildAndRunSampleTelemetryProperty {
  SUCCESS = "success",
  AZURE_SUBSCRIPTION_ID = "azure-subscription-id",
  SPEECH_RESOURCE_NAME = "speech-resource-name",
  SAMPLE_ID = "sample-id"
}
