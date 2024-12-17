// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { globalStateGet, globalStateUpdate } from "../common/globalState";
import { isValidProject } from "../globalVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as globalVariables from "../globalVariables";
import * as extensionPackage from "../../package.json";
import { VSCodeCommands } from "../constants";

const SURVEY_URL = "https://go.microsoft.com/fwlink/?linkid=2299680";

enum ExtensionSurveyStateKeys {
  DoNotShowAgain = "survey/doNotShowAgain",
  RemindMeLater = "survey/remindMeLater",
  DisableSurveyForTime = "survey/disableSurveyForTime",
}

const TIME_TO_DISABLE_SURVEY = 1000 * 60 * 60 * 24 * 7 * 12; // 12 weeks
const TIME_TO_REMIND_ME_LATER = 1000 * 60 * 60 * 24 * 7 * 2; // 2 weeks
const TIME_TO_SHOW_SURVEY = 1000 * 60 * 15; // 15 minutes
const SAMPLE_PERCENTAGE = 25; // 25 percent for public preview
const V3PREVIEW_SAMPLE_PERCENTAGE = 100; // always pop up survey
const V3PREVIEW_TIME_TO_DISABLE_SURVEY = -1; // negtive value stands for never show again
const V3PREVIEW_TIME_TO_REMIND_ME_LATER = 1000 * 60 * 60 * 1; // 1 hour

export class ExtensionSurvey {
  private timeToShowSurvey: number;
  private timeToDisableSurvey: number;
  private timeToRemindMeLater: number;
  private checkSurveyInterval?: NodeJS.Timeout;
  private showSurveyTimeout?: NodeJS.Timeout;
  private needToShow = false;
  private static instance: ExtensionSurvey;

  public static getInstance(): ExtensionSurvey {
    if (!ExtensionSurvey.instance) {
      ExtensionSurvey.instance = new ExtensionSurvey(
        TIME_TO_SHOW_SURVEY,
        SAMPLE_PERCENTAGE,
        TIME_TO_DISABLE_SURVEY,
        TIME_TO_REMIND_ME_LATER
      );
    }

    return ExtensionSurvey.instance;
  }

  private constructor(
    timeToShowSurvey?: number,
    samplePercentage?: number,
    timeToDisableSurvey?: number,
    timeToRemindMeLater?: number
  ) {
    this.timeToShowSurvey = timeToShowSurvey ? timeToShowSurvey : TIME_TO_SHOW_SURVEY;

    const randomSample: number = Math.floor(Math.random() * 100) + 1;
    if (randomSample <= (samplePercentage ? samplePercentage : SAMPLE_PERCENTAGE)) {
      this.needToShow = true;
    }

    this.timeToDisableSurvey = timeToDisableSurvey ? timeToDisableSurvey : TIME_TO_DISABLE_SURVEY;
    this.timeToRemindMeLater = timeToRemindMeLater ? timeToRemindMeLater : TIME_TO_REMIND_ME_LATER;
  }

  public activate(): void {
    if (this.needToShow && !this.checkSurveyInterval) {
      this.checkSurveyInterval = setInterval(async () => {
        if (!(await this.shouldShowBanner())) {
          return;
        }

        if (!this.showSurveyTimeout && isValidProject(globalVariables.workspaceUri?.fsPath)) {
          this.showSurveyTimeout = setTimeout(() => this.showSurvey(), this.timeToShowSurvey);
        }
      }, 2000);
    }
  }

  private async shouldShowBanner(): Promise<boolean> {
    const doNotShowAgain = await globalStateGet(ExtensionSurveyStateKeys.DoNotShowAgain, false);
    if (doNotShowAgain) {
      return false;
    }

    const currentTime = Date.now();
    const remindMeLaterTime = await globalStateGet(ExtensionSurveyStateKeys.RemindMeLater, 0);
    if (remindMeLaterTime > currentTime) {
      return false;
    }

    const disableSurveyForTime = await globalStateGet(
      ExtensionSurveyStateKeys.DisableSurveyForTime,
      0
    );
    if (disableSurveyForTime < 0 || disableSurveyForTime > currentTime) {
      return false;
    }

    return true;
  }

  public async openSurveyLink() {
    const link = `${SURVEY_URL}&o=${encodeURIComponent(process.platform)}&v=${encodeURIComponent(
      extensionPackage.version
    )}`;
    void vscode.commands.executeCommand(
      VSCodeCommands.OpenDocument,
      vscode.Uri.parse(link)
    );

    const disableSurveyForTime =
      this.timeToDisableSurvey < 0
        ? this.timeToDisableSurvey
        : Date.now() + this.timeToDisableSurvey;
    await globalStateUpdate(ExtensionSurveyStateKeys.DisableSurveyForTime, disableSurveyForTime);
  }

  private async showSurvey(): Promise<void> {
    const enum SurveyOptions {
      Take = "Take the Survey",
      Remind = "Remind Me Later",
      Never = "Don't Show Again",
    }

    const take = {
      title: SurveyOptions.Take,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SURVEY, {
          message: SurveyOptions.Take,
        });

        await this.openSurveyLink();
      },
    };

    const remind = {
      title: SurveyOptions.Remind,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SURVEY, {
          message: SurveyOptions.Remind,
        });
        const remindMeLaterTime = Date.now() + this.timeToRemindMeLater;
        await globalStateUpdate(ExtensionSurveyStateKeys.RemindMeLater, remindMeLaterTime);
      },
    };

    const never = {
      title: SurveyOptions.Never,
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SURVEY, {
          message: SurveyOptions.Never,
        });
        await globalStateUpdate(ExtensionSurveyStateKeys.DoNotShowAgain, true);
      },
    };

    const selection = await vscode.window.showInformationMessage(
      "Share your thoughts on the Azure AI Speech Toolkit! Your feedback helps us improve.",
      take,
      remind,
      never
    );

    if (this.showSurveyTimeout) {
      clearTimeout(this.showSurveyTimeout);
      this.showSurveyTimeout = undefined;
    }

    if (selection) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SURVEY, {
        message: `user asked`,
      });
      await selection.run();
    } else {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SURVEY, {
        message: "User canceled",
      });
      const remindMeLaterTime = Date.now() + this.timeToRemindMeLater;
      await globalStateUpdate(ExtensionSurveyStateKeys.RemindMeLater, remindMeLaterTime);
    }

    this.timeToShowSurvey = TIME_TO_REMIND_ME_LATER;
  }
}
