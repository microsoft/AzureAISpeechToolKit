import * as os from "os";
import * as fs from "fs-extra";
import * as vscode from "vscode";
import axios from "axios";
const path = require('node:path');
import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";
import { sendRequestWithRetry } from "./common/requestUtils";
import { SampleInfo } from "./controls/sampleGallery/ISamples";
import { SampleUrlInfo, SampleFileInfo } from "./common/samples";
import * as globalVariables from "./globalVariables";
import { AzureAccountManager } from "./common/azureLogin";
import { CommandKeys, ConstantString, EnvKeys, ExternalUrls, TaskName, VSCodeCommands } from "./constants";
import { AzureSpeechResourceInfo, SubscriptionInfo } from "./api/login";
import { VS_CODE_UI } from "./extension";
import { extractEnvValue, fetchSpeechServiceKeyAndRegion, isSpeechResourceSeleted, openDocumentInNewColumn } from "./utils";
import { AzureResourceTreeViewItemType, ResourceTreeItem } from "./treeview/resourceTreeViewProvider";

export async function createAzureAIServiceHandler(...args: unknown[]): Promise<AzureSpeechResourceInfo | undefined> {
  let subscriptionInfo: SubscriptionInfo;
  if (args.length > 0) {
    subscriptionInfo = args[0] as SubscriptionInfo;
  } else {
    console.log("No subscription info passed in. Ask user to select subscription.");
    return;
  }

  try {
    const azureAccountProvider = AzureAccountManager.getInstance();

    const resourceGroupName = await azureAccountProvider.getSelectedResourceGroups(subscriptionInfo);
    if (!resourceGroupName) {
      return;
    }

    const region = await azureAccountProvider.getSelectedRegion(subscriptionInfo.id);
    if (!region) {
      return;
    }

    const name = await azureAccountProvider.getNewAzureAIServiceNameFromUser(subscriptionInfo.id);
    if (!name) {
      return;
    }

    const sku = await azureAccountProvider.getSelectedPricingTier(subscriptionInfo, region);
    if (!sku) {
      return;
    }

    console.log("Creating Azure AI Service with subscription: " + subscriptionInfo.id + ", resource group: " + resourceGroupName + ", region: " + region + ", name: " + name + ", sku: " + sku);
    const azureResourceInfo = await azureAccountProvider.createAzureAIService(subscriptionInfo, resourceGroupName, region, name, sku);
    console.log("Azure AI Service created: ", azureResourceInfo);

    return azureResourceInfo;
  } catch (error) {
    console.error("Fail to create Azure AI Service: ", error);
    if (error instanceof Error && error.message.startsWith("[UserError]")) {
      return;
    }

    vscode.window.showErrorMessage('Fail to create Azure AI Service: ' + error);
  }
}

export async function signInAzureHandler(...args: unknown[]) {
  const azureAccountProvider = AzureAccountManager.getInstance();
  try {
    await azureAccountProvider.getIdentityCredentialAsync(true);
  } catch (error) {
    vscode.window.showErrorMessage("Fail to sign in Azure: " + error);
  }
  return;
}

export async function OpenSpeechResourceInAzurePortalUrlHandler(resourceItem: ResourceTreeItem, ...args: unknown[]) {
  const azurePortalUrl = `https://portal.azure.com/#@${resourceItem.tenantId}/resource${resourceItem.azureResourceInfo.id}`;
  vscode.env.openExternal(vscode.Uri.parse(azurePortalUrl));
}

export async function viewSpeechResourcePropertiesHandler(resourceItem: ResourceTreeItem, ...args: unknown[]) {
  let properties = "";
  try {
    properties = await getSpeechResourcePropertiesByResourceItem(resourceItem);
  } catch (error) {
    vscode.window.showErrorMessage("Fail to get speech resource properties: " + error);
    return;
  }

  // Create an untitled file and show it in the editor
  if (properties) {
    const document = await vscode.workspace.openTextDocument({ content: properties, language: 'shellscript' });
    await vscode.window.showTextDocument(document);
  }
}

