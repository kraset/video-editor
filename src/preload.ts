// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openVideo: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:open-video"),
  pickAudio: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:open-audio"),
  getFilePath: (file: File): string => webUtils.getPathForFile(file),
  runActions: (
    options: unknown,
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> =>
    ipcRenderer.invoke("process:run", options),
});
