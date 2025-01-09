// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as TelemetryEvent from "../telemetry/extTelemetryEvents";

export function getTelemetryPropertiesFromEnvFile(envfilePath: string): { [p: string]: string } {
    const content = fs.readFileSync(envfilePath, 'utf-8');
    const lines = content.split('\n');
    const properties: { [p: string]: string } = {};
    lines.forEach(line => {
        const [key, value] = line.split('=').map(part => part.trim());
        if (key && value && key in TelemetryEvent.TelemetryProperty) {
            properties[(TelemetryEvent.TelemetryProperty as Record<string, string>)[key]] = value;
        }
    });

    return properties;
}

export function getSampleId(ymlFilePath: string) {
    const fileContents = fs.readFileSync(ymlFilePath, 'utf8');
    const data = yaml.load(fileContents) as { name: string; version: string };  
    return data.name;
}