async function getSpeechResourcePropertiesByResourceItem(resourceItem: ResourceTreeItem): Promise<string> {
  if (resourceItem.itemType !== AzureResourceTreeViewItemType.SpeechService && resourceItem.itemType !== AzureResourceTreeViewItemType.AIService) {
    throw new Error("Invalid resource type: " + resourceItem.itemType);
  }

  const azureSpeechResourceInfo = resourceItem.azureResourceInfo as AzureSpeechResourceInfo;
  if (!azureSpeechResourceInfo) {
    throw new Error("Missing azure speech resource info.");
  }

  return await getSpeechResourceProperties(azureSpeechResourceInfo);
}

async function getSpeechResourceProperties(azureSpeechResourceInfo: AzureSpeechResourceInfo): Promise<string> {
  const { key, region } = await fetchSpeechServiceKeyAndRegion(azureSpeechResourceInfo);
  const properties = [
    `SPEECH_RESOURCE_KEY=${key}`,
    `SERVICE_REGION=${region}`,
    `AZURE_SUBSCRIPTION_ID=${azureSpeechResourceInfo.subscriptionId}`,
    `TENANT_ID=${azureSpeechResourceInfo.tenantId}`,
    `SPEECH_RESOURCE_NAME=${azureSpeechResourceInfo.name}`,
    `SPEECH_RESOURCE_SKU=${azureSpeechResourceInfo.sku}`
  ].join('\n');
  return properties;
}

export async function taskHandler(taskName: TaskName, ...args: unknown[]) {
  if (!globalVariables.isSpeechFxProject) {
    console.log(`Not a speech project. Skip executing task ${taskName}.`);
    return;
  }

  const task = await findTaskWithName(taskName);

  // Check if the requested task exists
  if (!task) {
    const nextAvailableTaskName = await getNextAvailableTask(taskName);

    if (nextAvailableTaskName) {
      const message = `No "${taskName}" task found. Would you like to ${nextAvailableTaskName === TaskName.BuildApp ? 'build' : 'run'} the app directly?`;
      const selection = await vscode.window.showInformationMessage(message, 'Yes', 'No');
      if (selection === 'Yes') {
        await taskHandler(nextAvailableTaskName);
      }
    } else {
      vscode.window.showErrorMessage(`No "${taskName}" task found. Check your .vscode/tasks.json file.`);
    }
    return;
  }

  vscode.window.showInformationMessage(`Executing task: ${taskName}. Check terminal for output.`);
  const execution = await vscode.tasks.executeTask(task);

  // Task completion handler to determine the next task intelligently
  const disposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
    if (e.execution === execution) {
      disposable.dispose();

      if (e.exitCode === 0) {
        const nextTaskName = await getNextAvailableTask(taskName);

        if (nextTaskName) {
          const nextTaskMessage = `${taskName} completed successfully. Would you like to ${nextTaskName === TaskName.BuildApp ? 'build' : 'run'} the app?`;
          const selection = await vscode.window.showInformationMessage(nextTaskMessage, 'Yes', 'No');
          if (selection === 'Yes') {
            await taskHandler(nextTaskName);
          }
        } else {
          vscode.window.showInformationMessage(`${taskName} completed successfully.`);
        }
      } else {
        vscode.window.showErrorMessage(`${taskName} failed. Please check the terminal output for errors.`);
      }
    }
  });
}

async function findTaskWithName(taskName: TaskName): Promise<vscode.Task | undefined> {
  const tasks = await vscode.tasks.fetchTasks();
  const taskFound = tasks.find(task => task.name === taskName);
  return taskFound;
}

