// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as extensionPackage from "../../package.json";
import TelemetryReporter from '@vscode/extension-telemetry';
import { globalStateGet, globalStateUpdate } from "./extTelemetryCache";

const TelemetryCacheKey = "TelemetryEvents";

export namespace ExtTelemetry {
  export let reporter: TelemetryReporter;

  export class Reporter extends vscode.Disposable {
    constructor(ctx: vscode.ExtensionContext) {
      super(() => reporter.dispose());

      reporter = new TelemetryReporter(
        extensionPackage.name,
        extensionPackage.version,
        extensionPackage.aiKey
      );
    }
  }

  export function sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
    reporter.sendTelemetryEvent(eventName, properties, measurements);
  }

  export async function cacheTelemetryEventAsync(
    eventName: string,
    properties?: { [p: string]: string }
  ) {
    const telemetryEvents = {
      eventName: eventName,
      properties: properties
    };
    const newValue = JSON.stringify(telemetryEvents);
    await globalStateUpdate(TelemetryCacheKey, newValue);
  }

  export async function sendCachedTelemetryEventsAsync() {
    const existingValue = (await globalStateGet(TelemetryCacheKey)) as string | undefined;
    if (existingValue) {
      try {
        const telemetryEvent = JSON.parse(existingValue) as {
          eventName: string;
          properties: { [p: string]: string } | undefined;
        };
        reporter.sendTelemetryEvent(telemetryEvent.eventName, telemetryEvent.properties);
      } catch (e) {}
      await globalStateUpdate(TelemetryCacheKey, undefined);
    }
  }

  export async function dispose() {
    await reporter.dispose();
  }
}
