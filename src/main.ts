import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import started from "electron-squirrel-startup";

const execFileAsync = promisify(execFile);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ── IPC handlers ─────────────────────────────────────────────────────────────

const FFMPEG = "C:\\eget\\ffmpeg6\\bin\\ffmpeg.exe";

ipcMain.handle("dialog:open-video", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Videos",
        extensions: ["mp4", "mkv", "avi", "mov", "webm", "m4v", "ogv", "flv"],
      },
    ],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle("dialog:open-audio", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Audio",
        extensions: ["mp3", "aac", "wav", "m4a", "ogg", "opus", "flac"],
      },
    ],
  });
  return canceled ? null : filePaths[0];
});

interface RunOptions {
  filePath: string;
  trim?: { start: string; end: string };
  crop?: { w: number; h: number; x: number; y: number };
  downsample?: { nth: number };
  downscale?: { width: number };
  compress?: { crf: number };
  audio: "none" | "remove" | "map";
  audioFile?: string;
  convert: boolean;
}

function twoDigits(n: number): string {
  return String(n).padStart(2, "0");
}

function timestamp(): string {
  const d = new Date();
  return `${twoDigits(d.getHours())}${twoDigits(d.getMinutes())}${twoDigits(
    d.getSeconds(),
  )}`;
}

ipcMain.handle("process:run", async (_event, opts: RunOptions) => {
  const {
    filePath,
    trim,
    crop,
    downsample,
    downscale,
    compress,
    audio,
    audioFile,
    convert,
  } = opts;

  const srcExt = path.extname(filePath); // e.g. ".webm"
  const base = path.basename(filePath, srcExt);
  const dir = path.dirname(filePath);
  const outExt = convert ? "mp4" : srcExt.replace(/^\./, "") || "mp4";
  const outputPath = path.join(dir, `${base}_${timestamp()}.${outExt}`);

  const args: string[] = [];

  // Input-level trim (fast seek) must come before -i.
  if (trim) args.push("-ss", trim.start, "-to", trim.end);
  args.push("-i", filePath);
  if (audio === "map" && audioFile) args.push("-i", audioFile);

  // Video filter chain (order: crop, downsample, downscale).
  const filters: string[] = [];
  if (crop) filters.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`);
  if (downsample) {
    // \, escapes the comma inside the select expression.
    filters.push(
      `select='not(mod(n\\,${downsample.nth}))'`,
      "setpts=N/FRAME_RATE/TB",
    );
  }
  if (downscale) filters.push(`scale=${downscale.width}:-2`);

  const reencodeVideo = Boolean(crop || downsample || downscale || compress);
  if (filters.length) args.push("-vf", filters.join(","));

  if (reencodeVideo) {
    args.push("-c:v", "libx264");
    if (compress) args.push("-crf", String(compress.crf));
    // Keep original audio untouched unless it's being removed/replaced.
    if (audio === "none") args.push("-c:a", "copy");
  } else if (audio === "map") {
    // Only the audio changes → copy the video stream.
    args.push("-c:v", "copy");
  } else {
    // Nothing needs re-encoding → straight stream copy.
    args.push("-c", "copy");
  }

  // Audio handling.
  if (audio === "remove") {
    args.push("-an");
  } else if (audio === "map") {
    args.push("-map", "0:v:0", "-map", "1:a:0", "-q:a", "0");
  }

  args.push("-y", outputPath);

  const command = `${FFMPEG} ${args.join(" ")}`;
  try {
    await execFileAsync(FFMPEG, args);
    return { success: true, outputPath, command };
  } catch (err: unknown) {
    return { success: false, error: String(err), command };
  }
});
