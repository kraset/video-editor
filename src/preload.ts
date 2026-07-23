// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openVideo: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:open-video"),
  trimVideo: (
    filePath: string,
    startTime: string,
    endTime: string,
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> =>
    ipcRenderer.invoke("trim:run", filePath, startTime, endTime),
});
