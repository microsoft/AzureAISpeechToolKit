// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TelemetryEvent, AzureLoginTelemetryProperty, BuildAndRunSampleTelemetryProperty } from "../telemetry/extTelemetryEvents";
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

// export async function getDownloadSampleTelemetryProperties(sampleId: string): Promise<{ [p: string]: string }> {
//     const properties = await getAzureUserTelemetryProperties();
//     properties[TelemetryDownloadSampleProperty.SampleId] = sampleId;
//     return properties;
// }
