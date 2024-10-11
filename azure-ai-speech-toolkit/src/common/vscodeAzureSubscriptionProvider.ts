// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SubscriptionClient, TenantIdDescription } from "@azure/arm-resources-subscriptions";
import { ResourceManagementClient } from "@azure/arm-resources";
import { CognitiveServicesManagementClient, Account } from '@azure/arm-cognitiveservices';
import { TokenCredential } from "@azure/core-auth";
import * as vscode from "vscode";
import * as azureEnv from "@azure/ms-rest-azure-env";
import { AzureScopes } from "../constants";
import { Environment } from "@azure/ms-rest-azure-env";
import { AzureResourceGroupInfo, AzureSpeechResourceInfo, SubscriptionInfo } from "../api/login";
import { AzureResourceAccountType } from "./constants";
import { getAzureResourceAccountTypeDisplayName } from "../utils";

export const Microsoft = "microsoft";

// Licensed under the MIT license.
export class VSCodeAzureSubscriptionProvider {

  private async getSubscriptionClient(
    tenantId?: string,
    scopes?: string[]
  ): Promise<{
    client: SubscriptionClient;
    credential: TokenCredential;
    authentication: AzureAuthentication;
  }> {
    const armSubs = await import("@azure/arm-resources-subscriptions");
    const session = await getSessionFromVSCode(scopes, tenantId, {
      createIfNone: false,
      silent: true,
    });
    if (!session) {
      return Promise.reject(Error("getSubscriptionClient error"));
    }

    const credential: TokenCredential = {
      // eslint-disable-next-line @typescript-eslint/require-await
      getToken: async () => {
        return {
          token: session.accessToken,
          expiresOnTimestamp: 0,
        };
      },
    };

    const configuredAzureEnv = getConfiguredAzureEnv();
    const endpoint = configuredAzureEnv.resourceManagerEndpointUrl;

    return {
      client: new armSubs.SubscriptionClient(credential, { endpoint }),
      credential: credential,
      authentication: {
        getSession: () => session,
      },
    };
  }

  /**
   * Gets a list of tenants available to the user.
   *
   * @returns A list of tenants.
   */
  public async getTenants(): Promise<TenantIdDescription[]> {
    const { client } = await this.getSubscriptionClient(undefined, AzureScopes);

    const results: TenantIdDescription[] = [];

    for await (const tenant of client.tenants.list()) {
      results.push(tenant);
    }

    return results;
  }

  /**
   * Gets a list of Azure subscriptions available to the user.
   */
  public async getSubscriptions(): Promise<AzureSubscription[]> {
    const results: AzureSubscription[] = [];

    for (const tenant of await this.getTenants()) {
      try {
        // Get the list of tenants
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tenantId = tenant.tenantId!;

        // For each tenant, get the list of subscriptions
        results.push(...(await this.getSubscriptionsForTenant(tenantId)));
      } catch (e) { }
    }
    const sortSubscriptions = (subscriptions: AzureSubscription[]): AzureSubscription[] =>
      subscriptions.sort((a, b) => a.name.localeCompare(b.name));
    return sortSubscriptions(results);
  }

  public async fetchSpeechResourceKeyAndRegion(subscriptionId: string, resourceGroupName: string, speechResourceName: string): Promise<{ key: string | undefined, region: string | undefined }> {
    const credential = await getCredentialFromVSCodeSession(undefined, AzureScopes);
    const cognitiveClient = new CognitiveServicesManagementClient(credential, subscriptionId);

    try {
      // Fetch Speech Resource details, including the region
      const speechService = await cognitiveClient.accounts.get(resourceGroupName, speechResourceName);
      const region = speechService.location;

      // Fetch the keys for the Speech Service
      const keys = await cognitiveClient.accounts.listKeys(resourceGroupName, speechResourceName);
      const primaryKey = keys.key1;

      return {
        key: primaryKey,
        region: region
      };
    } catch (error) {
      throw new Error(`Unable to retrieve keys and region for Speech Resource: ${speechResourceName}. Error: ${error}`);
    }
  }

  public async getAzureResourceListWithType(subscriptionInfo: SubscriptionInfo, accountTypes: AzureResourceAccountType[]): Promise<AzureSpeechResourceInfo[]> {
    const credential = await getCredentialFromVSCodeSession(undefined, AzureScopes);
    const cognitiveClient = new CognitiveServicesManagementClient(credential, subscriptionInfo.id);
    const accountsIterator = await cognitiveClient.accounts.list();

    // Collect all accounts from the iterator
    const accounts: Account[] = [];
    for await (const account of accountsIterator) {
      accounts.push(account);
    }

    const azureResourceAccounts = accounts.filter(account => accountTypes.includes(account.kind as AzureResourceAccountType));

    const azureResources: AzureSpeechResourceInfo[] = [];
    for (let i = 0; i < azureResourceAccounts.length; i++) {
      const item = azureResourceAccounts[i];
      if (i === 0) {
        console.log(item);
      }
      azureResources.push({
        id: item.id!,
        name: item.name!,
        subscriptionId: subscriptionInfo.id,
        subscriptionName: subscriptionInfo.name,
        tenantId: subscriptionInfo.tenantId,
        region: item.location!,
        accountType: getAzureResourceAccountTypeDisplayName(item.kind! as AzureResourceAccountType),
        sku: item.sku!.name!
      })
    }
    return azureResources;
  }

