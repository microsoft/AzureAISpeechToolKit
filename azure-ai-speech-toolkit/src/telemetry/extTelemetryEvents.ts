// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum TelemetryEvent {
  AZURE_LOGIN = "azure-login",
  CREATE_AZURE_AI_SERVICE = "create-azure-ai-service",
  DOWNLOAD_SAMPLE = "download-sample",
  CONFIGURE_AND_SETUP_SAMPLE = "configure-and-setup-sample",
  BUILD_SAMPLE = "build-sample",
  RUN_SAMPLE = "run-sample",
  SURVEY = "survey",
}

export enum AzureLoginTelemetryProperty {
  SUCCESS = "success",
  ERROR_MESSAGE = "error_message"
}

export enum CreateAzureAIServiceTelemetryProperty {
  SUCCESS = "success",
  ERROR_MESSAGE = "error_message",
  AZURE_SUBSCRIPTION_ID = "azure_subscription_id",
  RESOURCE_GROUP = "resource_group",
  REGION = "region",
  NAME = "name",
  SKU = "sku"
}

export enum DownloadSampleTelemetryProperty {
  SUCCESS = "success",
  ERROR_MESSAGE = "error_message",
  SAMPLE_ID = "sample_id",
}

export enum SampleTaskTelemetryProperty {
  SUCCESS = "success",
  ERROR_MESSAGE = "error_message",
  AZURE_SUBSCRIPTION_ID = "azure_subscription_id",
  SPEECH_RESOURCE_NAME = "speech_resource_name",
  SAMPLE_ID = "sample_id"
}
