import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";
import { sendRequestWithRetry } from "./common/requestUtils";
import axios from "axios";
import { SampleInfo } from "./controls/sampleGallery/ISamples";
import { SampleUrlInfo, SampleFileInfo } from "./common/samples";
const path = require('node:path');
import * as os from "os";
import * as fs from "fs-extra";
import * as vscode from "vscode";
import * as globalVariables from "./globalVariables";
import { AzureAccountManager } from "./common/azureLogin";
import { ConstantString, EnvKeys, VSCodeCommands } from "./constants";
import { AzureResourceInfo, SubscriptionInfo } from "./api/login";
import { VS_CODE_UI } from "./extension";

// export async function signInAzureHandler(...args: unknown[]) {
//   // const azureAccountProvider = AzureAccountManager.getInstance();
//   // await azureAccountProvider.login(true);
//   // WebviewPanel.createOrShow(PanelType.SampleGallery, args);
//   return;
// }
// export async function signOutAzureHandler(...args: unknown[]) {
//   // WebviewPanel.createOrShow(PanelType.SampleGallery, args);
//   return;
// }

export async function openSamplesHandler(...args: unknown[]) {
  WebviewPanel.createOrShow(PanelType.SampleGallery, args);
  return;
}

export async function openDocumentHandler(...args: unknown[]) {
  vscode.env.openExternal(vscode.Uri.parse("https://learn.microsoft.com/en-us/azure/ai-services/speech-service/"));
  return;
}

export async function provisionHandler(...args: unknown[]) {

  const workspaceFolder = globalVariables.workspaceUri?.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const envFolderPath = path.join(workspaceFolder, ConstantString.EnvFolderName);
  const envFilePath = path.join(envFolderPath, '.env.dev');

  // Step 1: Check if .env folder exists, if not, create one.
  if (!fs.existsSync(envFolderPath)) {
    fs.mkdirSync(envFolderPath);
  }

  // Step 2: Check if .env/.env.dev file exists and contains SPEECH_SERVICE_KEY and SERVICE_REGION.
  let envContent = '';
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf8');
  }

  let speechServiceKey = extractEnvValue(envContent, EnvKeys.SpeechServiceKey);
  let serviceRegion = extractEnvValue(envContent, EnvKeys.ServiceRegion);
  let tenantId = extractEnvValue(envContent, EnvKeys.TenantId);
  let subscriptionId = extractEnvValue(envContent, EnvKeys.AzureSubscriptionId);

  if (!speechServiceKey || !serviceRegion || !tenantId || !subscriptionId) {
    // Step 3: If the values are missing, prompt the user for subscription and service selection.
    const subscriptionInfo = await askUserForSubscription();
    const speechServiceInfo = await askUserForSpeechService(subscriptionInfo);
    if (!speechServiceInfo) {
      // Fail to find a speech service.
      return;
    }

    // Fetch the Speech Service Key and Region.
    const { key, region } = await fetchSpeechServiceKeyAndRegion(speechServiceInfo);

    // Step 4: Update the .env/.env.dev file with new values or replace existing ones.
    envContent = updateEnvContent(envContent, EnvKeys.SpeechServiceKey, key);
    envContent = updateEnvContent(envContent, EnvKeys.ServiceRegion, region);
    envContent = updateEnvContent(envContent, EnvKeys.AzureSubscriptionId, subscriptionInfo.subscriptionId);
    envContent = updateEnvContent(envContent, EnvKeys.TenantId, subscriptionInfo.tenantId);

    fs.writeFileSync(envFilePath, envContent);
    vscode.window.showInformationMessage('.env/.env.dev file updated successfully.');
  } else {
    vscode.window.showInformationMessage('Speech service configuration already exists.');
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
  if (fs.existsSync(rootReadmePath)) {
    return await vscode.commands.executeCommand(VSCodeCommands.MarkdownPreview, vscode.Uri.file(rootReadmePath));
  }
}

// Helper function to update or add a key-value pair in the .env content
function updateEnvContent(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;

  if (regex.test(content)) {
    // If the key exists, replace the line
    return content.replace(regex, newLine);
  } else {
    // If the key doesn't exist, append a new line
    return content + `\n${newLine}`;
  }
}

// Helper function to extract env variables from content.
function extractEnvValue(content: string, key: string): string | undefined {
  const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1] : undefined;
}

// Mock function to ask user for Azure subscription.
async function askUserForSubscription(): Promise<SubscriptionInfo> {
  let azureAccountProvider = AzureAccountManager.getInstance();
  const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
  if (!subscriptionInAccount) {
    throw new Error("SelectSubscriptionError");

  } else {
    console.log("successfully select subscription: " + JSON.stringify(subscriptionInAccount));

    return subscriptionInAccount;
  }
}

// Mock function to ask user for Azure Speech Service.
async function askUserForSpeechService(subscriptionInfo: SubscriptionInfo): Promise<AzureResourceInfo | undefined> {
  let azureAccountProvider = AzureAccountManager.getInstance();
  const speechServiceInfo = await azureAccountProvider.getSelectedSpeechService(subscriptionInfo.subscriptionId);
  if (!speechServiceInfo) {
    return;
  }
  console.log("successfully select speech service: " + JSON.stringify(speechServiceInfo));

  return speechServiceInfo;
}

// Mock function to fetch the Speech Service key and region from Azure.
async function fetchSpeechServiceKeyAndRegion(speechServiceInfo: AzureResourceInfo): Promise<{ key: string, region: string }> {
  let azureAccountProvider = AzureAccountManager.getInstance();
  const resourceGroupName = getResourceGroupNameFromId(speechServiceInfo.id);
  const { key, region } = await azureAccountProvider.fetchSpeechServiceKeyAndRegion(speechServiceInfo.subscriptionId, resourceGroupName, speechServiceInfo.name);
  if (!key || !region) {
    throw new Error("Fail to fetch key and region");
  }

  return {
    key: key,
    region: region
  };
}

function getResourceGroupNameFromId(speechServiceId: string): string {
  const segments = speechServiceId.split('/');
  const resourceGroupIndex = segments.indexOf('resourceGroups') + 1;
  return segments[resourceGroupIndex];
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
    console.log("Successfully download sample files to project path:" + projectPath);

    // generate azureAiSpeechApp.yml file
    const ymlPath = path.join(projectPath, ConstantString.AzureAISpeechAppYmlFileName);
    if (!fs.existsSync(ymlPath)) {
      fs.writeFileSync(ymlPath, `name: ${sampleId}\nversion: 1.0\n`);
    }


    return await vscode.commands.executeCommand(VSCodeCommands.OpenFolder, vscode.Uri.file(projectPath));
    const rootReadmePath = path.join(projectPath, "README.md");
    if (fs.existsSync(rootReadmePath)) {
      return await vscode.commands.executeCommand(VSCodeCommands.MarkdownPreview, vscode.Uri.file(rootReadmePath));
    }
    // vscode.workspace.openTextDocument
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