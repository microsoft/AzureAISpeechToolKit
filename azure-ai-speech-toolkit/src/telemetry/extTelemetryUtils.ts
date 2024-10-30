// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { DownloadSampleTelemetryProperty, AzureLoginTelemetryProperty, BuildAndRunSampleTelemetryProperty } from "../telemetry/extTelemetryEvents";
import { AzureAccountManager } from "../common/azureLogin";

export async function getAzureUserTelemetryProperties(): Promise<{ [p: string]: string }> {
    let azureAccountProvider = AzureAccountManager.getInstance();
    const accountInfo = await azureAccountProvider.getAccountInfo();
    const result: { [p: string]: string } = {};

    if (accountInfo) {
        for (const property of Object.values(AzureLoginTelemetryProperty)) {
            if (property in accountInfo) {
                result[property] = accountInfo[property];
            }
        }
    }

    return result;
}

export function getBuildAndRunProperties(envfilePath: string): { [p: string]: string } {
    const content = fs.readFileSync(envfilePath, 'utf-8');
    const lines = content.split('\n');
    const properties: { [p: string]: string } = {};
    lines.forEach(line => {
        const [key, value] = line.split('=').map(part => part.trim());
        if (key && value && key in BuildAndRunSampleTelemetryProperty) {
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

export async function getDownloadSampleTelemetryProperties(sampleId: string): Promise<{ [p: string]: string }> {
    const properties = await getAzureUserTelemetryProperties();
    properties[DownloadSampleTelemetryProperty.SAMPLE_ID] = sampleId;
    return properties;
}