// Helper function to find the next available task. Task sequence: ConfigureAndSetupApp -> BuildApp -> RunApp
async function getNextAvailableTask(currentTaskName: TaskName | null): Promise<TaskName | null> {
  if (!currentTaskName) {
    const configureAndSetupAppTask = await findTaskWithName(TaskName.ConfigureAndSetupApp);
    if (configureAndSetupAppTask) return TaskName.ConfigureAndSetupApp;

    const buildTask = await findTaskWithName(TaskName.BuildApp);
    if (buildTask) return TaskName.BuildApp;

    const runTask = await findTaskWithName(TaskName.RunApp);
    if (runTask) return TaskName.RunApp;
  }

  if (currentTaskName === TaskName.ConfigureAndSetupApp) {
    const buildTask = await findTaskWithName(TaskName.BuildApp);
    if (buildTask) return TaskName.BuildApp;

    const runTask = await findTaskWithName(TaskName.RunApp);
    if (runTask) return TaskName.RunApp;
  } else if (currentTaskName === TaskName.BuildApp) {
    const runTask = await findTaskWithName(TaskName.RunApp);
    if (runTask) return TaskName.RunApp;
  } else if (currentTaskName === TaskName.RunApp) {
    return null;
  }

  return null;
}

export async function openSamplesHandler(...args: unknown[]) {
  WebviewPanel.createOrShow(PanelType.SampleGallery, args);
  return;
}

export async function openDocumentHandler(...args: unknown[]) {
  vscode.env.openExternal(vscode.Uri.parse(ExternalUrls.OpenSpeechDocument));
  return;
}

export async function openAzureAccountHelpHandler(...args: unknown[]) {
  vscode.env.openExternal(vscode.Uri.parse(ExternalUrls.CreateAzureAccount));
  return;
}

export async function configureResourcehandler(resourceItem: ResourceTreeItem, ...args: unknown[]) {
  if (isSpeechResourceSeleted()) {
    if (!(await doesUserConfirmReConfigureSpeechResource())) {
      return;
    }
  }

  const workspaceFolder = globalVariables.workspaceUri?.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  let envFilePath = "";
  let properties = "";

  if (resourceItem) {
    // configure speech resource from selected resource item
    properties = await getSpeechResourcePropertiesByResourceItem(resourceItem);

    envFilePath = await updateEnvfileAndOpen(workspaceFolder, properties);

  } else {
    // configure speech resource from dropdown menu selection
    try {
      const subscriptionInfo = await askUserForSubscription();
      const speechServiceInfo = await askUserForSpeechResource(subscriptionInfo);
      if (!speechServiceInfo) {
        // Fail to find a speech service.
        return;
      }
      properties = await getSpeechResourceProperties(speechServiceInfo);

      envFilePath = await updateEnvfileAndOpen(workspaceFolder, properties);

    } catch (error) {
      vscode.window.showErrorMessage('Fail to configure speech resource: ' + error);
      return;
    }
  }

  try {
    // Update the config.json file with the new values.
    const key = extractEnvValue(properties, EnvKeys.SpeechResourceKey);
    const region = extractEnvValue(properties, EnvKeys.ServiceRegion);
    if (!key || !region) {
      vscode.window.showErrorMessage('Fail to configure speech resource. Missing key or region.');
      return;
    }
    updateConfigJsonWithKeyAndRegion(workspaceFolder, key, region);
  } catch (error) {
    vscode.window.showErrorMessage('Fail to update config.json file: ' + error);
    return;
  }

  // Step 5: execute available tasks if any exists.
  const nextAvailableTaskName = await getNextAvailableTask(null);
  if (nextAvailableTaskName) {
    let nextAction = 'Configure and Setup';
    let nextCommand = CommandKeys.ConfigureAndSetupApp;
    switch (nextAvailableTaskName) {
      case TaskName.BuildApp:
        nextAction = 'build';
        nextCommand = CommandKeys.BuildApp;
        break;
      case TaskName.RunApp:
        nextAction = 'run';
        nextCommand = CommandKeys.RunApp;
        break;
    }
    const nextTaskMessage = `Successfully updated environment file ${envFilePath}. Would you like to ${nextAction} the app?`;
    vscode.window.showInformationMessage(nextTaskMessage, 'Yes')
      .then(selection => {
        if (selection === 'Yes') {
          vscode.commands.executeCommand(nextCommand);
        }
      });
  } else {
    vscode.window.showInformationMessage('Successfully updated environment file ' + envFilePath + '.');
  }
}