  public async getResourceGroupListBySubscriptionId(subscriptionInfo: SubscriptionInfo): Promise<AzureResourceGroupInfo[]> {
    const credential = await getCredentialFromVSCodeSession(undefined, AzureScopes);
    const rmClient = new ResourceManagementClient(credential, subscriptionInfo.id);

    try {
      const results: AzureResourceGroupInfo[] = [];
      const res = rmClient.resourceGroups.list();
      let result;
      do {
        result = await res.next();
        if (result.value?.name) results.push({ name: result.value.name, location: result.value.location });
      } while (!result.done);
      return results;

    } catch (error) {
      throw new Error(`Unable to retrieve resource groups for subscription: ${subscriptionInfo.name}. Error: ${error}`);
    }
  }

  public async checkResourceGroupExistence(subscriptionId: string, resourceGroupName: string): Promise<boolean> {
    const credential = await getCredentialFromVSCodeSession(undefined, AzureScopes);
    const rmClient = new ResourceManagementClient(credential, subscriptionId);

    try {
      const result = await rmClient.resourceGroups.checkExistence(resourceGroupName);
      return (!!result.body);
    } catch (error) {
      throw new Error(`Unable to check resource group existence: ${resourceGroupName}. Error: ${error}`);
    }
  }

  public async createNewResourceGroup(subscriptionInfo: SubscriptionInfo, resourceGroupName: string, location: string): Promise<void> {
    const credential = await getCredentialFromVSCodeSession(undefined, AzureScopes);
    const rmClient = new ResourceManagementClient(credential, subscriptionInfo.id);

    try {
      await rmClient.resourceGroups.createOrUpdate(resourceGroupName, { location: location });
    } catch (error) {
      throw new Error(`Unable to create resource group: ${resourceGroupName}. Error: ${error}`);
    }
  }


  /**
   * Gets the subscriptions for a given tenant.
   *
   * @param tenantId The tenant ID to get subscriptions for.
   *
   * @returns The list of subscriptions for the tenant.
   */
  private async getSubscriptionsForTenant(tenantId: string): Promise<AzureSubscription[]> {
    const { client, credential, authentication } = await this.getSubscriptionClient(
      tenantId,
      AzureScopes
    );
    const environment = getConfiguredAzureEnv();

    const subscriptions: AzureSubscription[] = [];

    for await (const subscription of client.subscriptions.list()) {
      subscriptions.push({
        authentication: authentication,
        environment: environment,
        credential: credential,
        isCustomCloud: environment.isCustomCloud,
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        name: subscription.displayName!,
        subscriptionId: subscription.subscriptionId!,
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        tenantId: tenantId,
      });
    }

    return subscriptions;
  }
}

export async function getSessionFromVSCode(
  scopes?: string | string[],
  tenantId?: string,
  options?: vscode.AuthenticationGetSessionOptions
): Promise<vscode.AuthenticationSession | undefined> {
  return await vscode.authentication.getSession(Microsoft, getScopes(scopes, tenantId), options);
}

function ensureEndingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function getResourceScopes(scopes?: string | string[]): string[] {
  if (scopes === undefined || scopes === "" || scopes.length === 0) {
    scopes = ensureEndingSlash(getConfiguredAzureEnv().managementEndpointUrl);
  }
  return Array.from(new Set<string>(scopes));
}

function addTenantIdScope(scopes: string[], tenantId: string): string[] {
  const scopeSet = new Set<string>(scopes);
  scopeSet.add(`VSCODE_TENANT:${tenantId}`);
  return Array.from(scopeSet);
}

function getScopes(scopes: string | string[] | undefined, tenantId?: string): string[] {
  let scopeArr = getResourceScopes(scopes);
  if (tenantId) {
    scopeArr = addTenantIdScope(scopeArr, tenantId);
  }
  return scopeArr;
}

async function getCredentialFromVSCodeSession(
  tenantId?: string,
  scopes?: string[]): Promise<TokenCredential> {
  const session = await getSessionFromVSCode(scopes, tenantId, {
    createIfNone: false,
    silent: true,
  });
  if (!session) {
    return Promise.reject(Error("Fail to get session from VS Code."));
  }

  const credential: TokenCredential = {
    // eslint-disable-next-line @typescript-eslint/require-await
    getToken: async () => {
      return {
        token: session.accessToken,
        expiresOnTimestamp: 0,
      };
    },
  };

  return credential;
}

/**
 * Represents a means of obtaining authentication data for an Azure subscription.
 */
export interface AzureAuthentication {
  /**
   * Gets a VS Code authentication session for an Azure subscription.
   *
   * @param scopes - The scopes for which the authentication is needed.
   *
   * @returns A VS Code authentication session or undefined, if none could be obtained.
   */
  getSession(scopes?: string[]): vscode.ProviderResult<vscode.AuthenticationSession>;
}

/**
 * Gets the configured Azure environment.
 *
 * @returns The configured Azure environment from the settings in the built-in authentication provider extension
 */
export function getConfiguredAzureEnv(): azureEnv.Environment & { isCustomCloud: boolean } {
  return {
    ...azureEnv.Environment.get(azureEnv.Environment.AzureCloud.name),
    isCustomCloud: false,
  };
}

/**
 * Represents an Azure subscription.
 */
export interface AzureSubscription {
  /**
   * Access to the authentication session associated with this subscription.
   */
  readonly authentication: AzureAuthentication;

  /**
   * The Azure environment to which this subscription belongs.
   */
  readonly environment: Environment;

  /**
   * Whether this subscription belongs to a custom cloud.
   */
  readonly isCustomCloud: boolean;

  /**
   * The display name of this subscription.
   */
  readonly name: string;

  /**
   * The ID of this subscription.
   */
  readonly subscriptionId: string;

  /**
   * The ID of the tenant to which this subscription belongs.
   */
  readonly tenantId: string;

  /**
   * The credential for authentication to this subscription. Compatible with Azure track 2 SDKs.
   */
  readonly credential: TokenCredential;
}
