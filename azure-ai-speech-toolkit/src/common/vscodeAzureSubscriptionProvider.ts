// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SubscriptionClient, TenantIdDescription } from "@azure/arm-resources-subscriptions";
import { ResourceManagementClient } from "@azure/arm-resources";
import { CognitiveServicesManagementClient, Account, ResourceSku } from '@azure/arm-cognitiveservices';
import { TokenCredential } from "@azure/core-auth";
import * as vscode from "vscode";
import * as azureEnv from "@azure/ms-rest-azure-env";
import { AzureScopes } from "../constants";
import { Environment } from "@azure/ms-rest-azure-env";
import { AzureResourceGroupInfo, AzureSpeechResourceInfo, SubscriptionInfo } from "../api/login";
import { AzureResourceAccountType } from "./constants";
import { delay, getAzureResourceAccountTypeDisplayName } from "../utils";

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
    if (results.length === 0) {
      console.log("No subscriptions found.");
    }
    const sortSubscriptions = (subscriptions: AzureSubscription[]): AzureSubscription[] =>
      subscriptions.sort((a, b) => a.name.localeCompare(b.name));
    return sortSubscriptions(results);
  }

  public async fetchSpeechResourceKeyAndRegion(azureSpeechResourceInfo: AzureSpeechResourceInfo, resourceGroupName: string, speechResourceName: string): Promise<{ key: string | undefined, region: string | undefined, customSubDomainName: string | undefined }> {
    const credential = await getCredentialFromVSCodeSession(azureSpeechResourceInfo.tenantId, AzureScopes);
    const cognitiveClient = new CognitiveServicesManagementClient(credential, azureSpeechResourceInfo.subscriptionId);

    try {
      // Fetch Speech Resource details, including the region
      const speechService = await cognitiveClient.accounts.get(resourceGroupName, speechResourceName);

      // Fetch the keys for the Speech Service
      const keys = await cognitiveClient.accounts.listKeys(resourceGroupName, speechResourceName);
      const primaryKey = keys.key1;

      return {
        key: primaryKey,
        region: speechService.location,
        customSubDomainName: speechService.properties?.customSubDomainName
      };
    } catch (error) {
      throw new Error(`Unable to retrieve keys and region for Speech Resource: ${speechResourceName}. Error: ${error}`);
    }
  }

  public async getAzureResourceListWithType(subscriptionInfo: SubscriptionInfo, accountTypes: AzureResourceAccountType[]): Promise<AzureSpeechResourceInfo[]> {
    const credential = await getCredentialFromVSCodeSession(subscriptionInfo.tenantId, AzureScopes);
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

    // Sort azureResources by name
    azureResources.sort((a, b) => a.name.localeCompare(b.name));

    return azureResources;
  }

  public async getResourceGroupListBySubscriptionId(subscriptionInfo: SubscriptionInfo): Promise<AzureResourceGroupInfo[]> {
    const credential = await getCredentialFromVSCodeSession(subscriptionInfo.tenantId, AzureScopes);
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

  public async getAISpeechAvailablePricingTiers(subscriptionInfo: SubscriptionInfo, location: string): Promise<string[]> {
    const credential = await getCredentialFromVSCodeSession(subscriptionInfo.tenantId, AzureScopes);
    const client = new CognitiveServicesManagementClient(credential, subscriptionInfo.id);

    try {
      const availableSkus = await client.resourceSkus.list();
      // Fileter SKUs by the specified location
      const skusArray: ResourceSku[] = [];
      for await (const sku of availableSkus) {
        skusArray.push(sku);
      }

      location = location.replace(/\s+/g, '').toUpperCase();
      const skusInLocation = skusArray.filter(sku => sku.locations?.includes(location) && sku.kind === AzureResourceAccountType.AIService);

      return Array.from(new Set(skusInLocation.map(sku => `${sku.tier} ${sku.name}`)));
    } catch (error) {
      throw new Error(`Unable to retrieve available pricing tiers for Azure AI Service. Error: ${error}`);
    }
  }

  public async getAISpeechAvailableRegions(subscriptionInfo: SubscriptionInfo): Promise<string[]> {
    const credential = await getCredentialFromVSCodeSession(subscriptionInfo.tenantId, AzureScopes);
    const rmClient = new ResourceManagementClient(credential, subscriptionInfo.id);

    // Get available regions for Cognitive Services (Azure AI Service)
    const resourceProvider = await rmClient.providers.get("Microsoft.CognitiveServices");

    // Find the resource type for `accounts`
    const resourceType = resourceProvider.resourceTypes?.find(rt => rt.resourceType === 'accounts');
    if (resourceType && resourceType.locations) {
      return resourceType.locations;
    } else {
      throw new Error('Unable to retrieve available regions for Azure AI Service');
    }
  }

  public async isValidResourceGroupName(subscriptionInfo: SubscriptionInfo, resourceGroupName: string): Promise<string | null> {
    const lengthValid = resourceGroupName.length >= 1 && resourceGroupName.length <= 90;
    if (!lengthValid) {
      return "Resource group name must be between 1 and 90 characters long.";
    }

    const regexValid = /^[a-zA-Z0-9\._\-\(\)]+$/.test(resourceGroupName);
    if (!regexValid) {
      return "Resource group name can contain only alphanumeric characters, periods (.), underscores (_), hyphens (-), and parentheses (()).";
    }

    const notEndWithPeriod = !resourceGroupName.endsWith('.');
    if (!notEndWithPeriod) {
      return "Resource group name cannot end with a period.";
    }

    const hasExisted = await this.checkResourceGroupExistence(subscriptionInfo, resourceGroupName);
    if (hasExisted) {
      return "Resource group name already exists, please choose another name.";
    }

    return null;  // Name is valid
  }

  public async isValidAzureAIServiceResourceName(subscriptionInfo: SubscriptionInfo, serviceName: string): Promise<string | null> {
    const lengthValid = serviceName.length >= 1 && serviceName.length <= 63;
    const regexValid = /^[a-z0-9-]+$/.test(serviceName);
    const notStartOrEndWithHyphen = !serviceName.startsWith('-') && !serviceName.endsWith('-');
    const noConsecutiveHyphens = !serviceName.includes('--');

    if (!lengthValid) {
      return "AI Service instance name must be between 1 and 63 characters.";
    }
    if (!regexValid) {
      return "AI Service instance name can contain only lowercase letters, digits, and hyphens.";
    }
    if (!notStartOrEndWithHyphen) {
      return "AI Service instance name cannot start or end with a hyphen.";
    }
    if (!noConsecutiveHyphens) {
      return "AI Service instance name cannot contain consecutive hyphens.";
    }

    const hasExisted = await this.checkAIServiceExistence(subscriptionInfo, serviceName);
    if (hasExisted) {
      return "Resource group name already exists, please choose another name.";
    }

    return null;  // Name is valid
  }

  async checkAIServiceExistence(subscriptionInfo: SubscriptionInfo, serviceName: string): Promise<boolean> {
    const credential = await getCredentialFromVSCodeSession(subscriptionInfo.tenantId, AzureScopes);
    const cognitiveServicesClient = new CognitiveServicesManagementClient(credential, subscriptionInfo.id);

    try {
      // List all Cognitive Services accounts in the subscription
      const accountsIterator = await cognitiveServicesClient.accounts.list();

      // Collect all accounts from the iterator
      const accounts: Account[] = [];
      for await (const account of accountsIterator) {
        accounts.push(account);
      }

      const AIServiceWithSameName = accounts.filter(account => account.kind === AzureResourceAccountType.AIService && account.name === serviceName);

      if (AIServiceWithSameName.length > 0) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw new Error(`Unable to check resource existence: ${serviceName}. Error: ${error}`);
    }
  }

  async checkResourceGroupExistence(subscriptionInfo: SubscriptionInfo, resourceGroupName: string): Promise<boolean> {
    const credential = await getCredentialFromVSCodeSession(subscriptionInfo.tenantId, AzureScopes);
    const rmClient = new ResourceManagementClient(credential, subscriptionInfo.id);

    try {
      const result = await rmClient.resourceGroups.checkExistence(resourceGroupName);
      return (!!result.body);
    } catch (error) {
      throw new Error(`Unable to check resource group existence: ${resourceGroupName}. Error: ${error}`);
    }
  }

  public async ensureNewResourceGroup(subscriptionInfo: SubscriptionInfo, resourceGroupName: string, location: string): Promise<void> {
    const credential = await getCredentialFromVSCodeSession(subscriptionInfo.tenantId, AzureScopes);
    const rmClient = new ResourceManagementClient(credential, subscriptionInfo.id);

    try {
      // Check if the resource group exists
      const resourceGroup = await rmClient.resourceGroups.get(resourceGroupName);
      if (resourceGroup) {
        console.log(`Resource group '${resourceGroupName}' already exists.`);
        return;
      }
    } catch (error) {
      if ((error as any).statusCode === 404) {
        console.log(`Creating resource group: ${resourceGroupName} in location: ${location}`);
        await rmClient.resourceGroups.createOrUpdate(resourceGroupName, { location: location });
        console.log(`Successfully created resource group: ${resourceGroupName}`);
      }

      // Adding a delay or retry mechanism to ensure the resource group is fully available
      const maxRetries = 5;  // Max number of retries
      let retries = 0;

      while (retries < maxRetries) {
        try {
          // Wait for a short period before checking again
          await delay(3000);  // Wait for 3 seconds

          // Check if the resource group is now available
          const resourceGroupCheck = await rmClient.resourceGroups.get(resourceGroupName);
          if (resourceGroupCheck) {
            console.log(`Resource group '${resourceGroupName}' is now available.`);
            return;
          }
        } catch (retryError) {
          retries++;
          if (retries >= maxRetries) {
            throw new Error(`Unable to find resource group '${resourceGroupName}' after creation.`);
          }
        }
      }

      throw new Error(`Unable to check resource group existence: ${resourceGroupName}. Error: ${error}`);
    }
  }

  public async createNewAIServiceResource(subscriptionInfo: SubscriptionInfo, resourceGroupName: string, region: string, serviceName: string, sku: string): Promise<AzureSpeechResourceInfo> {
    const credential = await getCredentialFromVSCodeSession(subscriptionInfo.tenantId, AzureScopes);
    const cognitiveServicesClient = new CognitiveServicesManagementClient(credential, subscriptionInfo.id);

    const [skuTier, skuName] = sku.split(' ');
    // Prepare the parameters for the Speech resource
    const parameters = {
      location: region,
      sku: {
        name: skuName,
        tier: skuTier,
      },
      kind: AzureResourceAccountType.AIService, // Kind for Speech resource
      properties: {} // Any additional properties can be set here
    };

    try {
      await this.ensureNewResourceGroup(subscriptionInfo, resourceGroupName, region);

      const account = await cognitiveServicesClient.accounts.beginCreateAndWait(resourceGroupName, serviceName, parameters);
      const tenantId = subscriptionInfo.tenantId;

      const azurePortalUrl = `https://portal.azure.com/#@${tenantId}/resource${account.id}`;

      const openInAzurePortal = "Open in Azure Portal";
      await vscode.window.showInformationMessage(`Successfully created new AI Service resource: ${serviceName}.`, "Open in Azure Portal")
        .then(async (action) => {
          if (action === openInAzurePortal) {
            vscode.env.openExternal(vscode.Uri.parse(azurePortalUrl));
          }
        });

      console.log("Successfully created new AI Service account: ", account);
      return {
        id: account.id!,
        name: account.name!,
        subscriptionId: subscriptionInfo.id,
        subscriptionName: account.name!,
        tenantId: tenantId,
        region: account.location!,
        accountType: getAzureResourceAccountTypeDisplayName(account.kind! as AzureResourceAccountType),
        sku: account.sku!.name!
      };
    } catch (error) {
      throw new Error(`Unable to create AI Service resource: ${serviceName}. Error: ${error}`);
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