async function doesUserConfirmReConfigureSpeechResource(): Promise<boolean> {
  const message = "Speech service configuration already exists. Are you sure you want to reconfigure it?";
  const yes = "Yes";
  let userSelected: string | undefined;
  // do {
  userSelected = await vscode.window.showInformationMessage(
    message,
    { modal: true },
    yes
  );
  return Promise.resolve(userSelected === yes);
}

async function updateEnvfileAndOpen(workspaceFolder: string, content: string): Promise<string> {
  // ensure env folder exists
  const envFolderPath = path.join(workspaceFolder, ConstantString.EnvFolderName);
  if (!fs.existsSync(envFolderPath)) {
    fs.mkdirSync(envFolderPath);
  }

  const envFilePath = path.join(envFolderPath, ConstantString.EnvFileName);

  fs.writeFileSync(envFilePath, content);
  await openDocumentInNewColumn(envFilePath);

  return envFilePath;
}

function updateConfigJsonWithKeyAndRegion(workspaceFolder: string, key: string, region: string) {
  const configFilePath = path.join(workspaceFolder, 'config.json');
  if (fs.existsSync(configFilePath)) {
    let configContent = fs.readFileSync(configFilePath, 'utf8');
    const configJson = JSON.parse(configContent);

    if (configJson.SubscriptionKey) {
      configJson.SubscriptionKey = key;
    }
    if (configJson.ServiceRegion) {
      configJson.ServiceRegion = region;
    }

    configContent = JSON.stringify(configJson, null, 2);
    fs.writeFileSync(configFilePath, configContent);
    vscode.window.showInformationMessage(configFilePath + " file updated successfully.");
  }

}

export async function openReadMeHandler(...args: unknown[]) {
  if (!globalVariables.isSpeechFxProject) {
    console.log("not speech project. Skip open readme file.");
    return;
  }

  const workspaceFolder = globalVariables.workspaceUri?.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const rootReadmePath = `${workspaceFolder}/README.md`;
  // TODO: if README.md preview already open, focus on it.
  if (fs.existsSync(rootReadmePath)) {
    const readmeUri = vscode.Uri.file(rootReadmePath);
    const readmeDocument = await vscode.workspace.openTextDocument(readmeUri); // preload readme file
    await vscode.commands.executeCommand(VSCodeCommands.MarkdownPreview, readmeUri);
  }
}

async function askUserForSubscription(): Promise<SubscriptionInfo> {
  let azureAccountProvider = AzureAccountManager.getInstance();
  const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
  if (!subscriptionInAccount) {
    throw new Error("SelectSubscriptionError");

  }
  return subscriptionInAccount;
}

async function askUserForSpeechResource(subscriptionInfo: SubscriptionInfo): Promise<AzureSpeechResourceInfo | undefined> {
  let azureAccountProvider = AzureAccountManager.getInstance();
  const speechServiceInfo = await azureAccountProvider.getSelectedSpeechService(subscriptionInfo);
  if (!speechServiceInfo) {
    return;
  }
  return speechServiceInfo;
}

