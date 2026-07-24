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

// ── FFMPEG path bar ───────────────────────────────────────────────────────────

const ffmpegInput = document.getElementById(
  "ffmpeg-path-input",
) as HTMLInputElement;
const ffmpegBrowseBtn = document.getElementById(
  "ffmpeg-browse-btn",
) as HTMLButtonElement;
const ffmpegStatus = document.getElementById(
  "ffmpeg-status",
) as HTMLSpanElement;
const ffmpegWarning = document.getElementById(
  "ffmpeg-warning",
) as HTMLSpanElement;

function refreshFfmpegWarning(): void {
  const empty = ffmpegInput.value.trim().length === 0;
  ffmpegWarning.hidden = !empty;
}

ffmpegBrowseBtn.addEventListener("click", async () => {
  const picked = await window.electronAPI.pickFfmpeg();
  if (!picked) return;
  ffmpegInput.value = picked;
  await window.electronAPI.setFfmpegPath(picked);
  ffmpegStatus.textContent = "Status: Saved!";
  refreshFfmpegWarning();
});

void window.electronAPI.getFfmpegPath().then((saved) => {
  ffmpegInput.value = saved ?? "";
  refreshFfmpegWarning();
});

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

// Action checkboxes
const chkTrim = document.getElementById("chk-trim") as HTMLInputElement;
const chkCrop = document.getElementById("chk-crop") as HTMLInputElement;
const chkDownsample = document.getElementById(
  "chk-downsample",
) as HTMLInputElement;
const chkDownscale = document.getElementById(
  "chk-downscale",
) as HTMLInputElement;
const chkCompress = document.getElementById("chk-compress") as HTMLInputElement;
const chkAudioRemove = document.getElementById(
  "chk-audio-remove",
) as HTMLInputElement;
const chkAudioMap = document.getElementById(
  "chk-audio-map",
) as HTMLInputElement;
const chkConvert = document.getElementById("chk-convert") as HTMLInputElement;

// Trim config
const configSection = document.getElementById(
  "config-section",
) as HTMLDivElement;
const btnSetStart = document.getElementById(
  "btn-set-start",
) as HTMLButtonElement;
const btnSetEnd = document.getElementById("btn-set-end") as HTMLButtonElement;
const labelStart = document.getElementById("label-start") as HTMLSpanElement;
const labelEnd = document.getElementById("label-end") as HTMLSpanElement;

// Crop config
const configSectionCrop = document.getElementById(
  "config-section-crop",
) as HTMLDivElement;
const cropCoordDisplay = document.getElementById(
  "crop-coord-display",
) as HTMLDivElement;
const btnResetArea = document.getElementById(
  "btn-reset-area",
) as HTMLButtonElement;
const cropCanvas = document.getElementById("crop-canvas") as HTMLCanvasElement;

// Downsample config
const configSectionDs = document.getElementById(
  "config-section-downsample",
) as HTMLDivElement;
const inputNthFrame = document.getElementById(
  "input-nth-frame",
) as HTMLInputElement;

// Downscale config
const configSectionDownscale = document.getElementById(
  "config-section-downscale",
) as HTMLDivElement;
const inputScaleWidth = document.getElementById(
  "input-scale-width",
) as HTMLInputElement;

// Compress config
const configSectionCompress = document.getElementById(
  "config-section-compress",
) as HTMLDivElement;
const inputCrf = document.getElementById("input-crf") as HTMLInputElement;

// Replace-audio config
const configSectionAudioMap = document.getElementById(
  "config-section-audio-map",
) as HTMLDivElement;
const btnPickAudio = document.getElementById(
  "btn-pick-audio",
) as HTMLButtonElement;
const audioFileLabel = document.getElementById(
  "audio-file-label",
) as HTMLSpanElement;

// Run controls
const runControls = document.getElementById("run-controls") as HTMLDivElement;
const btnClearAll = document.getElementById(
  "btn-clear-all",
) as HTMLButtonElement;
const btnExecute = document.getElementById("btn-execute") as HTMLButtonElement;

// Status
const statusSection = document.getElementById(
  "status-section",
) as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLSpanElement;

// ── App State ─────────────────────────────────────────────────────────────────

const enum AppState {
  WaitingForMediaSelection,
  WaitingForConfig,
  ReadyForAction,
}

