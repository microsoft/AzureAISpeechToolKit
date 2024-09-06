
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";

interface Sample {
    name: string;
    description: string;
    fileName: string;
    imageUrl?: string;
}

export async function openSamplesHandler(...args: unknown[]) {
    // ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Samples, getTriggerFromProperty(args));
    WebviewPanel.createOrShow(PanelType.SampleGallery, args);
    // return Promise.resolve(ok(null));
    return;
    // const panel = vscode.window.createWebviewPanel(
    //     'viewSamples', // Identifies the type of the webview panel
    //     'View Samples', // Title displayed in the panel
    //     vscode.ViewColumn.One, // Editor column to show the new webview panel in
    //     {
    //         enableScripts: true // Enables JavaScript inside the webview
    //     }
    // );


    // // Define the sample data (this can be updated easily)
    // const samples: Sample[] = [
    //     {
    //         name: 'Speech Recognition',
    //         description: 'A sample demonstrating how to use Azure AI for speech recognition.',
    //         fileName: 'speech-recognition.zip',
    //         imageUrl: 'https://example.com/speech-recognition.png'
    //     },
    //     {
    //         name: 'Text-to-Speech',
    //         description: 'A sample showing how to convert text to speech using Azure AI.',
    //         fileName: 'text-to-speech.zip',
    //         imageUrl: 'https://example.com/text-to-speech.png'
    //     },
    //     {
    //         name: 'Language Understanding',
    //         description: 'A sample explaining how to use Azure Language Understanding with speech.',
    //         fileName: 'language-understanding.zip',
    //         imageUrl: 'https://example.com/language-understanding.png'
    //     }
    // ];


    // // HTML content for the webview
    // panel.webview.html = getWebviewContent(samples);


    // // Handle messages from the webview
    // panel.webview.onDidReceiveMessage(async (message) => {
    //     switch (message.command) {
    //         case 'downloadSample':
    //             const fileName = message.fileName;

    //             // Prompt the user to choose a directory
    //             const uri = await vscode.window.showOpenDialog({
    //                 canSelectFolders: true,
    //                 openLabel: 'Select a folder to download the sample'
    //             });

    //             if (uri && uri.length > 0) {
    //                 const folderPath = uri[0].fsPath;

    //                 // Simulate downloading the file (copying a local file in this example)
    //                 const sampleFilePath = path.join(context.extensionPath, 'samples', fileName);
    //                 const targetFilePath = path.join(folderPath, fileName);

    //                 // Copy the sample file to the selected folder
    //                 fs.copyFile(sampleFilePath, targetFilePath, (err) => {
    //                     if (err) {
    //                         vscode.window.showErrorMessage(`Failed to download sample: ${err.message}`);
    //                     } else {
    //                         vscode.window.showInformationMessage(`Sample downloaded to ${folderPath}`);
    //                     }
    //                 });
    //             }
    //             break;
    //     }
    // });
  }
  

// function getWebviewContent(samples: Sample[]): string {
//     const sampleCards = samples.map(sample => `
//         <div class="card" onclick="showReadme('${sample.name}', '${sample.description}', '${sample.fileName}')">
//             ${sample.imageUrl ? `<img src="${sample.imageUrl}" alt="${sample.name}" class="card-image" />` : ''}
//             <div class="card-title">${sample.name}</div>
//             <div class="card-description">${sample.description}</div>
//         </div>
//     `).join('');

//     return `
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>View Samples</title>
//         <style>
//             body {
//                 font-family: Arial, sans-serif;
//                 padding: 20px;
//             }
//             .card {
//                 border: 1px solid #ccc;
//                 border-radius: 10px;
//                 padding: 15px;
//                 margin-bottom: 15px;
//                 box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
//                 cursor: pointer;
//             }
//             .card-image {
//                 width: 100px;
//                 height: auto;
//                 margin-bottom: 10px;
//             }
//             .card-title {
//                 font-size: 18px;
//                 font-weight: bold;
//             }
//             .card-description {
//                 font-size: 14px;
//                 margin-top: 5px;
//             }
//             #back-button {
//                 display: none;
//                 margin-bottom: 15px;
//             }
//             button {
//                 padding: 10px;
//                 background-color: #007acc;
//                 color: white;
//                 border: none;
//                 cursor: pointer;
//                 border-radius: 5px;
//             }
//         </style>
//     </head>
//     <body>
//         <h1>Azure AI Speech Toolkit Samples</h1>
//         <div id="main">
//             ${sampleCards}
//         </div>

//         <div id="readme" style="display:none;">
//             <button id="back-button" onclick="goBack()">Back to Samples</button>
//             <h2 id="readme-title"></h2>
//             <p id="readme-content"></p>
//             <button id="create-button" onclick="downloadSample()">Create</button>
//         </div>

//         <script>
//             const vscode = acquireVsCodeApi();
            
//             function showReadme(title, content, fileName) {
//                 document.getElementById('main').style.display = 'none';
//                 document.getElementById('readme').style.display = 'block';
//                 document.getElementById('readme-title').innerText = title;
//                 document.getElementById('readme-content').innerText = content;
//                 document.getElementById('back-button').style.display = 'block';

//                 // Store the file name for the "Create" button
//                 document.getElementById('create-button').dataset.file = fileName;
//             }

//             function goBack() {
//                 document.getElementById('main').style.display = 'block';
//                 document.getElementById('readme').style.display = 'none';
//                 document.getElementById('back-button').style.display = 'none';
//             }

//             function downloadSample() {
//                 const fileName = document.getElementById('create-button').dataset.file;
//                 vscode.postMessage({
//                     command: 'downloadSample',
//                     fileName: fileName
//                 });
//             }
//         </script>
//     </body>
//     </html>
//     `;
// }
