/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import "./index.css";

// ── DOM refs ──────────────────────────────────────────────────────────────────

const dropZone = document.getElementById("drop-zone") as HTMLDivElement;
const playerWrapper = document.getElementById(
  "player-wrapper",
) as HTMLDivElement;
const videoContainer = document.getElementById(
  "video-container",
) as HTMLDivElement;
const video = document.getElementById("video") as HTMLVideoElement;
const pickFileBtn = document.getElementById(
  "pick-file-btn",
) as HTMLButtonElement;
const playPauseBtn = document.getElementById(
  "play-pause-btn",
) as HTMLButtonElement;
const progress = document.getElementById("progress") as HTMLInputElement;
const actionsSection = document.getElementById("actions") as HTMLDivElement;
const btnTrim = document.getElementById("btn-trim") as HTMLButtonElement;
const btnDownsample = document.getElementById(
  "btn-downsample",
) as HTMLButtonElement;
const configSection = document.getElementById(
  "config-section",
) as HTMLDivElement;
const btnSetStart = document.getElementById(
  "btn-set-start",
) as HTMLButtonElement;
const btnSetEnd = document.getElementById("btn-set-end") as HTMLButtonElement;
const btnExecuteTrim = document.getElementById(
  "btn-execute-trim",
) as HTMLButtonElement;
const btnCancelTrim = document.getElementById(
  "btn-cancel-trim",
) as HTMLButtonElement;
const labelStart = document.getElementById("label-start") as HTMLSpanElement;
const labelEnd = document.getElementById("label-end") as HTMLSpanElement;
const configSectionDs = document.getElementById(
  "config-section-downsample",
) as HTMLDivElement;
const inputNthFrame = document.getElementById(
  "input-nth-frame",
) as HTMLInputElement;
const btnExecuteDs = document.getElementById(
  "btn-execute-downsample",
) as HTMLButtonElement;
const btnCancelDs = document.getElementById(
  "btn-cancel-downsample",
) as HTMLButtonElement;
const statusSection = document.getElementById(
  "status-section",
) as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLSpanElement;
const btnCrop = document.getElementById("btn-crop") as HTMLButtonElement;
const configSectionCrop = document.getElementById(
  "config-section-crop",
) as HTMLDivElement;
const cropCoordDisplay = document.getElementById(
  "crop-coord-display",
) as HTMLDivElement;
const btnResetArea = document.getElementById(
  "btn-reset-area",
) as HTMLButtonElement;
const btnExecuteCrop = document.getElementById(
  "btn-execute-crop",
) as HTMLButtonElement;
const btnCancelCrop = document.getElementById(
  "btn-cancel-crop",
) as HTMLButtonElement;
const cropCanvas = document.getElementById("crop-canvas") as HTMLCanvasElement;
const btnConvert = document.getElementById("btn-convert") as HTMLButtonElement;
const configSectionConvert = document.getElementById(
  "config-section-convert",
) as HTMLDivElement;
const inputSrcFormat = document.getElementById(
  "input-src-format",
) as HTMLInputElement;
const inputDestFormat = document.getElementById(
  "input-dest-format",
) as HTMLInputElement;
const btnExecuteConvert = document.getElementById(
  "btn-execute-convert",
) as HTMLButtonElement;
const btnCancelConvert = document.getElementById(
  "btn-cancel-convert",
) as HTMLButtonElement;

// ── App State ─────────────────────────────────────────────────────────────────

const enum AppState {
  WaitingForMediaSelection,
  ReadyForAction,
  Trim,
  Downsample,
  Crop,
  Convert,
}

let appState: AppState = AppState.WaitingForMediaSelection;
let currentVideoPath: string | null = null;
let rangeStart: number | null = null;
let rangeEnd: number | null = null;

function setHidden(el: HTMLElement, hidden: boolean): void {
  if (hidden) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}

function setState(next: AppState): void {
  appState = next;
  const hasMedia = next !== AppState.WaitingForMediaSelection;
  setHidden(playerWrapper, !hasMedia);
  setHidden(actionsSection, next !== AppState.ReadyForAction);
  setHidden(configSection, next !== AppState.Trim);
  setHidden(configSectionDs, next !== AppState.Downsample);
  setHidden(configSectionCrop, next !== AppState.Crop);
  setHidden(configSectionConvert, next !== AppState.Convert);
  setHidden(statusSection, !hasMedia);
  if (next === AppState.Trim) {
    rangeStart = null;
    rangeEnd = null;
    updateTrimLabels();
  }
  if (next === AppState.Crop) enterCropState();
  else exitCropState();
}

// ── File selection ────────────────────────────────────────────────────────────

function loadVideo(file: File): void {
  currentVideoPath = window.electronAPI.getFilePath(file);
  video.src = URL.createObjectURL(file);
  setState(AppState.ReadyForAction);
}

function loadVideoFromPath(filePath: string): void {
  currentVideoPath = filePath;
  video.src = `file:///${filePath.replace(/\\/g, "/")}`;
  setState(AppState.ReadyForAction);
}

