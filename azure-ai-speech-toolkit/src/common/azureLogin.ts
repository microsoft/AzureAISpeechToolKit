// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/no-empty-function */
"use strict";

import type { TokenCredential } from "@azure/core-auth";
import {
  AzureAccountProvider,
  AzureResourceGroupInfo,
  AzureSpeechResourceInfo,
  SubscriptionInfo,
} from "../api/login";
import { SingleSelectConfig } from "../api/ui";
import { OptionItem } from "../api/types";
import * as vscode from "vscode";
import { AzureResourceAccountType, loggedIn, loggedOut, loggingIn, signedIn, signedOut, signingIn } from "./constants";
import { login, LoginStatus } from "./login";
import * as util from "util";
import VsCodeLogInstance from "./log";
import { VS_CODE_UI } from "../extension";
import { AzureScopes, ExternalUrls } from "../constants";
import { globalStateGet, globalStateUpdate } from "./globalState";
import {
  Microsoft,
  VSCodeAzureSubscriptionProvider,
  getSessionFromVSCode,
} from "./vscodeAzureSubscriptionProvider";
import { createAzureAIServiceHandler } from "../handlers";

const showAzureSignOutHelp = "ShowAzureSignOutHelp";

export class AzureAccountManager extends login implements AzureAccountProvider {
  private static instance: AzureAccountManager;
  private static subscriptionId: string | undefined;
  private static subscriptionName: string | undefined;
  private static tenantId: string | undefined;
  private static currentStatus: string | undefined;
  private vscodeAzureSubscriptionProvider: VSCodeAzureSubscriptionProvider;

