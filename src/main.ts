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

ipcMain.handle(
  "trim:run",
  async (_event, filePath: string, startTime: string, endTime: string) => {
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const outputPath = path.join(process.cwd(), `${base}_trimmed.mp4`);

    const args = [
      "-ss",
      startTime,
      "-to",
      endTime,
      "-i",
      filePath,
      "-force_key_frames",
      "expr:gte(t,n_forced*10)",
      "-c",
      "copy",
      "-y",
      outputPath,
    ];

    try {
      await execFileAsync(FFMPEG, args);
      return { success: true, outputPath };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  },
);

ipcMain.handle(
  "downsample:run",
  async (_event, filePath: string, nthFrame: number) => {
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const outputPath = path.join(
      process.cwd(),
      `${base}_downsampled_${nthFrame}.mp4`,
    );

    // \, escapes the comma inside the select expression so ffmpeg doesn't
    // treat it as a filter separator.
    const vf = `select='not(mod(n\\,${nthFrame}))',setpts=N/FRAME_RATE/TB`;
    const args = ["-i", filePath, "-vf", vf, "-an", "-y", outputPath];

    try {
      await execFileAsync(FFMPEG, args);
      return { success: true, outputPath };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  },
);

ipcMain.handle(
  "crop:run",
  async (
    _event,
    filePath: string,
    w: number,
    h: number,
    x: number,
    y: number,
  ) => {
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const outputPath = path.join(process.cwd(), `${base}_cropped.mp4`);
    const vf = `crop=${w}:${h}:${x}:${y}`;
    const args = [
      "-i",
      filePath,
      "-vf",
      vf,
      "-vcodec",
      "libx264",
      "-y",
      outputPath,
    ];

    try {
      await execFileAsync(FFMPEG, args);
      return { success: true, outputPath };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  },
);