pickFileBtn.addEventListener("click", async () => {
  const filePath = await window.electronAPI.openVideo();
  if (filePath) loadVideoFromPath(filePath);
});

// ── Drag & drop ───────────────────────────────────────────────────────────────

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("drag-over"),
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith("video/")) loadVideo(file);
});

// ── Portrait / landscape ──────────────────────────────────────────────────────

video.addEventListener("loadedmetadata", () => {
  const portrait = video.videoHeight > video.videoWidth;
  videoContainer.classList.toggle("portrait", portrait);
  videoContainer.classList.toggle("landscape", !portrait);
});

// ── Play / pause ──────────────────────────────────────────────────────────────

playPauseBtn.addEventListener("click", () => {
  if (video.paused) video.play();
  else video.pause();
});
video.addEventListener("play", () => {
  playPauseBtn.innerHTML = "&#9646;&#9646;";
  playPauseBtn.setAttribute("aria-label", "Pause");
});
video.addEventListener("pause", () => {
  playPauseBtn.innerHTML = "&#9654;";
  playPauseBtn.setAttribute("aria-label", "Play");
});
video.addEventListener("ended", () => {
  playPauseBtn.innerHTML = "&#9654;";
  playPauseBtn.setAttribute("aria-label", "Play");
});

// ── Progress bar ──────────────────────────────────────────────────────────────

let isSeeking = false;
progress.addEventListener("pointerdown", () => {
  isSeeking = true;
});
window.addEventListener("pointerup", () => {
  isSeeking = false;
});

video.addEventListener("timeupdate", () => {
  if (!isSeeking && video.duration) {
    progress.value = String((video.currentTime / video.duration) * 100);
    updateProgressFill();
  }
});
progress.addEventListener("input", () => {
  if (video.duration) {
    video.currentTime = (Number(progress.value) / 100) * video.duration;
    updateProgressFill();
  }
});
function updateProgressFill(): void {
  progress.style.setProperty("--val", `${progress.value}%`);
}

// ── Actions — ReadyForAction state ────────────────────────────────────────────

btnTrim.addEventListener("click", () => setState(AppState.Trim));
btnDownsample.addEventListener("click", () => setState(AppState.Downsample));

// ── Trim config — Trim state ──────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

function updateTrimLabels(): void {
  labelStart.textContent =
    rangeStart !== null ? formatTime(rangeStart) : "--:--:--";
  labelEnd.textContent = rangeEnd !== null ? formatTime(rangeEnd) : "--:--:--";
  setHidden(btnExecuteTrim, rangeStart === null || rangeEnd === null);
}

btnSetStart.addEventListener("click", () => {
  rangeStart = video.currentTime;
  updateTrimLabels();
});
btnSetEnd.addEventListener("click", () => {
  rangeEnd = video.currentTime;
  updateTrimLabels();
});
btnCancelTrim.addEventListener("click", () =>
  setState(AppState.ReadyForAction),
);

btnExecuteTrim.addEventListener("click", async () => {
  if (!currentVideoPath || rangeStart === null || rangeEnd === null) return;
  btnExecuteTrim.disabled = true;
  statusText.textContent = "Trimming\u2026";
  const result = await window.electronAPI.trimVideo(
    currentVideoPath,
    formatTime(rangeStart),
    formatTime(rangeEnd),
  );
  btnExecuteTrim.disabled = false;
  setState(AppState.ReadyForAction);
  statusText.textContent = result.success
    ? `\u2713 Saved: ${result.outputPath}`
    : `\u2717 Error: ${result.error}`;
});

// ── Downsample config — Downsample state ──────────────────────────────────────

btnCancelDs.addEventListener("click", () => setState(AppState.ReadyForAction));

btnExecuteDs.addEventListener("click", async () => {
  if (!currentVideoPath) return;
  const n = Math.max(1, Math.min(10, Number(inputNthFrame.value) || 2));
  btnExecuteDs.disabled = true;
  statusText.textContent = "Downsampling\u2026";
  const result = await window.electronAPI.downsampleVideo(currentVideoPath, n);
  btnExecuteDs.disabled = false;
  setState(AppState.ReadyForAction);
  statusText.textContent = result.success
    ? `\u2713 Saved: ${result.outputPath}`
    : `\u2717 Error: ${result.error}`;
});
// ── Crop — Crop state ───────────────────────────────────────────────────────────────────

btnCrop.addEventListener("click", () => setState(AppState.Crop));

let cropStart: { x: number; y: number } | null = null;
let cropEnd: { x: number; y: number } | null = null;

function enterCropState(): void {
  cropStart = null;
  cropEnd = null;
  // Size the canvas to exactly match the displayed video
  const rect = video.getBoundingClientRect();
  cropCanvas.width = rect.width;
  cropCanvas.height = rect.height;
  clearCropCanvas();
  updateCropDisplay();
  cropCanvas.classList.add("active");
  cropCanvas.classList.remove("visible");
  btnExecuteCrop.disabled = true;
}

function exitCropState(): void {
  cropCanvas.classList.remove("active", "visible");
  clearCropCanvas();
  cropStart = null;
  cropEnd = null;
}

function clearCropCanvas(): void {
  const ctx = cropCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
}

