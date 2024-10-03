// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { AzureResourceInfo, TokenProvider } from "../api/login";
// import { DynamicNode } from "./dynamicNode";
// import envTreeProviderInstance from "../environmentTreeViewProvider";
import { AzureAccountNode } from "./account/azureNode";
import { AzureAccountManager } from "../common/azureLogin";
// import { M365AccountNode } from "./m365Node";
// import { AppStudioScopes } from "@microsoft/teamsfx-core";
// import { isSPFxProject } from "../../globalVariables";
import * as path from 'path';
import { AzureResourceAccountType, signedIn, signedOut, signingIn } from "../common/constants";

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

  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
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
      const subItems = subs.map(sub => new ResourceTreeItem(sub.subscriptionName!, sub.subscriptionId!, vscode.TreeItemCollapsibleState.Collapsed, ItemType.Subscription));
      return subItems;
    }
    else if (element.itemType === ItemType.Subscription) {
      // Second level: Show resource types under each subscription
      const resourceTypes: ResourceTreeItem[] = [
        new ResourceTreeItem("Speech Services", element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, ItemType.SpeechService),
        new ResourceTreeItem("AI Services", element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, ItemType.AIService),
      ];
      return resourceTypes;
    }
    else {
      // Third level: Show certain type Services under the subscription
      let resourceType: AzureResourceAccountType[] = [];
      switch (element.itemType) {
        case ItemType.AIService:
          // AI Services include Cognitive Services and AI Service
          resourceType = [AzureResourceAccountType.AIService, AzureResourceAccountType.CognitiveServices];
          break;
        case ItemType.SpeechService:
          resourceType = [AzureResourceAccountType.SpeechServices];
          break;
      }
      const azureResources = await azureAccountProvider.listAzureServices(element.subscriptionId, resourceType);
      const azureResourceItems = azureResources.map(azureResource => new ResourceTreeItem(
        azureResource.name,
        azureResource.id,
        vscode.TreeItemCollapsibleState.None,
        element.itemType
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

class ResourceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly subscriptionId: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: ItemType
  ) {
    super(`${label}`, collapsibleState);
    this.tooltip = `${this.label}`;
    // this.description = this.subscriptionId ? `Subscription ID: ${this.subscriptionId}` : '';
    this.iconPath = this.getIconPath(itemType);
    // this.checkboxState = vscode.TreeItemCheckboxState.Checked;
  }

  // Helper function to return the correct icon path
  private getIconPath(itemType: ItemType): { light: string; dark: string } {
    let iconName = 'subscription.png';
    switch (itemType) {
      case ItemType.SpeechService:
        iconName = 'speech-service-icon.png';
        break;
      case ItemType.AIService:
        iconName = 'azure-ai-service.png';
        break;
    }
    const iconPathLight = path.join(__filename, '..', '..', '..', 'media', iconName); // For light theme
    const iconPathDark = path.join(__filename, '..', '..', '..', 'media', iconName); // For dark theme
    return { light: iconPathLight, dark: iconPathDark };
  }
}

enum ItemType {
  Subscription = 'SUBSCRIPTION',
  SpeechService = 'SPEECH_SERVICE',
  AIService = 'AI_SERVICE',
}


export default ResourceTreeViewProvider.getInstance();
