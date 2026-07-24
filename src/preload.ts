// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openVideo: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke("dialog:open-video", defaultPath),
  pickAudio: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke("dialog:open-audio", defaultPath),
  getFavorites: (): Promise<string[]> => ipcRenderer.invoke("favorites:get"),
  addFavorite: (folder: string): Promise<string[]> =>
    ipcRenderer.invoke("favorites:add", folder),
  getFilePath: (file: File): string => webUtils.getPathForFile(file),
  runActions: (
    options: unknown,
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> =>
    ipcRenderer.invoke("process:run", options),
  getFfmpegPath: (): Promise<string> => ipcRenderer.invoke("ffmpeg:get-path"),
  setFfmpegPath: (value: string): Promise<boolean> =>
    ipcRenderer.invoke("ffmpeg:set-path", value),
  pickFfmpeg: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:pick-ffmpeg"),
});