function drawCropRect(end?: { x: number; y: number }): void {
  const endPt = end ?? cropEnd;
  if (!cropStart || !endPt) return;
  const ctx = cropCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  const x = Math.min(cropStart.x, endPt.x);
  const y = Math.min(cropStart.y, endPt.y);
  const w = Math.abs(endPt.x - cropStart.x);
  const h = Math.abs(endPt.y - cropStart.y);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // Dim outside the crop area
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, 0, cropCanvas.width, y); // top
  ctx.fillRect(0, y + h, cropCanvas.width, cropCanvas.height - y - h); // bottom
  ctx.fillRect(0, y, x, h); // left
  ctx.fillRect(x + w, y, cropCanvas.width - x - w, h); // right
}

function updateCropDisplay(end?: { x: number; y: number }): void {
  const endPt = end ?? cropEnd;
  const rect = video.getBoundingClientRect();
  const scaleX = rect.width > 0 ? video.videoWidth / rect.width : 1;
  const scaleY = rect.height > 0 ? video.videoHeight / rect.height : 1;
  const x1 = cropStart
    ? Math.round(Math.min(cropStart.x, endPt?.x ?? cropStart.x) * scaleX)
    : 0;
  const y1 = cropStart
    ? Math.round(Math.min(cropStart.y, endPt?.y ?? cropStart.y) * scaleY)
    : 0;
  const x2 = endPt
    ? Math.round(Math.max(cropStart!.x, endPt.x) * scaleX)
    : video.videoWidth;
  const y2 = endPt
    ? Math.round(Math.max(cropStart!.y, endPt.y) * scaleY)
    : video.videoHeight;
  cropCoordDisplay.textContent = `Define crop area: top-left (${x1}, ${y1}) → bottom-right (${x2}, ${y2})`;
}

cropCanvas.addEventListener("pointermove", (e) => {
  if (!cropStart || cropEnd) return; // only preview after first click
  const rect = cropCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // Only draw preview when pointer is to the right of and below the start point
  if (x > cropStart.x && y > cropStart.y) {
    drawCropRect({ x, y });
    updateCropDisplay({ x, y });
  } else {
    clearCropCanvas();
    updateCropDisplay();
  }
});

cropCanvas.addEventListener("click", (e) => {
  const rect = cropCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (!cropStart) {
    cropStart = { x, y };
    updateCropDisplay();
  } else if (!cropEnd) {
    cropEnd = { x, y };
    drawCropRect();
    updateCropDisplay();
    // Stop intercepting clicks so progress bar and play/pause still work
    cropCanvas.classList.remove("active");
    cropCanvas.classList.add("visible");
    btnExecuteCrop.disabled = false;
  }
});

btnResetArea.addEventListener("click", () => {
  cropStart = null;
  cropEnd = null;
  clearCropCanvas();
  updateCropDisplay();
  cropCanvas.classList.add("active");
  cropCanvas.classList.remove("visible");
  btnExecuteCrop.disabled = true;
});

btnCancelCrop.addEventListener("click", () =>
  setState(AppState.ReadyForAction),
);

btnExecuteCrop.addEventListener("click", async () => {
  if (!currentVideoPath || !cropStart || !cropEnd) return;
  const rect = video.getBoundingClientRect();
  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;
  const x1 = Math.round(Math.min(cropStart.x, cropEnd.x) * scaleX);
  const y1 = Math.round(Math.min(cropStart.y, cropEnd.y) * scaleY);
  const x2 = Math.round(Math.max(cropStart.x, cropEnd.x) * scaleX);
  const y2 = Math.round(Math.max(cropStart.y, cropEnd.y) * scaleY);
  const cropW = x2 - x1;
  const cropH = y2 - y1;
  btnExecuteCrop.disabled = true;
  statusText.textContent = "Cropping…";
  const result = await window.electronAPI.cropVideo(
    currentVideoPath,
    cropW,
    cropH,
    x1,
    y1,
  );
  btnExecuteCrop.disabled = false;
  setState(AppState.ReadyForAction);
  statusText.textContent = result.success
    ? `✓ Saved: ${result.outputPath}`
    : `✗ Error: ${result.error}`;
});

// ── Convert Format ──────────────────────────────────────────────────────────────────

btnConvert.addEventListener("click", () => setState(AppState.Convert));

btnCancelConvert.addEventListener("click", () =>
  setState(AppState.ReadyForAction),
);

btnExecuteConvert.addEventListener("click", async () => {
  if (!currentVideoPath) return;
  const srcFmt = inputSrcFormat.value.trim().replace(/^\./, "");
  const destFmt = inputDestFormat.value.trim().replace(/^\./, "");
  btnExecuteConvert.disabled = true;
  statusText.textContent = "Converting…";
  const result = await window.electronAPI.convertVideo(
    currentVideoPath,
    srcFmt,
    destFmt,
  );
  btnExecuteConvert.disabled = false;
  setState(AppState.ReadyForAction);
  statusText.textContent = result.success
    ? `✓ Saved: ${result.outputPath}`
    : `✗ Error: ${result.error}`;
});
