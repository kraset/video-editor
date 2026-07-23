// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openVideo: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:open-video"),
  getFilePath: (file: File): string => webUtils.getPathForFile(file),
  trimVideo: (
    filePath: string,
    startTime: string,
    endTime: string,
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> =>
    ipcRenderer.invoke("trim:run", filePath, startTime, endTime),
  downsampleVideo: (
    filePath: string,
    nthFrame: number,
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> =>
    ipcRenderer.invoke("downsample:run", filePath, nthFrame),
  cropVideo: (
    filePath: string,
    w: number,
    h: number,
    x: number,
    y: number,
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> =>
    ipcRenderer.invoke("crop:run", filePath, w, h, x, y),
  convertVideo: (
    filePath: string,
    srcFormat: string,
    destFormat: string,
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> =>
    ipcRenderer.invoke("convert:run", filePath, srcFormat, destFormat),
});
