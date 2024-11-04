// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryEvent {
  DOWNLOAD_SAMPLE = "download-sample",
  CONFIGURE_AND_SETUP_SAMPLE = "configure-and-setup-sample",
  BUILD_SAMPLE = "build-sample",
  RUN_SAMPLE = "run-sample"
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
