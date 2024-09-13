import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";
import { sendRequestWithRetry } from "./common/requestUtils";
import axios, { AxiosError, AxiosResponse } from "axios";
import { SampleInfo } from "./controls/sampleGallery/ISamples";
import { SampleUrlInfo, SampleFileInfo } from "./common/samples";
const path = require('node:path');
import * as fs from "fs-extra";
import * as vscode from "vscode";
import { hasUncaughtExceptionCaptureCallback } from "process";
import * as globalVariables from "./globalVariables";
import { AzureAccountManager } from "./common/azureLogin";
import { EnvKeys } from "./constants";
import { SubscriptionInfo } from "./api/login";

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

  const envFolderPath = path.join(workspaceFolder, '.env');
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
    const speechService = await askUserForSpeechService(subscriptionInfo);

    // Fetch the Speech Service Key and Region.
    const { key, region } = await fetchSpeechServiceKeyAndRegion(subscriptionInfo, speechService);

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
    // this case will not happen actually
    // return err(new SelectSubscriptionError());
    // console.log("SelectSubscriptionError");
    throw new Error("SelectSubscriptionError");

  } else {
    console.log("successful to select subscription: " + JSON.stringify(subscriptionInAccount));

    // TOOLS.logProvider.info(
    //   `successful to select subscription: ${subscriptionInAccount.subscriptionId}`
    // );
    // return ok(subscriptionInAccount);
    return subscriptionInAccount;

  }
  // const subscriptions = ['Subscription 1', 'Subscription 2', 'Subscription 3']; // Replace with actual subscription fetching logic
  // const selection = await vscode.window.showQuickPick(subscriptions, { placeHolder: 'Select an Azure Subscription' });
  // return selection || '';
}

// Mock function to ask user for Azure Speech Service.
async function askUserForSpeechService(subscriptionInfo: SubscriptionInfo): Promise<string> {
  const services = ['Speech Service 1', 'Speech Service 2', 'Speech Service 3']; // Replace with actual service fetching logic
  const selection = await vscode.window.showQuickPick(services, { placeHolder: 'Select a Speech Service' });
  return selection || '';
}

// Mock function to fetch the Speech Service key and region from Azure.
async function fetchSpeechServiceKeyAndRegion(subscriptionInfo: SubscriptionInfo, service: string): Promise<{ key: string, region: string }> {
  // Replace this with actual Azure API call to get the speech service key and region.
  return {
    key: 'your-speech-service-key', // Mock key
    region: 'westus' // Mock region
  };
}

export async function downloadSampleApp(...args: unknown[]) {
  const sampleInfo = args[0] as SampleInfo;
  const retryLimits = args[1] as number;
  const concurrencyLimits = args[2] as number
  const options: vscode.OpenDialogOptions = {
    canSelectFiles: false,
    canSelectFolders: true,
    openLabel: 'Select'
  };

  const dstPath = await vscode.window.showOpenDialog(options).then(fileUri => {
    if (fileUri && fileUri[0]) {
      console.log('Selected file: ' + fileUri[0].fsPath);
      return fileUri[0].fsPath
    }
    else {
      throw new URIError("No destination folder selected.")
    }
  });

  if (dstPath == "") {
    throw new URIError("Destination path is empty.")
  }


  const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(sampleInfo, retryLimits);
  await downloadSampleFiles(
    sampleInfo.downloadUrlInfo,
    fileUrlPrefix,
    samplePaths,
    dstPath,
    retryLimits,
    concurrencyLimits
  );

  const success = await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(dstPath))

  return success
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