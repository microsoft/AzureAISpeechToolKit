// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { AzureResourceInfo, SubscriptionInfo, TokenProvider } from "../api/login";
import { AzureAccountManager } from "../common/azureLogin";
import * as path from 'path';
import { AzureResourceAccountType, AzureResourceDisplayName, signedOut } from "../common/constants";
import { ContextKeys, VSCodeCommands } from "../constants";

class ResourceTreeViewProvider implements vscode.TreeDataProvider<ResourceTreeItem> {
  private static instance: ResourceTreeViewProvider;
  private _onDidChangeTreeData: vscode.EventEmitter<ResourceTreeItem | undefined | void> =
    new vscode.EventEmitter<ResourceTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ResourceTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private constructor() { }

  public static getInstance() {
    if (!ResourceTreeViewProvider.instance) {
      ResourceTreeViewProvider.instance = new ResourceTreeViewProvider();
    }
    return ResourceTreeViewProvider.instance;
  }

  public subscribeToStatusChanges(tokenProvider: TokenProvider) {
    void tokenProvider.azureAccountProvider?.setStatusChangeMap(
      "tree-view",
      this.azureAccountStatusChangeHandler
    );
  }

  public getTreeItem(element: ResourceTreeItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: ResourceTreeItem): Promise<ResourceTreeItem[]> {
    const azureAccountProvider = AzureAccountManager.getInstance();

    if (!element) {
      const accountInfo = await azureAccountProvider.getStatus();

      // If not signed in, show original viewsWelcome page with sign-in button
      if (accountInfo.status === signedOut) {
        await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.isAzureAccountLoggedIn, false);

        return [];
      }

      // Root level: Get Azure subscriptions
      const subs = await azureAccountProvider.listSubscriptions();
      if (!subs || subs.length === 0) {
        return [];
      }

      // If signed in, show the resource tree view
      await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.isAzureAccountLoggedIn, true);

      const subItems = subs.map(sub => new ResourceTreeItem(sub.name!, sub.tenantId!, sub.id!, vscode.TreeItemCollapsibleState.Collapsed, SubscriptionItemType.Subscription, sub));
      return subItems;
    }
    else if (element.itemType === SubscriptionItemType.Subscription) {
      // Second level: Show resource types under each subscription
      const resourceTypes: ResourceTreeItem[] = [
        new ResourceTreeItem(AzureResourceDisplayName.AIService, element.tenantId, element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, AzureResourceTypeItemType.AIServiceType, element.azureResourceInfo),
        new ResourceTreeItem(AzureResourceDisplayName.CognitiveServices, element.tenantId, element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, AzureResourceTypeItemType.CognitiveServicesType, element.azureResourceInfo),
        new ResourceTreeItem(AzureResourceDisplayName.SpeechService, element.tenantId, element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, AzureResourceTypeItemType.SpeechServiceType, element.azureResourceInfo),
      ];
      return resourceTypes;
    }
    else if (isAzureResourceTypeItemType(element.itemType)) {
      const azureResources = await azureAccountProvider.listAzureServices((element.azureResourceInfo as SubscriptionInfo), [getAzureResourceAccountType(element.itemType)]);
      const azureResourceItems = azureResources.map(azureResource => new ResourceTreeItem(
        azureResource.name,
        azureResource.tenantId,
        azureResource.id,
        vscode.TreeItemCollapsibleState.None,
        getAzureResourceInstanceItemType(element.itemType),
        azureResource
      )).sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically by name;

      return azureResourceItems;
    } else {
      return [];
    }
  }


  private async azureAccountStatusChangeHandler(
    status: string,
    token?: string | undefined,
    accountInfo?: Record<string, unknown> | undefined
  ) {
    const instance = ResourceTreeViewProvider.getInstance();
    instance._onDidChangeTreeData.fire();
  }
}