let appState: AppState = AppState.WaitingForMediaSelection;
let currentVideoPath: string | null = null;

// Trim params
let rangeStart: number | null = null;
let rangeEnd: number | null = null;

// Crop params (display-space coordinates)
let cropStart: { x: number; y: number } | null = null;
let cropEnd: { x: number; y: number } | null = null;

// Replace-audio param
let audioFilePath: string | null = null;

function setHidden(el: HTMLElement, hidden: boolean): void {
  if (hidden) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}

function validNumber(value: string, min: number): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n >= min;
}

/** True when at least one action is checked AND every checked action has all
 *  the parameters it requires. */
function validateActionInfo(): boolean {
  const anyChecked =
    chkTrim.checked ||
    chkCrop.checked ||
    chkDownsample.checked ||
    chkDownscale.checked ||
    chkCompress.checked ||
    chkAudioRemove.checked ||
    chkAudioMap.checked ||
    chkConvert.checked;
  if (!anyChecked) return false;

  if (
    chkTrim.checked &&
    (rangeStart === null || rangeEnd === null || rangeEnd <= rangeStart)
  )
    return false;
  if (chkCrop.checked && (!cropStart || !cropEnd)) return false;
  if (chkDownsample.checked && !validNumber(inputNthFrame.value, 1))
    return false;
  if (chkDownscale.checked && !validNumber(inputScaleWidth.value, 1))
    return false;
  if (chkCompress.checked && !validNumber(inputCrf.value, 0)) return false;
  if (chkAudioMap.checked && !audioFilePath) return false;
  return true;
}

/** Show/hide each config section based on its checkbox. */
function updateConfigVisibility(): void {
  setHidden(configSection, !chkTrim.checked);
  setHidden(configSectionCrop, !chkCrop.checked);
  setHidden(configSectionDs, !chkDownsample.checked);
  setHidden(configSectionDownscale, !chkDownscale.checked);
  setHidden(configSectionCompress, !chkCompress.checked);
  setHidden(configSectionAudioMap, !chkAudioMap.checked);
}

function refreshUI(): void {
  const hasMedia = currentVideoPath !== null;
  setHidden(playerWrapper, !hasMedia);
  setHidden(actionsSection, !hasMedia);
  setHidden(runControls, !hasMedia);
  setHidden(statusSection, !hasMedia);

  updateConfigVisibility();

  if (!hasMedia) {
    appState = AppState.WaitingForMediaSelection;
  } else if (validateActionInfo()) {
    appState = AppState.ReadyForAction;
  } else {
    appState = AppState.WaitingForConfig;
  }
  btnExecute.disabled = appState !== AppState.ReadyForAction;
}

// ── File selection ────────────────────────────────────────────────────────────

function afterVideoLoaded(): void {
  clearAllActions();
  // Convert only supports webm → mp4. Hide the checkbox entirely for files
  // that are already mp4, and default it on for webm.
  const isMp4 = !!currentVideoPath && /\.mp4$/i.test(currentVideoPath);
  const convertLabel = chkConvert.closest(
    ".action-check",
  ) as HTMLElement | null;
  if (convertLabel) setHidden(convertLabel, isMp4);
  if (currentVideoPath && /\.webm$/i.test(currentVideoPath)) {
    chkConvert.checked = true;
  }
  refreshUI();
}

function loadVideo(file: File): void {
  currentVideoPath = window.electronAPI.getFilePath(file);
  video.src = URL.createObjectURL(file);
  afterVideoLoaded();
}

function loadVideoFromPath(filePath: string): void {
  currentVideoPath = filePath;
  video.src = `file:///${filePath.replace(/\\/g, "/")}`;
  afterVideoLoaded();
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

// Audio remove / replace are mutually exclusive.
chkAudioRemove.addEventListener("change", () => {
  if (chkAudioRemove.checked) chkAudioMap.checked = false;
  onCheckboxChange();
});
chkAudioMap.addEventListener("change", () => {
  if (chkAudioMap.checked) chkAudioRemove.checked = false;
  onCheckboxChange();
});

chkCrop.addEventListener("change", () => {
  if (chkCrop.checked) enterCropMode();
  else exitCropMode();
  onCheckboxChange();
});

for (const chk of [
  chkTrim,
  chkDownsample,
  chkDownscale,
  chkCompress,
  chkConvert,
]) {
  chk.addEventListener("change", onCheckboxChange);
}

// Re-validate whenever a numeric config changes.
for (const input of [inputNthFrame, inputScaleWidth, inputCrf]) {
  input.addEventListener("input", refreshUI);
}

function onCheckboxChange(): void {
  refreshUI();
}

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
}

