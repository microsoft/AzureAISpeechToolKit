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
import { CommandKey, ConstantString, EnvKeys, TaskName, VSCodeCommands } from "./constants";
import { AzureResourceInfo, SubscriptionInfo } from "./api/login";
import { VS_CODE_UI } from "./extension";
import { isSpeechResourceSeleted, openDocumentInNewColumn } from "./utils";
import { has } from "lodash";

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


export async function buildAppHandler(...args: unknown[]) {
  if (!globalVariables.isSpeechFxProject) {
    console.log("Not a speech project. Skip building the sample app.");
    return;
  }

  const tasks = await vscode.tasks.fetchTasks();
  const buildTask = tasks.find(task => task.name === TaskName.BuildApp);

  if (!buildTask) {
    const hasRunTasks = await runTasksExists();
    if (hasRunTasks) {
      vscode.window.showInformationMessage('No build task found. Would you like to run the app directly?', 'Yes', 'No')
        .then(selection => {
          if (selection === 'Yes') {
            vscode.commands.executeCommand(CommandKey.RunApp);
          }
        });
      return;
    } else {
      vscode.window.showErrorMessage('No build task found. Check .vscode/tasks.json file.');
      return;
    }
  }

  vscode.window.showInformationMessage('Building the sample app... Check terminal for task output.');
  const execution = await vscode.tasks.executeTask(buildTask);

  const disposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
    if (e.execution === execution) {
      disposable.dispose();
      if (e.exitCode === 0) {
        const hasRunTasks = await runTasksExists();
        if (!hasRunTasks) {
          vscode.window.showInformationMessage('Build completed successfully.');
        } else {
          vscode.window.showInformationMessage('Build completed successfully. Would you like to run the app?', 'Yes', 'No')
            .then(selection => {
              if (selection === 'Yes') {
                vscode.commands.executeCommand(CommandKey.RunApp);
              }
            });
        }
      } else {
        vscode.window.showErrorMessage('Build failed. Please check the terminal output for errors.');
      }
    }
  });
}

async function buildTasksExists(): Promise<boolean> {
  const tasks = await vscode.tasks.fetchTasks();
  const buildTask = tasks.find(task => task.name === TaskName.BuildApp);
  return !!buildTask;
}

async function runTasksExists(): Promise<boolean> {
  const tasks = await vscode.tasks.fetchTasks();
  const runTask = tasks.find(task => task.name === TaskName.RunApp);
  return !!runTask;
}

export async function runAppHandler(...args: unknown[]) {
  if (!globalVariables.isSpeechFxProject) {
    console.log("Not a speech project. Skip running the sample app.");
    return;
  }

  const tasks = await vscode.tasks.fetchTasks();
  const runTask = tasks.find(task => task.name === TaskName.RunApp);
  if (!runTask) {
    vscode.window.showErrorMessage('No task with name "' + TaskName.RunApp + '" found in the workspace. Check .vscode/tasks.json file.');
    return;
  }
  vscode.window.showInformationMessage('Running the sample app... Check terminal for task output.');
  const execution = await vscode.tasks.executeTask(runTask);

  const disposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
    if (e.execution === execution) {
      disposable.dispose();
      if (e.exitCode === 0) {
        vscode.window.showInformationMessage('Sample run successfully. To rerun the sample app, click the button or trigger "Azure AI Speech Toolkit: Run the Sample App" command from command palette.', 'Run Sample App')
          .then(selection => {
            if (selection === 'Run Sample App') {
              vscode.commands.executeCommand(CommandKey.RunApp);
            }
          });
      } else {
        vscode.window.showErrorMessage('Run failed. Please check the terminal output for errors. To rerun the sample app, trigger "Azure AI Speech Toolkit: Run the Sample App" command from command palette.');
      }
    }
  });
}

export async function openSamplesHandler(...args: unknown[]) {
  WebviewPanel.createOrShow(PanelType.SampleGallery, args);
  return;
}

