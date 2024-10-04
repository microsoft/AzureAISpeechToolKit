// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { AzureResourceInfo, SubscriptionInfo, TokenProvider } from "../api/login";
import { AzureAccountManager } from "../common/azureLogin";
import * as path from 'path';
import { AzureResourceAccountType, signedOut } from "../common/constants";

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
        return [];
      }

      // Root level: Get Azure subscriptions
      const subs = await azureAccountProvider.listSubscriptions();
      const subItems = subs.map(sub => new ResourceTreeItem(sub.name!, sub.tenantId!, sub.id!, vscode.TreeItemCollapsibleState.Collapsed, AzureResourceTreeViewItemType.Subscription, sub));
      return subItems;
    }
    else if (element.itemType === AzureResourceTreeViewItemType.Subscription) {
      // Second level: Show resource types under each subscription
      const resourceTypes: ResourceTreeItem[] = [
        new ResourceTreeItem("Speech Services", element.tenantId, element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, AzureResourceTreeViewItemType.SpeechServiceType, element.azureResourceInfo),
        new ResourceTreeItem("AI Services", element.tenantId, element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, AzureResourceTreeViewItemType.AIServiceType, element.azureResourceInfo),
      ];
      return resourceTypes;
    }
    else {
      // Third level: Show certain type Services under the subscription
      let resourceTypes: AzureResourceAccountType[] = [];
      // let resourceTypeToDisplay: ItemType;
      switch (element.itemType) {
        case AzureResourceTreeViewItemType.AIServiceType:
          // AI Services include Cognitive Services and AI Service
          resourceTypes = [AzureResourceAccountType.AIService, AzureResourceAccountType.CognitiveServices];
          break;
        case AzureResourceTreeViewItemType.SpeechServiceType:
          resourceTypes = [AzureResourceAccountType.SpeechServices];
          break;
      }
      const azureResources = await azureAccountProvider.listAzureServices((element.azureResourceInfo as SubscriptionInfo), resourceTypes);
      const azureResourceItems = azureResources.map(azureResource => new ResourceTreeItem(
        azureResource.name,
        azureResource.tenantId,
        azureResource.id,
        vscode.TreeItemCollapsibleState.None,
        element.itemType === AzureResourceTreeViewItemType.SpeechServiceType ? AzureResourceTreeViewItemType.SpeechService : AzureResourceTreeViewItemType.AIService,
        azureResource
      ));

      return azureResourceItems;
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

    if (itemType == AzureResourceTreeViewItemType.SpeechService || itemType == AzureResourceTreeViewItemType.AIService) {
      this.contextValue = 'speechResouceItem';
    }

    // this.checkboxState = vscode.TreeItemCheckboxState.Checked;
  }

  // Helper function to return the correct icon path
  private getIconPath(itemType: AzureResourceTreeViewItemType): { light: string; dark: string } {
    let iconName = 'subscription.png';
    switch (itemType) {
      case AzureResourceTreeViewItemType.SpeechServiceType:
      case AzureResourceTreeViewItemType.SpeechService:
        iconName = 'speech-service-icon.png';
        break;
      case AzureResourceTreeViewItemType.AIServiceType:
      case AzureResourceTreeViewItemType.AIService:
        iconName = 'azure-ai-service.png';
        break;
    }
    const iconPathLight = path.join(__filename, '..', '..', '..', 'media', iconName); // For light theme
    const iconPathDark = path.join(__filename, '..', '..', '..', 'media', iconName); // For dark theme
    return { light: iconPathLight, dark: iconPathDark };
  }
}

export enum AzureResourceTreeViewItemType {
  Subscription = 'SUBSCRIPTION',
  SpeechServiceType = 'SPEECH_SERVICE_TYPE',
  AIServiceType = 'AI_SERVICE_TYPE',
  SpeechService = 'SPEECH_SERVICE',
  AIService = 'AI_SERVICE',
}


export default ResourceTreeViewProvider.getInstance();