  private constructor() {
    super();
    this.vscodeAzureSubscriptionProvider = new VSCodeAzureSubscriptionProvider();
    void this.addStatusChangeEvent();
  }

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): AzureAccountManager {
    if (!AzureAccountManager.instance) {
      AzureAccountManager.instance = new AzureAccountManager();
    }

    return AzureAccountManager.instance;
  }

  /**
   * Async get identity [crendential](https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts)
   */
  async getIdentityCredentialAsync(showDialog = true): Promise<TokenCredential | undefined> {
    if (await this.isUserLogin()) {
      return this.doGetIdentityCredentialAsync();
    }
    await this.login(showDialog);
    return this.doGetIdentityCredentialAsync();
  }

  private async isUserLogin(): Promise<boolean> {
    const session = await getSessionFromVSCode(AzureScopes, undefined, {
      createIfNone: false,
      silent: true,
    });
    return session !== undefined;
  }

  private async login(showDialog: boolean): Promise<void> {
    if (showDialog) {
      const userConfirmation: boolean = await this.doesUserConfirmLogin();
      if (!userConfirmation) {
        // throw user cancel error
        throw new Error("[UserError] user cancel to login");
        // throw new UserError(
        //   "Login",
        //   ExtensionErrors.UserCancel,
        //   getDefaultString("teamstoolkit.common.userCancel"),
        //   localize("teamstoolkit.common.userCancel")
        // );
      }
    }

    // ExtTelemetry.sendTelemetryEvent(TelemetryEvent.LoginStart, {
    //   [TelemetryProperty.AccountType]: AccountType.Azure,
    // });
    try {
      AzureAccountManager.currentStatus = loggingIn;
      void this.notifyStatus();
      const session = await getSessionFromVSCode(AzureScopes, undefined, { createIfNone: true });
      if (session === undefined) {
        throw new Error("[UserError] loginTimeoutDescription");
        // throw new UserError(
        //   getDefaultString("teamstoolkit.codeFlowLogin.loginComponent"),
        //   getDefaultString("teamstoolkit.codeFlowLogin.loginTimeoutTitle"),
        //   getDefaultString("teamstoolkit.codeFlowLogin.loginTimeoutDescription"),
        //   localize("teamstoolkit.codeFlowLogin.loginTimeoutDescription")
        // );
      }
      if (await globalStateGet(showAzureSignOutHelp, true)) {
        void vscode.window
          .showInformationMessage(
            "Azure account Sign Out is moved to the Accounts section on the bottom left panel. To sign out of Azure, hover on your Azure account email and click Sign Out.",
            // localize("teamstoolkit.commands.azureAccount.signOutHelp"),
            "Got it"
          )
          .then(async (userClicked) => {
            if (userClicked === "Got it") {
              await globalStateUpdate(showAzureSignOutHelp, false);
            }
          });
      }
    } catch (e) {
      AzureAccountManager.currentStatus = loggedOut;
      void this.notifyStatus();
      if ((e as Error)?.message.includes("User did not consent ")) {
        // throw user cancel error
        throw new Error("[UserError] UserCancel");
        // throw new UserError(
        //   "Login",
        //   ExtensionErrors.UserCancel,
        //   getDefaultString("teamstoolkit.common.userCancel"),
        //   localize("teamstoolkit.common.userCancel")
        // );
      } else {
        throw e;
      }
    }
  }

  private async doGetIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    const tokenCredential = await this.doGetAccountCredentialAsync();
    if (tokenCredential) {
      return tokenCredential;
    } else {
      return Promise.reject(Error("doGetIdentityCredentialAsync error"));
    }
  }

  private async doGetAccountCredentialAsync(): Promise<TokenCredential | undefined> {
    if (await this.isUserLogin()) {
      const subs = await this.vscodeAzureSubscriptionProvider.getSubscriptions();
      if (subs.length > 0) {
        if (AzureAccountManager.tenantId) {
          for (let i = 0; i < subs.length; ++i) {
            const item = subs[i];
            if (item.tenantId == AzureAccountManager.tenantId) {
              return item.credential;
            }
          }
        }
        return subs[0].credential;
      } else {
        const session = await getSessionFromVSCode(AzureScopes, undefined, {
          createIfNone: false,
          silent: true,
        });
        const credential: TokenCredential = {
          // eslint-disable-next-line @typescript-eslint/require-await
          getToken: async () => {
            return {
              token: session!.accessToken,
              expiresOnTimestamp: 0,
            };
          },
        };
        return credential;
      }
    }
    return Promise.reject(Error("doGetAccountCredentialAsync error"));
  }

  private async doesUserConfirmLogin(): Promise<boolean> {
    const message = "The Azure AI Speech Toolkit will use Microsoft authentication to sign in Azure account and subscription to fetch Speech Resource Key and information for your project. You won't be charged until you confirm.";
    const signin = "Sign in";
    const learnMore = "Learn more";
    let userSelected: string | undefined;
    do {
      userSelected = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        signin,
        learnMore
      );
      if (userSelected === learnMore) {
        void vscode.env.openExternal(
          vscode.Uri.parse(
            ExternalUrls.CreateAzureSubscription
          )
        );
      }
    } while (userSelected === learnMore);

    return Promise.resolve(userSelected === signin);
  }

  private async doesUserConfirmSignout(): Promise<boolean> {
    const accountInfo = (await this.getStatus()).accountInfo;
    const email = (accountInfo as any).upn ? (accountInfo as any).upn : (accountInfo as any).email;
    const confirm = "Sign out";
    const userSelected: string | undefined = await vscode.window.showInformationMessage(
      util.format("Sign out of '%s'?", email),
      { modal: true },
      confirm
    );
    return Promise.resolve(userSelected === confirm);
  }

  async getJsonObject(showDialog = true): Promise<Record<string, unknown> | undefined> {
    const credential = await this.getIdentityCredentialAsync(showDialog);
    const token = await credential?.getToken("https://management.core.windows.net/.default");
    if (token) {
      const array = token.token.split(".");
      const buff = Buffer.from(array[1], "base64");
      return new Promise((resolve) => {
        resolve(JSON.parse(buff.toString("utf-8")));
      });
    } else {
      return new Promise((resolve) => {
        resolve(undefined);
      });
    }
  }

  /**
   * signout from Azure
   */
  async signout(): Promise<boolean> {
    const userConfirmation: boolean = await this.doesUserConfirmSignout();
    if (!userConfirmation) {
      // throw user cancel error
      throw new Error("[UserError] user cancel to sign out");
      //   throw new UserError(
      //     "SignOut",
      //     ExtensionErrors.UserCancel,
      //     getDefaultString("teamstoolkit.common.userCancel"),
      //     localize("teamstoolkit.common.userCancel")
      //   );
    }
    try {
      // todo
      // await vscode.commands.executeCommand("azure-account.logout");
      AzureAccountManager.tenantId = undefined;
      AzureAccountManager.subscriptionId = undefined;
      //   ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOut, {
      //     [TelemetryProperty.AccountType]: AccountType.Azure,
      //     [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      //   });
      return new Promise((resolve) => {
        resolve(true);
      });
    } catch (e) {
      VsCodeLogInstance.error("[Logout Azure] " + ((e as Error).message as string));
      //   ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.SignOut, e, {
      //     [TelemetryProperty.AccountType]: AccountType.Azure,
      //     [TelemetryProperty.Success]: TelemetrySuccess.No,
      //     [TelemetryProperty.ErrorType]:
      //       e instanceof UserError ? TelemetryErrorType.UserError : TelemetryErrorType.SystemError,
      //     [TelemetryProperty.ErrorCode]: `${e.source as string}.${e.name as string}`,
      //     [TelemetryProperty.ErrorMessage]: `${e.message as string}`,
      //   });
      return Promise.resolve(false);
    }
  }

  /**
   * list all subscriptions
   */
  public async listSubscriptions(): Promise<SubscriptionInfo[]> {
    const arr: SubscriptionInfo[] = [];
    if (await this.isUserLogin()) {
      const subs = await this.vscodeAzureSubscriptionProvider.getSubscriptions();
      for (let i = 0; i < subs.length; ++i) {
        const item = subs[i];
        arr.push({
          id: item.subscriptionId,
          tenantId: item.tenantId,
          name: item.name,
        });
      }
    }

    return arr;
  }

  public async listAzureServices(subscriptionInfo: SubscriptionInfo, types: AzureResourceAccountType[]): Promise<AzureSpeechResourceInfo[]> {
    let speechServices: AzureSpeechResourceInfo[] = [];
    if (await this.isUserLogin()) {
      speechServices = await this.vscodeAzureSubscriptionProvider.getAzureResourceListWithType(subscriptionInfo, types);
    }

    return speechServices;
  }

  /**
   * set tenantId and subscriptionId
   */
  async setSubscription(subscriptionId: string): Promise<void> {
    if (subscriptionId === "") {
      AzureAccountManager.tenantId = undefined;
      AzureAccountManager.subscriptionId = undefined;
      AzureAccountManager.subscriptionName = undefined;
      return;
    }
    if (await this.isUserLogin()) {
      const subs = await this.vscodeAzureSubscriptionProvider.getSubscriptions();
      for (let i = 0; i < subs.length; ++i) {
        const item = subs[i];
        if (item.subscriptionId === subscriptionId) {
          AzureAccountManager.tenantId = item.tenantId;
          AzureAccountManager.subscriptionId = subscriptionId;
          AzureAccountManager.subscriptionName = item.name;
          return;
        }
      }
    }
    return Promise.reject(
      new Error("[UserError] Login unknown subscription.")

      //   new UserError(
      //     "Login",
      //     ExtensionErrors.UnknownSubscription,
      //     getDefaultString("teamstoolkit.azureLogin.unknownSubscription"),
      //     localize("teamstoolkit.azureLogin.unknownSubscription")
      //   )
    );
  }

  public async getStatus(): Promise<LoginStatus> {
    try {
      if (AzureAccountManager.currentStatus === loggingIn) {
        return Promise.resolve({ status: signingIn, token: undefined, accountInfo: undefined });
      }
      if (AzureAccountManager.currentStatus === loggedIn || (await this.isUserLogin())) {
        const credential = await this.doGetIdentityCredentialAsync();
        const token = await credential?.getToken(AzureScopes);
        const accountJson = await this.getJsonObject();
        return Promise.resolve({
          status: signedIn,
          token: token?.token,
          accountInfo: accountJson,
        });
      } else {
        return Promise.resolve({ status: signedOut, token: undefined, accountInfo: undefined });
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async addStatusChangeEvent() {
    if (await this.isUserLogin()) {
      AzureAccountManager.currentStatus = loggedIn;
    }
    vscode.authentication.onDidChangeSessions(async (e) => {
      if (e.provider.id != Microsoft) {
        return;
      }
      if (await this.isUserLogin()) {
        AzureAccountManager.currentStatus = loggedIn;
        await this.notifyStatus();
      } else {
        AzureAccountManager.currentStatus = loggedOut;
        await this.notifyStatus();
      }
    });
  }

  public async clearSub() {
    await this.setSubscription("");
  }

  getAccountInfo(): Record<string, string> | undefined {
    if (AzureAccountManager.currentStatus === loggedIn) {
      return this.getJsonObject() as unknown as Record<string, string>;
    } else {
      return undefined;
    }
  }

  async fetchSpeechResourceKeyAndRegion(speechResourceInfo: AzureSpeechResourceInfo, resourceGroupName: string, speechResourceName: string): Promise<{ key: string | undefined, region: string | undefined, customSubDomainName: string | undefined }> {
    if (AzureAccountManager.currentStatus !== loggedIn) {
      throw new Error("can only fetch speech service details when logged in.");
    }
    const { key, region, customSubDomainName } = await this.vscodeAzureSubscriptionProvider.fetchSpeechResourceKeyAndRegion(speechResourceInfo, resourceGroupName, speechResourceName);
    return { key, region, customSubDomainName };
  }

  async getSelectedSubscription(triggerUI = false): Promise<SubscriptionInfo | undefined> {
    if (triggerUI) {
      if (AzureAccountManager.currentStatus !== loggedIn && !(await this.isUserLogin())) {
        console.log("User is not logged in when trying to get selected subscription. Logging in...");
        await this.login(true);
      }
    }
    if (AzureAccountManager.currentStatus === loggedIn) {
      await this.selectSubscription();

      const selectedSub: SubscriptionInfo = {
        id: AzureAccountManager.subscriptionId!,
        tenantId: AzureAccountManager.tenantId!,
        name: AzureAccountManager.subscriptionName ?? "",
      };
      return selectedSub;
    } else {
      return undefined;
    }
  }

  async getSelectedSpeechService(subscriptionInfo: SubscriptionInfo): Promise<AzureSpeechResourceInfo | undefined> {
    if (AzureAccountManager.currentStatus !== loggedIn) {
      throw new Error("can only select speech resource when logged in.");
    }

    const azureResourceAccountTypesToSelect = [AzureResourceAccountType.SpeechServices, AzureResourceAccountType.CognitiveServices, AzureResourceAccountType.AIService];

    const speechResourcesList = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Fetching Azure Speech Resources...',
      cancellable: false
    }, async (progress) => {
      return await this.listAzureServices(subscriptionInfo, azureResourceAccountTypesToSelect);
    });

    const createNewServiceOption: OptionItem = {
      id: "create-new-service",  // Unique ID for the new service option
      label: `$(plus) Create a new Azure AI Service`,
    };

    const options: OptionItem[] = [
      createNewServiceOption,
      ...speechResourcesList.map((speechService) => {
        return {
          id: speechService.id,
          label: `${speechService.name} (${speechService.accountType}, ${speechService.region}, ${speechService.sku})`,
        } as OptionItem;
      })];

    const config: SingleSelectConfig = {
      name: "Azure Speech Resource",
      title: "Select a Speech Resource",
      options: options,
    };
    const result = await VS_CODE_UI.selectOption(config);
    if (result.isErr()) {
      throw result.error;
    } else {
      const selectedSpeechServiceId = result.value.result as string;

      if (selectedSpeechServiceId === createNewServiceOption.id) {
        const newService = await createAzureAIServiceHandler(subscriptionInfo);
        return newService;
      }

      return speechResourcesList.find(service => service.id == selectedSpeechServiceId);
    }
  }

  async createAzureAIService(subscriptionInfo: SubscriptionInfo, resourceGroupName: string, region: string, serviceName: string, sku: string): Promise<AzureSpeechResourceInfo> {
    const azureResourceInfo = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Creating Azure AI Service... This can take a while...',
      cancellable: false
    }, async (progress) => {
      return await this.vscodeAzureSubscriptionProvider.createNewAIServiceResource(subscriptionInfo, resourceGroupName, region, serviceName, sku);
    });

    return azureResourceInfo;
  }

  async getSelectedRegion(subscriptionInfoInfo: SubscriptionInfo): Promise<string | undefined> {
    const availableRegionList = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Fetching available regions...',
      cancellable: false
    }, async (progress) => {
      return await this.vscodeAzureSubscriptionProvider.getAISpeechAvailableRegions(subscriptionInfoInfo);
    });

    const config: SingleSelectConfig = {
      name: "Region",
      title: "Select a region",
      options: availableRegionList.map((region) => {
        return {
          id: region,
          label: `${region}`,
        } as OptionItem;
      }),
    };

    const result = await VS_CODE_UI.selectOption(config);
    if (result.isErr()) {
      throw result.error;
    } else {
      return result.value.result as string;
    }
  }

  async getSelectedPricingTier(subscriptionInfo: SubscriptionInfo, location: string): Promise<string | undefined> {
    const pricingTierList = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Fetching available pricing tiers...',
      cancellable: false
    }, async (progress) => {
      return await this.vscodeAzureSubscriptionProvider.getAISpeechAvailablePricingTiers(subscriptionInfo, location);
    });

    if (pricingTierList.length == 0) {
      throw new Error("No pricing tier available for the selected region " + location);
    }

    const config: SingleSelectConfig = {
      name: "Pricing Tier",
      title: "Select a pricing tier",
      options: pricingTierList.map((pricingTier) => {
        return {
          id: pricingTier,
          label: `${pricingTier}`,
        } as OptionItem;
      }),
    };

    const result = await VS_CODE_UI.selectOption(config);
    if (result.isErr()) {
      throw result.error;
    } else {
      return result.value.result as string;
    }
  }

  async getSelectedResourceGroups(subscriptionInfo: SubscriptionInfo): Promise<string | undefined> {
    if (AzureAccountManager.currentStatus !== loggedIn) {
      throw new Error("can only select resource group when logged in.");
    }

    const resourceGroupsList = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Fetching resource group...',
      cancellable: false
    }, async (progress) => {
      return await this.vscodeAzureSubscriptionProvider.getResourceGroupListBySubscriptionId(subscriptionInfo);
    });

    const createNewResourceGroupOption: OptionItem = {
      id: "create-new-resource-group",  // Unique ID for the new resource group option
      label: `$(plus) Create a new Resource Group`,
    };

    const options: OptionItem[] = [
      createNewResourceGroupOption,
      ...resourceGroupsList.map((rg) => {
        return {
          id: rg.name,
          label: `${rg.name}`,
        } as OptionItem;
      })];

    const config: SingleSelectConfig = {
      name: "Resource Group",
      title: "Select a resource group",
      options: options,
    };
    const result = await VS_CODE_UI.selectOption(config);
    if (result.isErr()) {
      throw result.error;
    } else {
      const selectedResourceGroupId = result.value.result as string;

      if (selectedResourceGroupId === createNewResourceGroupOption.id) {
        const newResourceGroupName = await this.getResourceGroupNameFromUser(subscriptionInfo);
        return newResourceGroupName;
      }

      const resourceGroupInfo = resourceGroupsList.find(rg => rg.name == selectedResourceGroupId);
      return resourceGroupInfo?.name;
    }
  }

  async getResourceGroupNameFromUser(subscriptionInfo: SubscriptionInfo): Promise<string> {
    // Generate a default resource group name
    const timestamp = new Date().toISOString().replace(/[-:.T]/g, '').slice(0, 14); // Format: YYYYMMDDHHmmss
    const accountInfo = await this.getAccountInfo();
    let username = ((accountInfo?.email as string) || (accountInfo?.upn as string))?.split('@')[0];
    if (!username) {
      username = "dummy";
    }
    const defaultResourceGroupName = `${username}_speechaiproj_rg_${timestamp}`;

    // check if the user has permission to create a resource group. If lacks permission, throw error directly to terminate the process.
    await this.vscodeAzureSubscriptionProvider.checkResourceGroupExistence(subscriptionInfo, defaultResourceGroupName);

    // Define dropdown options
    const options: vscode.InputBoxOptions = {
      prompt: "Enter a resource group name or use the default one",
      placeHolder: defaultResourceGroupName,
      value: defaultResourceGroupName, // Set the default value
      validateInput: async (input) => {
        const validationError = await this.vscodeAzureSubscriptionProvider.isValidResourceGroupName(subscriptionInfo, input.trim());
        return validationError ? validationError : null;
      }
    };

    // Show input box to user with default and custom input option
    const resourceGroupName = await vscode.window.showInputBox(options);
    if (!resourceGroupName) {
      // Handle case where user cancels the input
      throw new Error("[UserError] user cancel to input resource group name");
    }

    return resourceGroupName.trim(); // Return the valid resource group name
  }

  async getNewAzureAIServiceNameFromUser(subscriptionInfo: SubscriptionInfo): Promise<string> {
    // Generate a default azure ai service name
    const timestamp = new Date().toISOString().replace(/[-:.T]/g, '').slice(0, 14); // Format: YYYYMMDDHHmmss
    const accountInfo = await this.getAccountInfo();
    let username = ((accountInfo?.email as string) || (accountInfo?.upn as string))?.split('@')[0];
    if (!username) {
      username = "dummy";
    }
    const defaultAIServiceName = `${username}-speechaiproj-ais-${timestamp}`;

    // Define dropdown options
    const options: vscode.InputBoxOptions = {
      prompt: "Enter a name for the Azure AI Service instance or use the default one",
      placeHolder: defaultAIServiceName,
      value: defaultAIServiceName, // Set the default value
      validateInput: async (input) => {
        // Validate the resource name
        const validationError = await this.vscodeAzureSubscriptionProvider.isValidAzureAIServiceResourceName(subscriptionInfo, input.trim());
        return validationError ? validationError : null;
      }
    };

    // Show input box to user with default and custom input option
    const resourceGroupName = await vscode.window.showInputBox(options);
    if (!resourceGroupName) {
      // Handle case where user cancels the input
      throw new Error("[UserError] user cancel to input resource group name");
    }

    return resourceGroupName.trim(); // Return the valid resource group name
  }

  async selectSubscription(): Promise<void> {
    const subscriptionList = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Fetching Azure subscriptions...',
      cancellable: false
    }, async () => {
      return await this.listSubscriptions();
    });

    if (!subscriptionList || subscriptionList.length == 0) {
      throw new Error("We couldn't find a subscription.");
    }

    if (subscriptionList && subscriptionList.length == 1) {
      await this.setSubscription(subscriptionList[0].id);
    } else if (subscriptionList.length > 1) {
      const options: OptionItem[] = subscriptionList.map((sub) => {
        return {
          id: sub.id,
          label: sub.name,
          data: sub.tenantId,
        } as OptionItem;
      });
      const config: SingleSelectConfig = {
        name: "subscription",
        title: "Select Subscription",
        options: options,
      };

      const result = await VS_CODE_UI.selectOption(config);
      if (result.isErr()) {
        throw result.error;
      } else {
        const subId = result.value.result as string;
        await this.setSubscription(subId);
      }
    }
  }
}

export default AzureAccountManager.getInstance();
