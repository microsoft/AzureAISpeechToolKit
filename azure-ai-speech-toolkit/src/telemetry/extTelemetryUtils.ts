// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as TelemetryEvent from "../telemetry/extTelemetryEvents";

export function getSampleTaskTelemetryProperties(envfilePath: string): { [p: string]: string } {
    const content = fs.readFileSync(envfilePath, 'utf-8');
    const lines = content.split('\n');
    const properties: { [p: string]: string } = {};
    lines.forEach(line => {
        const [key, value] = line.split('=').map(part => part.trim());
        if (key && value && key in TelemetryEvent.SampleTaskTelemetryProperty) {
            properties[key] = value;
        }
    });

    return properties;
}

export function getSampleId(ymlFilePath: string) {
    const fileContents = fs.readFileSync(ymlFilePath, 'utf8');
    const data = yaml.load(fileContents) as { name: string; version: string };  
    return data.name;
}

export function getAzureLoginProperties(success: boolean, error: any): { [key: string]: string } {  
    const properties: { [key: string]: string } = {  
        [TelemetryEvent.AzureLoginTelemetryProperty.SUCCESS]: success.toString()  
    };  
  
    if (!success) {  
        properties[TelemetryEvent.AzureLoginTelemetryProperty.ERROR_MESSAGE] = error.message ? error.message : "Unknown";  
    }  
  
    return properties;  
}  

export function getCreateAzureAISpeechServiceProperties(
    success: boolean,
    error: any,
    azureSubscriptionId: string = "",
    resourceGroup: string = "",
    region: string = "",
    name: string = "",
    sku: string = ""
): { [key: string]: string } {
    const properties: { [key: string]: string } = {  
        [TelemetryEvent.CreateAzureAIServiceTelemetryProperty.SUCCESS]: success.toString()  
    };  

    if (success) {
        properties[TelemetryEvent.CreateAzureAIServiceTelemetryProperty.AZURE_SUBSCRIPTION_ID] = azureSubscriptionId;
        properties[TelemetryEvent.CreateAzureAIServiceTelemetryProperty.RESOURCE_GROUP] = resourceGroup;
        properties[TelemetryEvent.CreateAzureAIServiceTelemetryProperty.REGION] = region;
        properties[TelemetryEvent.CreateAzureAIServiceTelemetryProperty.NAME] = name;
        properties[TelemetryEvent.CreateAzureAIServiceTelemetryProperty.SKU] = sku;
    } else {
        properties[TelemetryEvent.CreateAzureAIServiceTelemetryProperty.ERROR_MESSAGE] = error.message ? error.message : "Unknown";
    }

    return properties;
}