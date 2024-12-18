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
  OPEN_DOCUMENT = "open-document",
  OPEN_AZURE_ACCOUNT_HELP = "open-azure-account-help",
  OPEN_SAMPLES = "open-samples",
  CONFIGURE_RESOURCE = "configure-resource",
  VIEW_SPEECH_RESOURCE_PROPERTIES = "view-speech-resource-properties",
  OPEN_SPEECH_RESOURCE_IN_AZURE_PORTAL_URL = "open-speech-resource-in-azure-portal-url",
}

export enum TelemetryProperty {
  SUCCESS = "success",
  ERROR_MESSAGE = "error_message",
  SAMPLE_ID = "sample_id",
  AZURE_SUBSCRIPTION_ID = "azure_subscription_id",
  RESOURCE_GROUP = "resource_group",
  SERVICE_REGION = "service_region",
  SPEECH_RESOURCE_SKU = "speech_resource_sku",
  SPEECH_RESOURCE_NAME = "speech_resource_name",
}