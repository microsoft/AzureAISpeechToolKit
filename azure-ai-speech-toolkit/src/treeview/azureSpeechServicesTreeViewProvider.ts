// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { TokenProvider } from "../api/login";
// import { DynamicNode } from "./dynamicNode";
// import envTreeProviderInstance from "../environmentTreeViewProvider";
import { AzureAccountNode } from "./account/azureNode";
import { AzureAccountManager } from "../common/azureLogin";
// import { M365AccountNode } from "./m365Node";
// import { AppStudioScopes } from "@microsoft/teamsfx-core";
// import { isSPFxProject } from "../../globalVariables";
import * as path from 'path'; 

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
    else {
      // Child level: Get Speech Services under each subscription
      if (!element.subscriptionId) {
        throw new Error("element label is undefine!");
      }
      
      const speechServices = await this.azureAccountProvider.listSpeechServices(element.subscriptionId);
      const speechServicesItems = speechServices.map(speechService => new SpeechServiceTreeItem(
        speechService.speechServiceName,
        speechService.speechServiceId,
        vscode.TreeItemCollapsibleState.None,
        ItemType.SpeechService
      ));
      return speechServicesItems;
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
      const iconName = itemType === ItemType.Subscription ? 'subscription.png' : 'speech-service-icon.png';
      const iconPathLight = path.join(__filename, '..', '..', '..', 'media', iconName); // For light theme
      const iconPathDark = path.join(__filename, '..', '..', '..', 'media', iconName); // For dark theme
      return { light: iconPathLight, dark: iconPathDark };
  }
}

enum ItemType {
  Subscription = 'SUBSCRIPTION',
  SpeechService = 'SPEECH_SERVICE'
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
