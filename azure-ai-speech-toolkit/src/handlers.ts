import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";
import {sendRequestWithRetry} from "./common/requestUtils";
import axios, { AxiosError, AxiosResponse } from "axios";
import {SampleInfo} from "./controls/sampleGallery/ISamples";
import {SampleUrlInfo, SampleFileInfo} from "./common/samples";
const path = require('node:path');
import * as fs from "fs-extra";
import * as vscode from "vscode";
import { hasUncaughtExceptionCaptureCallback } from "process";

export async function openSamplesHandler(...args: unknown[]) {
  WebviewPanel.createOrShow(PanelType.SampleGallery, args);
  return;
}

export async function openDocumentHandler(...args: unknown[]) {
  vscode.env.openExternal(vscode.Uri.parse("https://learn.microsoft.com/en-us/azure/ai-services/speech-service/"));
  return;
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
    else{
      throw new URIError("No destination folder selected.")
    }
  });

  if (dstPath == ""){
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