export async function openDocumentHandler(...args: unknown[]) {
  vscode.env.openExternal(vscode.Uri.parse("https://learn.microsoft.com/en-us/azure/ai-services/speech-service/"));
  return;
}

export async function ConfigureResourcehandler(...args: unknown[]) {
  if (isSpeechResourceSeleted()) {
    vscode.window.showInformationMessage('Speech service configuration already exists.');
    return;
  }

  const workspaceFolder = globalVariables.workspaceUri?.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  // Speech resource is not selected, enable user to select or create one.
  const envFolderPath = path.join(workspaceFolder, ConstantString.EnvFolderName);
  if (!fs.existsSync(envFolderPath)) {
    fs.mkdirSync(envFolderPath);
  }

  const envFilePath = path.join(envFolderPath, ConstantString.EnvFileName);
  let envContent = '';
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf8');
  }

  const subscriptionInfo = await askUserForSubscription();
  const speechServiceInfo = await askUserForSpeechService(subscriptionInfo);
  if (!speechServiceInfo) {
    // Fail to find a speech service.
    vscode.window.showErrorMessage('No speech service is selected.');
    return;
  }

  // Fetch the Speech Service Key and Region.
  const { key, region } = await fetchSpeechServiceKeyAndRegion(speechServiceInfo);

  // Step 4: Update the .env/.env.dev file with new values or replace existing ones.
  envContent = updateEnvContent(envContent, EnvKeys.SpeechResourceKey, key);
  envContent = updateEnvContent(envContent, EnvKeys.ServiceRegion, region);
  envContent = updateEnvContent(envContent, EnvKeys.SpeechResourceName, speechServiceInfo.name);
  envContent = updateEnvContent(envContent, EnvKeys.SpeechResourceSKU, speechServiceInfo.sku);
  envContent = updateEnvContent(envContent, EnvKeys.AzureSubscriptionId, subscriptionInfo.subscriptionId);
  envContent = updateEnvContent(envContent, EnvKeys.TenantId, subscriptionInfo.tenantId);

  const configFilePath = path.join(workspaceFolder, 'config.json');
  if (fs.existsSync(configFilePath)) {
    let configContent = fs.readFileSync(configFilePath, 'utf8');
    const configJson = JSON.parse(configContent);

    if (configJson.YourSubscriptionKey) {
      configJson.YourSubscriptionKey = key;
    }
    if (configJson.YourServiceRegion) {
      configJson.YourServiceRegion = region;
    }

    configContent = JSON.stringify(configJson, null, 2);
    fs.writeFileSync(configFilePath, configContent);
    vscode.window.showInformationMessage(configFilePath + " file updated successfully.");
  }

  fs.writeFileSync(envFilePath, envContent);
  await openDocumentInNewColumn(envFilePath);

  const hasBuildTasks = await buildTasksExists();
  if (hasBuildTasks) {
    vscode.window.showInformationMessage('Successfully updated environment file ' + envFilePath + '. Would you like to Build the app?', 'Yes')
      .then(selection => {
        if (selection === 'Yes') {
          vscode.commands.executeCommand(CommandKey.BuildApp);
        }
      });
  } else {
    vscode.window.showInformationMessage('Successfully updated environment file ' + envFilePath + '.');
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


// Ask user for Azure subscription.
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

// Ask user for Azure Speech Service.
async function askUserForSpeechService(subscriptionInfo: SubscriptionInfo): Promise<AzureResourceInfo | undefined> {
  let azureAccountProvider = AzureAccountManager.getInstance();
  const speechServiceInfo = await azureAccountProvider.getSelectedSpeechService(subscriptionInfo.subscriptionId);
  if (!speechServiceInfo) {
    return;
  }
  console.log("successfully select speech service: " + JSON.stringify(speechServiceInfo));

  return speechServiceInfo;
}

// Fetch the Speech Service key and region from Azure.
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