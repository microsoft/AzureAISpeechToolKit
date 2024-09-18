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
import { AzureResourceAccountType } from "../common/constants";

class azureSpeechServicesTreeViewProvider implements vscode.TreeDataProvider<SpeechServiceTreeItem> {
  private static instance: azureSpeechServicesTreeViewProvider;
  private _onDidChangeTreeData: vscode.EventEmitter<SpeechServiceTreeItem | undefined | void> =
    new vscode.EventEmitter<SpeechServiceTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SpeechServiceTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  // public m365AccountNode = new M365AccountNode(this._onDidChangeTreeData);
  // public azureAccountNode = new AzureAccountNode(this._onDidChangeTreeData);
  private azureAccountProvider = AzureAccountManager.getInstance();

  private constructor() {}

  public static getInstance() {
    if (!azureSpeechServicesTreeViewProvider.instance) {
      azureSpeechServicesTreeViewProvider.instance = new azureSpeechServicesTreeViewProvider();
    }
    return azureSpeechServicesTreeViewProvider.instance;
  }

  // public subscribeToStatusChanges(tokenProvider: TokenProvider) {
  //   // void tokenProvider.m365TokenProvider?.setStatusChangeMap(
  //   //   "tree-view",
  //   //   { scopes: AppStudioScopes },
  //   //   (status, token, accountInfo) =>
  //   //     m365AccountStatusChangeHandler("appStudio", status, token, accountInfo)
  //   // );
  //   void tokenProvider.azureAccountProvider?.setStatusChangeMap(
  //     "tree-view",
  //     azureAccountStatusChangeHandler
  //   );
  // }

  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: SpeechServiceTreeItem):Promise<SpeechServiceTreeItem[]> {
    if (!element) {
      // Root level: Get Azure subscriptions
      const subs = await this.azureAccountProvider.listSubscriptions();
      const subItems = subs.map(sub => new SpeechServiceTreeItem(sub.subscriptionName!, sub.subscriptionId!, vscode.TreeItemCollapsibleState.Collapsed, ItemType.Subscription));
      return subItems;
    }
    else if (element.itemType === ItemType.Subscription) {
      // Second level: Show resource types under each subscription
      const resourceTypes: SpeechServiceTreeItem[] = [
          new SpeechServiceTreeItem("Speech Services", element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, ItemType.SpeechService),
          new SpeechServiceTreeItem("AI Services", element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, ItemType.AIService),
          new SpeechServiceTreeItem("Cognitive Services", element.subscriptionId, vscode.TreeItemCollapsibleState.Collapsed, ItemType.AIServiceMultiServiceAccount)
      ];
      return resourceTypes;
    }
    else {
      // Third level: Show certain type Services under the subscription
      let resourceType = AzureResourceAccountType.SpeechServices;
      switch (element.itemType) {
        case ItemType.AIService:
          resourceType = AzureResourceAccountType.AIService;
          break;
        case ItemType.AIServiceMultiServiceAccount:
          resourceType = AzureResourceAccountType.CognitiveServices;
          break;
      }
      const azureResources = await this.azureAccountProvider.listAzureServices(element.subscriptionId, resourceType);
      const azureResourceItems = azureResources.map(azureResource => new SpeechServiceTreeItem(
        azureResource.name,
        azureResource.id,
        vscode.TreeItemCollapsibleState.None,
        element.itemType
      ));

      return azureResourceItems;
    }
  }
}

class SpeechServiceTreeItem extends vscode.TreeItem {
  constructor(
      public readonly label: string,
      public readonly subscriptionId: string,
      public readonly collapsibleState: vscode.TreeItemCollapsibleState,
      public readonly itemType: ItemType
  ) {
      super(label, collapsibleState);
      this.tooltip = `${this.label}`;
      // this.description = this.subscriptionId ? `Subscription ID: ${this.subscriptionId}` : '';
      this.iconPath = this.getIconPath(itemType);
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
      case ItemType.AIServiceMultiServiceAccount:
        iconName = 'azure-ai-service-multiservice-account.png';
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
  AIServiceMultiServiceAccount = 'AI_SERVICE_MULTI_SERVICE_ACCOUNT'
}
// async function m365AccountStatusChangeHandler(
//   source: string,
//   status: string,
//   token?: string | undefined,
//   accountInfo?: Record<string, unknown> | undefined
// ) {
//   const instance = AccountTreeViewProvider.getInstance();
//   if (status === "SignedIn") {
//     if (accountInfo) {
//       instance.m365AccountNode.setSignedIn(
//         (accountInfo.upn as string) ? (accountInfo.upn as string) : ""
//       );
//       if (token && source === "appStudio") {
//         instance.m365AccountNode.updateChecks(token, true, true);
//       }
//     }
//   } else if (status === "SigningIn") {
//     instance.m365AccountNode.setSigningIn();
//   } else if (status === "SignedOut") {
//     instance.m365AccountNode.setSignedOut();
//   } else if (status == "Switching") {
//     instance.m365AccountNode.setSwitching();
//   }
//   await envTreeProviderInstance.reloadEnvironments();
//   return Promise.resolve();
// }

// async function azureAccountStatusChangeHandler(
//   status: string,
//   token?: string | undefined,
//   accountInfo?: Record<string, unknown> | undefined
// ) {
//   const instance = azureSpeechServicesTreeViewProvider.getInstance();
//   if (status === "SignedIn") {
//     const username = (accountInfo?.email as string) || (accountInfo?.upn as string);
//     if (username) {
//       instance.azureAccountNode.setSignedIn(username);
//       // await envTreeProviderInstance.reloadEnvironments();
//     }
//   } else if (status === "SigningIn") {
//     instance.azureAccountNode.setSigningIn();
//   } else if (status === "SignedOut") {
//     instance.azureAccountNode.setSignedOut();
//     // await envTreeProviderInstance.reloadEnvironments();
//   }
//   return Promise.resolve();
// }

export default azureSpeechServicesTreeViewProvider.getInstance();
