

import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";

export async function openSamplesHandler(...args: unknown[]) {
    WebviewPanel.createOrShow(PanelType.SampleGallery, args);
    return;
  }
  