export async function downloadSampleApp(...args: unknown[]) {
  const sampleInfo = args[0] as SampleInfo;
  const sampleId = sampleInfo.id;

  // Validate sampleId
  if (!sampleId || typeof sampleId !== "string") {
    throw new Error("Invalid sampleId. Received: " + sampleId);
  }

  const res = await VS_CODE_UI.selectFolder({
    name: "folder",
    title: "Workspace Folder",
    placeholder: "Choose the folder where your project root folder will be located",
    default: path.join(os.homedir(), ConstantString.RootFolder),
  });

  if (res.isErr()) {
    throw new Error("Fail to select folder for sample app." + res.error);
  } else {
    console.log("Selected folder: ", res.value.result);
    console.log("sampleId: " + sampleId);

    // Ensure result is not undefined
    if (!res.value.result) {
      throw new Error("No folder selected or result is undefined.");
    }
    const selectedFolder = res.value.result as string;
    let projectPath = path.join(selectedFolder, sampleId);
    let count = 1;

    // Append _{number} if projectPath already exists
    while (fs.existsSync(projectPath)) {
      projectPath = path.join(selectedFolder, `${sampleId}_${count}`);
      count++;
    }

    // Check if the parent folder exists, create it if not
    if (!fs.existsSync(selectedFolder)) {
      fs.mkdirSync(selectedFolder, { recursive: true });
      console.log("Created parent folder: " + selectedFolder);
    }

    console.log("projectPath: " + projectPath);

    const sampleDefaultRetryLimits = 2;
    const sampleConcurrencyLimits = 20;
    const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(sampleInfo, sampleDefaultRetryLimits);
    await downloadSampleFiles(
      sampleInfo.downloadUrlInfo,
      fileUrlPrefix,
      samplePaths,
      projectPath,
      sampleDefaultRetryLimits,
      sampleConcurrencyLimits
    );

    // generate azureAiSpeechApp.yml file
    const ymlPath = path.join(projectPath, ConstantString.AzureAISpeechAppYmlFileName);
    if (!fs.existsSync(ymlPath)) {
      fs.writeFileSync(ymlPath, `name: ${sampleId}\nversion: 1.0\n`);
    }

    return await vscode.commands.executeCommand(VSCodeCommands.OpenFolder, vscode.Uri.file(projectPath));
  }
}

export async function getSampleFileInfo(sampleInfo: SampleInfo, retryLimits: number): Promise<any> {
  const urlInfo = sampleInfo.downloadUrlInfo;
  const fileInfoUrl = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repository}/git/trees/${urlInfo.ref}?recursive=1`;
  const fileInfo = (
    await sendRequestWithRetry(async () => {
      return await axios.get(fileInfoUrl);
    }, retryLimits)
  ).data as SampleFileInfo;

  const samplePaths = fileInfo?.tree
    ?.filter((node) => node.path.startsWith(`${urlInfo.dir}/`) && node.type !== "tree")
    .map((node) => node.path);
  const fileUrlPrefix = `https://raw.githubusercontent.com/${urlInfo.owner}/${urlInfo.repository}/${fileInfo?.sha}/`;
  return { samplePaths, fileUrlPrefix };
}

export async function downloadSampleFiles(
  sampleInfo: SampleUrlInfo,
  fileUrlPrefix: string,
  samplePaths: string[],
  dstPath: string,
  retryLimits: number,
  concurrencyLimits: number
): Promise<void> {
  const relativePath = sampleInfo.dir
  const downloadCallback = async (samplePath: string) => {
    const lfsRegex = /^.*oid sha256:[0-9a-f]+\nsize \d+/gm;
    const file = (await sendRequestWithRetry(async () => {
      const content = await axios.get(fileUrlPrefix + samplePath, { responseType: "arraybuffer" });
      if (lfsRegex.test(content.data.toString())) {
        return await axios.get(
          `https://media.githubusercontent.com/media/${sampleInfo.owner}/${sampleInfo.repository}/${sampleInfo.ref}/${samplePath}`,
          {
            responseType: "arraybuffer",
          }
        );
      } else {
        return content;
      }
    }, retryLimits)) as unknown as any;
    const filePath = path.join(dstPath, path.relative(`${relativePath}/`, samplePath));
    await fs.ensureFile(filePath);
    await fs.writeFile(filePath, Buffer.from(file.data));
  };
  await runWithLimitedConcurrency(samplePaths, downloadCallback, concurrencyLimits);
}

export async function runWithLimitedConcurrency<T>(
  items: T[],
  callback: (arg: T) => any,
  concurrencyLimit: number
): Promise<void> {
  const queue: any[] = [];
  for (const item of items) {
    // fire the async function, add its promise to the queue, and remove
    // it from queue when complete
    const p = callback(item)
      .then((res: any) => {
        queue.splice(queue.indexOf(p), 1);
        return res;
      })
      .catch((err: any) => {
        throw err;
      });
    queue.push(p);
    // if max concurrent, wait for one to finish
    if (queue.length >= concurrencyLimit) {
      await Promise.race(queue);
    }
  }
  // wait for the rest of the calls to finish
  await Promise.all(queue);
}