export class ResourceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tenantId: string,
    public readonly subscriptionId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: AzureResourceTreeViewItemType,
    public readonly azureResourceInfo: AzureResourceInfo,
  ) {
    super(`${label}`, collapsibleState);

    // Tooltip and description
    this.tooltip = `${this.label} (${this.itemType}) - Subscription: ${this.subscriptionId}`;
    // this.description = this.subscriptionId ? `Subscription ID: ${this.subscriptionId}` : '';

    // Icon path based on the item type
    this.iconPath = this.getIconPath(itemType);

    // if (itemType == AzureResourceInstanceItemType.SpeechService || itemType == AzureResourceTreeViewItemType.AIService || itemType == AzureResourceTreeViewItemType.CognitiveServices) {
    if (isAzureResourceInstanceItemType(itemType)) {
      this.contextValue = 'speechResouceItem';
    }

    // this.checkboxState = vscode.TreeItemCheckboxState.Checked;
  }

  // Helper function to return the correct icon path
  private getIconPath(itemType: AzureResourceTreeViewItemType): { light: string; dark: string } {
    let iconName = 'subscription.png';
    switch (itemType) {
      case AzureResourceTypeItemType.SpeechServiceType:
      case AzureResourceInstanceItemType.SpeechService:
        iconName = 'speech-service-icon.png';
        break;
      case AzureResourceTypeItemType.AIServiceType:
      case AzureResourceInstanceItemType.AIService:
        iconName = 'azure-ai-service.png';
        break;

      case AzureResourceTypeItemType.CognitiveServicesType:
      case AzureResourceInstanceItemType.CognitiveServices:
        iconName = 'cognitive-service-icon.png';
        break;
    }
    const iconPathLight = path.join(__filename, '..', '..', '..', 'media', iconName); // For light theme
    const iconPathDark = path.join(__filename, '..', '..', '..', 'media', iconName); // For dark theme
    return { light: iconPathLight, dark: iconPathDark };
  }
}

export enum SubscriptionItemType {
  Subscription = 'SUBSCRIPTION',
}

export enum AzureResourceTypeItemType {
  SpeechServiceType = 'SPEECH_SERVICE_TYPE',
  AIServiceType = 'AI_SERVICE_TYPE',
  CognitiveServicesType = 'COGNITIVE_SERVICES_TYPE',
}

export enum AzureResourceInstanceItemType {
  CognitiveServices = 'COGNITIVE_SERVICES',
  SpeechService = 'SPEECH_SERVICE',
  AIService = 'AI_SERVICE',
}

export type AzureResourceTreeViewItemType =
  | SubscriptionItemType
  | AzureResourceTypeItemType
  | AzureResourceInstanceItemType;

function isAzureResourceTypeItemType(itemType: AzureResourceTreeViewItemType): boolean {
  return Object.values(AzureResourceTypeItemType).includes(itemType as AzureResourceTypeItemType);
}
export function isAzureResourceInstanceItemType(itemType: AzureResourceTreeViewItemType): boolean {
  return Object.values(AzureResourceInstanceItemType).includes(itemType as AzureResourceInstanceItemType);
}
function getAzureResourceAccountType(itemType: AzureResourceTreeViewItemType): AzureResourceAccountType {
  if (!isAzureResourceTypeItemType(itemType)) {
    throw new Error('Invalid AzureResourceTreeViewItemType: ' + itemType + ' is not a resource type');
  }
  switch (itemType) {
    case AzureResourceTypeItemType.AIServiceType:
      return AzureResourceAccountType.AIService;
    case AzureResourceTypeItemType.CognitiveServicesType:
      return AzureResourceAccountType.CognitiveServices;
    case AzureResourceTypeItemType.SpeechServiceType:
      return AzureResourceAccountType.SpeechServices;
    default:
      throw new Error('Invalid AzureResourceTreeViewItemType: ' + itemType);
  }
}
function getAzureResourceInstanceItemType(itemType: AzureResourceTreeViewItemType): AzureResourceInstanceItemType {
  if (!isAzureResourceTypeItemType(itemType)) {
    throw new Error('Invalid AzureResourceTreeViewItemType: ' + itemType + ' is not a resource type');
  }
  switch (itemType) {
    case AzureResourceTypeItemType.AIServiceType:
      return AzureResourceInstanceItemType.AIService;
    case AzureResourceTypeItemType.CognitiveServicesType:
      return AzureResourceInstanceItemType.CognitiveServices;
    case AzureResourceTypeItemType.SpeechServiceType:
      return AzureResourceInstanceItemType.SpeechService;
    default:
      throw new Error('Invalid AzureResourceTreeViewItemType: ' + itemType);
  }
}

export default ResourceTreeViewProvider.getInstance();