btnSetStart.addEventListener("click", () => {
  rangeStart = video.currentTime;
  updateTrimLabels();
  refreshUI();
});
btnSetEnd.addEventListener("click", () => {
  rangeEnd = video.currentTime;
  updateTrimLabels();
  refreshUI();
});

// ── Crop — Crop state ───────────────────────────────────────────────────────────────────

function enterCropMode(): void {
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
}

function exitCropMode(): void {
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
    refreshUI();
  }
});

btnResetArea.addEventListener("click", () => {
  cropStart = null;
  cropEnd = null;
  clearCropCanvas();
  updateCropDisplay();
  cropCanvas.classList.add("active");
  cropCanvas.classList.remove("visible");
  refreshUI();
});

/** Convert display-space crop rectangle to actual video pixels. */
function computeCrop(): { w: number; h: number; x: number; y: number } | null {
  if (!cropStart || !cropEnd) return null;
  const rect = video.getBoundingClientRect();
  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;
  const x1 = Math.round(Math.min(cropStart.x, cropEnd.x) * scaleX);
  const y1 = Math.round(Math.min(cropStart.y, cropEnd.y) * scaleY);
  const x2 = Math.round(Math.max(cropStart.x, cropEnd.x) * scaleX);
  const y2 = Math.round(Math.max(cropStart.y, cropEnd.y) * scaleY);
  return { w: x2 - x1, h: y2 - y1, x: x1, y: y1 };
}

// ── Replace-audio config ──────────────────────────────────────────────────────

btnPickAudio.addEventListener("click", async () => {
  const filePath = await window.electronAPI.pickAudio();
  if (filePath) {
    audioFilePath = filePath;
    audioFileLabel.textContent = filePath.split(/[\\/]/).pop() ?? filePath;
  }
  refreshUI();
});

// ── Clear all & execute ───────────────────────────────────────────────────────

function clearAllActions(): void {
  for (const chk of [
    chkTrim,
    chkCrop,
    chkDownsample,
    chkDownscale,
    chkCompress,
    chkAudioRemove,
    chkAudioMap,
    chkConvert,
  ]) {
    chk.checked = false;
  }
  rangeStart = null;
  rangeEnd = null;
  updateTrimLabels();
  exitCropMode();
  audioFilePath = null;
  audioFileLabel.textContent = "No file selected";
}

btnClearAll.addEventListener("click", () => {
  clearAllActions();
  refreshUI();
});

btnExecute.addEventListener("click", async () => {
  if (!currentVideoPath || appState !== AppState.ReadyForAction) return;

  const options = {
    filePath: currentVideoPath,
    trim:
      chkTrim.checked && rangeStart !== null && rangeEnd !== null
        ? { start: formatTime(rangeStart), end: formatTime(rangeEnd) }
        : undefined,
    crop: chkCrop.checked ? (computeCrop() ?? undefined) : undefined,
    downsample: chkDownsample.checked
      ? { nth: Math.max(1, Math.floor(Number(inputNthFrame.value))) }
      : undefined,
    downscale: chkDownscale.checked
      ? { width: Math.max(1, Math.floor(Number(inputScaleWidth.value))) }
      : undefined,
    compress: chkCompress.checked
      ? { crf: Math.max(0, Math.floor(Number(inputCrf.value))) }
      : undefined,
    audio: chkAudioRemove.checked
      ? ("remove" as const)
      : chkAudioMap.checked
        ? ("map" as const)
        : ("none" as const),
    audioFile: chkAudioMap.checked ? (audioFilePath ?? undefined) : undefined,
    convert: chkConvert.checked,
  };

  btnExecute.disabled = true;
  statusText.textContent = "Processing…";
  const result = await window.electronAPI.runActions(options);
  statusText.textContent = result.success
    ? `✓ Saved: ${result.outputPath}`
    : `✗ Error: ${result.error}`;
  refreshUI();
});
