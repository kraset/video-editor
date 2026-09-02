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

// ── Zoom (Ctrl+/-, Ctrl+0, Ctrl+MouseWheel) ──────────────────────────────
function getZoom(): number {
  return parseFloat(
    document.documentElement.style.getPropertyValue("zoom") || "1",
  );
}
function setZoom(factor: number): void {
  const clamped = Math.min(5, Math.max(0.2, factor));
  document.documentElement.style.setProperty(
    "zoom",
    String(Math.round(clamped * 100) / 100),
  );
}

window.addEventListener("keydown", (e) => {
  if (!e.ctrlKey) return;
  if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    setZoom(getZoom() + 0.1);
  } else if (e.key === "-") {
    e.preventDefault();
    setZoom(getZoom() - 0.1);
  } else if (e.key === "0") {
    e.preventDefault();
    setZoom(1);
  }
});

window.addEventListener(
  "wheel",
  (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(getZoom() + (e.deltaY < 0 ? 0.1 : -0.1));
  },
  { passive: false },
);

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

// ── Favorite folders selector ──────────────────────────────────────────────────

const favoritesBar = document.getElementById("favorites-bar") as HTMLDivElement;
const favoritesSelect = document.getElementById(
  "favorites-select",
) as HTMLSelectElement;
const btnAddFavorite = document.getElementById(
  "btn-add-favorite",
) as HTMLButtonElement;

let favoriteFolders: string[] = [];
let showAddFolderToFavorites = false;
let pendingFavoriteFolder = "";

function selectedFavorite(): string | undefined {
  const value = favoritesSelect.value.trim();
  return value.length > 0 ? value : undefined;
}

function normalizeDir(p: string): string {
  return p.replace(/[\\/]+$/, "").toLowerCase();
}

function folderOf(filePath: string): string {
  return filePath.replace(/[\\/][^\\/]*$/, "");
}

function addFavoriteOption(folder: string): void {
  const option = document.createElement("option");
  option.value = folder;
  option.textContent = folder;
  favoritesSelect.appendChild(option);
}

function refreshAddFavoriteButton(): void {
  btnAddFavorite.hidden = !showAddFolderToFavorites;
  // The button lives on the favorites row, so make sure the row is visible
  // even when there are no favorites yet (e.g. the file doesn't exist).
  if (showAddFolderToFavorites) favoritesBar.hidden = false;
}

// After a file is picked, offer to remember its folder unless it's already known.
function maybeOfferAddToFavorites(filePath: string): void {
  const folder = folderOf(filePath);
  const known = favoriteFolders.some(
    (f) => normalizeDir(f) === normalizeDir(folder),
  );
  showAddFolderToFavorites = !known;
  pendingFavoriteFolder = known ? "" : folder;
  refreshAddFavoriteButton();
}

btnAddFavorite.addEventListener("click", async () => {
  if (!pendingFavoriteFolder) return;
  const result = await window.electronAPI.addFavorite(pendingFavoriteFolder);
  favoriteFolders = result.folders;
  if (result.error) {
    alert(result.error);
    return;
  }
  addFavoriteOption(pendingFavoriteFolder);
  pendingFavoriteFolder = "";
  showAddFolderToFavorites = false;
  refreshAddFavoriteButton();
});

void window.electronAPI.getFavorites().then((folders) => {
  favoriteFolders = folders;
  if (!folders.length) return;
  for (const folder of folders) addFavoriteOption(folder);
  favoritesBar.hidden = false;
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
const currentTimeDisplay = document.getElementById(
  "current-time-display",
) as HTMLSpanElement;
const skipPreviousBtn = document.getElementById(
  "skip-previous-btn",
) as HTMLButtonElement;
const skipNextBtn = document.getElementById(
  "skip-next-btn",
) as HTMLButtonElement;
const stepSizeSlider = document.getElementById(
  "step-size-slider",
) as HTMLInputElement;
const stepSizeValue = document.getElementById(
  "step-size-value",
) as HTMLOutputElement;
const playSpeedSlider = document.getElementById(
  "play-speed-slider",
) as HTMLInputElement;
const playSpeedValue = document.getElementById(
  "play-speed-value",
) as HTMLOutputElement;

const actionsSection = document.getElementById("actions") as HTMLDivElement;

// Action checkboxes
const chkNiceTrim = document.getElementById(
  "chk-nice-trim",
) as HTMLInputElement;
const chkFastTrim = document.getElementById(
  "chk-fast-trim",
) as HTMLInputElement;
const chkCrop = document.getElementById("chk-crop") as HTMLInputElement;
const chkDownsample = document.getElementById(
  "chk-downsample",
) as HTMLInputElement;
const chkScale = document.getElementById("chk-scale") as HTMLInputElement;
const chkFps = document.getElementById("chk-fps") as HTMLInputElement;
const chkSlowdown = document.getElementById("chk-slowdown") as HTMLInputElement;
const chkTransform = document.getElementById(
  "chk-transform",
) as HTMLInputElement;
const chkCompress = document.getElementById("chk-compress") as HTMLInputElement;
const chkAudioRemove = document.getElementById(
  "chk-audio-remove",
) as HTMLInputElement;
const chkAudioMap = document.getElementById(
  "chk-audio-map",
) as HTMLInputElement;
const chkConvert = document.getElementById("chk-convert") as HTMLInputElement;
const chkMultiConcat = document.getElementById(
  "chk-multiconcat",
) as HTMLInputElement;

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
const cropInstruction = document.getElementById(
  "crop-instruction",
) as HTMLParagraphElement;
const chkCropFixedSize = document.getElementById(
  "chk-crop-fixed-size",
) as HTMLInputElement;
const selectCropFixedSize = document.getElementById(
  "select-crop-fixed-size",
) as HTMLSelectElement;
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

// Scale config
const configSectionScale = document.getElementById(
  "config-section-scale",
) as HTMLDivElement;
const selectScaleResolution = document.getElementById(
  "select-scale-resolution",
) as HTMLSelectElement;
const scaleCustomFields = document.getElementById(
  "scale-custom-fields",
) as HTMLDivElement;
const inputScaleWidth = document.getElementById(
  "input-scale-width",
) as HTMLInputElement;
const inputScaleHeight = document.getElementById(
  "input-scale-height",
) as HTMLInputElement;
const chkWidthFollows = document.getElementById(
  "chk-width-follows",
) as HTMLInputElement;
const chkHeightFollows = document.getElementById(
  "chk-height-follows",
) as HTMLInputElement;
const scaleModeFields = document.getElementById(
  "scale-mode-fields",
) as HTMLFieldSetElement;
const scaleWarning = document.getElementById("scale-warning") as HTMLDivElement;

// FPS config
const configSectionFps = document.getElementById(
  "config-section-fps",
) as HTMLDivElement;
const chkFpsSource = document.getElementById(
  "chk-fps-source",
) as HTMLInputElement;
const inputFps = document.getElementById("input-fps") as HTMLInputElement;

// Slowdown config
const configSectionSlowdown = document.getElementById(
  "config-section-slowdown",
) as HTMLDivElement;
const inputSlowdown = document.getElementById(
  "input-slowdown",
) as HTMLInputElement;

// Transform config
const configSectionTransform = document.getElementById(
  "config-section-transform",
) as HTMLDivElement;
const chkMirrorHorizontal = document.getElementById(
  "chk-mirror-horizontal",
) as HTMLInputElement;
const chkFlipVertical = document.getElementById(
  "chk-flip-vertical",
) as HTMLInputElement;
const selectRotate = document.getElementById(
  "select-rotate",
) as HTMLSelectElement;
const customRotateField = document.getElementById(
  "custom-rotate-field",
) as HTMLDivElement;
const inputCustomRotate = document.getElementById(
  "input-custom-rotate",
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

// Multi-Interval-Concat config
const configSectionMc = document.getElementById(
  "config-section-multiconcat",
) as HTMLDivElement;
const btnMcSetStart = document.getElementById(
  "btn-mc-set-start",
) as HTMLButtonElement;
const btnMcSetEnd = document.getElementById(
  "btn-mc-set-end",
) as HTMLButtonElement;
const labelMcStart = document.getElementById(
  "label-mc-start",
) as HTMLSpanElement;
const labelMcEnd = document.getElementById("label-mc-end") as HTMLSpanElement;
const btnMcAddRange = document.getElementById(
  "btn-mc-add-range",
) as HTMLButtonElement;
const btnMcClearRanges = document.getElementById(
  "btn-mc-clear-ranges",
) as HTMLButtonElement;
const mcRangesDisplay = document.getElementById(
  "mc-ranges-display",
) as HTMLDivElement;

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

// Multi-Interval-Concat params
let mcStart: number | null = null;
let mcEnd: number | null = null;
let mcRanges: { start: number; end: number }[] = [];

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
    chkNiceTrim.checked ||
    chkFastTrim.checked ||
    chkCrop.checked ||
    chkDownsample.checked ||
    chkScale.checked ||
    chkFps.checked ||
    chkSlowdown.checked ||
    chkTransform.checked ||
    chkCompress.checked ||
    chkAudioRemove.checked ||
    chkAudioMap.checked ||
    chkConvert.checked ||
    chkMultiConcat.checked;
  if (!anyChecked) return false;

  // Multi-Interval-Concat is mutually exclusive with everything else and only
  // needs at least one selected range.
  if (chkMultiConcat.checked) return mcRanges.length >= 1;

  if (
    (chkNiceTrim.checked || chkFastTrim.checked) &&
    (rangeStart === null || rangeEnd === null || rangeEnd <= rangeStart)
  )
    return false;
  if (chkCrop.checked && (!cropStart || !cropEnd)) return false;
  if (chkDownsample.checked && !validNumber(inputNthFrame.value, 1))
    return false;
  if (chkScale.checked) {
    const scale = selectedScale();
    if (!scale || scale.width < 1 || scale.height < 1) return false;
  }
  if (
    chkFps.checked &&
    !chkFpsSource.checked &&
    !validNumber(inputFps.value, 1)
  )
    return false;
  if (chkSlowdown.checked && !validNumber(inputSlowdown.value, 0.01))
    return false;
  if (
    chkTransform.checked &&
    selectRotate.value === "custom" &&
    (inputCustomRotate.value.trim() === "" ||
      !Number.isFinite(Number(inputCustomRotate.value)))
  )
    return false;
  if (chkCompress.checked && !validNumber(inputCrf.value, 0)) return false;
  if (chkAudioMap.checked && !audioFilePath) return false;
  return true;
}

/** Show/hide each config section based on its checkbox. */
function updateConfigVisibility(): void {
  setHidden(configSection, !chkNiceTrim.checked && !chkFastTrim.checked);
  setHidden(configSectionCrop, !chkCrop.checked);
  setHidden(configSectionDs, !chkDownsample.checked);
  setHidden(configSectionScale, !chkScale.checked);
  setHidden(configSectionFps, !chkFps.checked);
  setHidden(configSectionSlowdown, !chkSlowdown.checked);
  setHidden(configSectionTransform, !chkTransform.checked);
  setHidden(customRotateField, selectRotate.value !== "custom");
  setHidden(configSectionCompress, !chkCompress.checked);
  setHidden(configSectionAudioMap, !chkAudioMap.checked);
  setHidden(configSectionMc, !chkMultiConcat.checked);
}

/** Convert is only offered for non-mp4 sources. */
function isConvertApplicable(): boolean {
  return !!currentVideoPath && !/\.mp4$/i.test(currentVideoPath);
}

/** Enforce mutual exclusivity: Multi-Interval-Concat and every other action
 *  hide one another so only one “mode” can be active at a time. */
function updateActionAvailability(): void {
  const multiChecked = chkMultiConcat.checked;
  const fastChecked = chkFastTrim.checked;
  const anyRegular =
    chkNiceTrim.checked ||
    chkCrop.checked ||
    chkDownsample.checked ||
    chkScale.checked ||
    chkFps.checked ||
    chkSlowdown.checked ||
    chkTransform.checked ||
    chkCompress.checked ||
    chkAudioRemove.checked ||
    chkAudioMap.checked ||
    chkConvert.checked;

  for (const chk of [
    chkNiceTrim,
    chkCrop,
    chkDownsample,
    chkScale,
    chkFps,
    chkSlowdown,
    chkTransform,
    chkCompress,
    chkAudioRemove,
    chkAudioMap,
    chkConvert,
  ]) {
    const label = chk.closest(".action-check") as HTMLElement | null;
    if (!label) continue;
    if (chk === chkConvert) {
      setHidden(label, multiChecked || fastChecked || !isConvertApplicable());
    } else if (chk === chkAudioRemove || chk === chkAudioMap) {
      setHidden(label, multiChecked || fastChecked || chkSlowdown.checked);
    } else {
      setHidden(label, multiChecked || fastChecked);
    }
  }

  const fastLabel = chkFastTrim.closest(".action-check") as HTMLElement | null;
  if (fastLabel) setHidden(fastLabel, multiChecked || anyRegular);

  const multiLabel = chkMultiConcat.closest(
    ".action-check",
  ) as HTMLElement | null;
  if (multiLabel) setHidden(multiLabel, fastChecked || anyRegular);
}

function refreshUI(): void {
  const hasMedia = currentVideoPath !== null;
  setHidden(playerWrapper, !hasMedia);
  setHidden(actionsSection, !hasMedia);
  setHidden(runControls, !hasMedia);
  setHidden(statusSection, !hasMedia);

  updateConfigVisibility();
  updateActionAvailability();
  updateScaleControls();

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
  const filePath = await window.electronAPI.openVideo(selectedFavorite());
  if (filePath) {
    maybeOfferAddToFavorites(filePath);
    loadVideoFromPath(filePath);
  }
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
  refreshUI();
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
const stepSizes = [0.05, 0.1, 0.5, 1, 3, 5, 10, 30];
const playSpeeds = [0.1, 0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.5, 2];

function selectedStepSize(): number {
  return stepSizes[Number(stepSizeSlider.value)];
}

function updateCurrentTimeDisplay(): void {
  currentTimeDisplay.textContent = formatTime(video.currentTime, 2);
}

progress.addEventListener("pointerdown", () => {
  isSeeking = true;
});
window.addEventListener("pointerup", () => {
  isSeeking = false;
});

video.addEventListener("timeupdate", () => {
  updateCurrentTimeDisplay();
  if (!isSeeking && video.duration) {
    progress.value = String((video.currentTime / video.duration) * 100);
    updateProgressFill();
  }
});
progress.addEventListener("input", () => {
  if (video.duration) {
    video.currentTime = (Number(progress.value) / 100) * video.duration;
    updateProgressFill();
    updateCurrentTimeDisplay();
  }
});
function updateProgressFill(): void {
  progress.style.setProperty("--val", `${progress.value}%`);
}

skipPreviousBtn.addEventListener("click", () => {
  video.currentTime = Math.max(0, video.currentTime - selectedStepSize());
  updateCurrentTimeDisplay();
});

skipNextBtn.addEventListener("click", () => {
  const end = Number.isFinite(video.duration) ? video.duration : 0;
  video.currentTime = Math.min(end, video.currentTime + selectedStepSize());
  updateCurrentTimeDisplay();
});

stepSizeSlider.addEventListener("input", () => {
  stepSizeValue.value = `${selectedStepSize()} s`;
});

playSpeedSlider.addEventListener("input", () => {
  const speed = playSpeeds[Number(playSpeedSlider.value)];
  video.playbackRate = speed;
  playSpeedValue.value = `${Math.round(speed * 100)}%`;
});

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
  chkNiceTrim,
  chkFastTrim,
  chkDownsample,
  chkScale,
  chkFps,
  chkTransform,
  chkCompress,
  chkConvert,
  chkMultiConcat,
]) {
  chk.addEventListener("change", onCheckboxChange);
}

chkSlowdown.addEventListener("change", () => {
  if (chkSlowdown.checked) {
    chkAudioRemove.checked = false;
    chkAudioMap.checked = false;
  }
  onCheckboxChange();
});

// Re-validate whenever a numeric config changes.
for (const input of [
  inputNthFrame,
  inputScaleWidth,
  inputScaleHeight,
  inputFps,
  inputSlowdown,
  inputCustomRotate,
  inputCrf,
]) {
  input.addEventListener("input", refreshUI);
}

selectScaleResolution.addEventListener("change", refreshUI);
selectRotate.addEventListener("change", refreshUI);
chkMirrorHorizontal.addEventListener("change", refreshUI);
chkFlipVertical.addEventListener("change", refreshUI);
chkFpsSource.addEventListener("change", () => {
  inputFps.disabled = chkFpsSource.checked;
  refreshUI();
});
chkWidthFollows.addEventListener("change", () => {
  if (chkWidthFollows.checked) chkHeightFollows.checked = false;
  refreshUI();
});
chkHeightFollows.addEventListener("change", () => {
  if (chkHeightFollows.checked) chkWidthFollows.checked = false;
  refreshUI();
});
for (const radio of document.querySelectorAll<HTMLInputElement>(
  'input[name="scale-mode"]',
)) {
  radio.addEventListener("change", refreshUI);
}

function onCheckboxChange(): void {
  refreshUI();
}

type SelectedScale = NonNullable<RunOptions["scale"]>;

function selectedScaleMode(): "width" | "height" | "both" {
  const selected = document.querySelector<HTMLInputElement>(
    'input[name="scale-mode"]:checked',
  );
  return (selected?.value as "width" | "height" | "both") ?? "width";
}

function targetScaleSize(): { width: number; height: number } | null {
  if (selectScaleResolution.value !== "custom") {
    const [width, height] = selectScaleResolution.value.split("x").map(Number);
    return { width, height };
  }
  const width = Math.floor(Number(inputScaleWidth.value));
  const height = Math.floor(Number(inputScaleHeight.value));
  return Number.isFinite(width) && Number.isFinite(height)
    ? { width, height }
    : null;
}

function scaleSourceSize(): { width: number; height: number } {
  const crop = chkCrop.checked ? computeCrop() : null;
  return crop
    ? { width: crop.w, height: crop.h }
    : { width: video.videoWidth, height: video.videoHeight };
}

function selectedScale(): SelectedScale | null {
  const target = targetScaleSize();
  if (!target) return null;
  const custom = selectScaleResolution.value === "custom";
  if (custom && chkWidthFollows.checked) {
    return { ...target, mode: "fit-height" };
  }
  if (custom && chkHeightFollows.checked) {
    return { ...target, mode: "fit-width" };
  }

  const mode = selectedScaleMode();
  if (mode === "both") return { ...target, mode };
  const source = scaleSourceSize();
  if (!source.width || !source.height) return { ...target, mode };
  const scaledOther =
    mode === "width"
      ? (source.height * target.width) / source.width
      : (source.width * target.height) / source.height;
  const targetOther = mode === "width" ? target.height : target.width;
  const difference = scaledOther - targetOther;
  const adjustment =
    Math.abs(difference) < 1 ? undefined : difference < 0 ? "pad" : "crop";
  return { ...target, mode, adjustment };
}

function updateScaleControls(): void {
  const custom = selectScaleResolution.value === "custom";
  setHidden(scaleCustomFields, !custom);
  inputScaleWidth.disabled = custom && chkWidthFollows.checked;
  inputScaleHeight.disabled = custom && chkHeightFollows.checked;
  const followsAspect =
    custom && (chkWidthFollows.checked || chkHeightFollows.checked);
  setHidden(scaleModeFields, followsAspect);

  const source = scaleSourceSize();
  if (custom && source.width > 0 && source.height > 0) {
    if (chkWidthFollows.checked && validNumber(inputScaleHeight.value, 1)) {
      const width =
        (Number(inputScaleHeight.value) * source.width) / source.height;
      inputScaleWidth.value = String(Math.max(2, Math.round(width / 2) * 2));
    } else if (
      chkHeightFollows.checked &&
      validNumber(inputScaleWidth.value, 1)
    ) {
      const height =
        (Number(inputScaleWidth.value) * source.height) / source.width;
      inputScaleHeight.value = String(Math.max(2, Math.round(height / 2) * 2));
    }
  }

  const scale = selectedScale();
  let warning = "";
  if (scale?.mode === "both") {
    const source = scaleSourceSize();
    if (
      source.width > 0 &&
      source.height > 0 &&
      Math.abs(source.width / source.height - scale.width / scale.height) >
        0.001
    ) {
      warning = "Scaling both width/height may deform original video";
    }
  } else if (scale?.adjustment) {
    const dimension = scale.mode === "width" ? "Height" : "Width";
    if (scale.adjustment === "pad") {
      warning = `${dimension} will be padded with black ${scale.mode === "width" ? "on top/bottom" : "on left/right"}`;
    } else {
      warning = `${dimension} will be cut ${scale.mode === "width" ? "on top/bottom" : "on left/right"}, centered`;
    }
  }
  scaleWarning.textContent = warning;
  setHidden(scaleWarning, warning.length === 0);
}

// ── Trim config — Trim state ──────────────────────────────────────────────────

function formatTime(seconds: number, fractionDigits = 3): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const secondWidth = fractionDigits > 0 ? fractionDigits + 3 : 2;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(fractionDigits).padStart(secondWidth, "0")}`;
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

// ── Multi-Interval-Concat config — works like Trim, but collects many ranges ──

function updateMcLabels(): void {
  labelMcStart.textContent =
    mcStart !== null ? formatTime(mcStart) : "--:--:--";
  labelMcEnd.textContent = mcEnd !== null ? formatTime(mcEnd) : "--:--:--";
}

function updateMcRangesDisplay(): void {
  const parts = mcRanges.map(
    (r) => `{${formatTime(r.start)}, ${formatTime(r.end)}}`,
  );
  mcRangesDisplay.textContent = `Selected ranges: [${parts.join(", ")}]`;
}

btnMcSetStart.addEventListener("click", () => {
  mcStart = video.currentTime;
  updateMcLabels();
});
btnMcSetEnd.addEventListener("click", () => {
  mcEnd = video.currentTime;
  updateMcLabels();
});
btnMcAddRange.addEventListener("click", () => {
  if (mcStart === null || mcEnd === null || mcEnd <= mcStart) return;
  mcRanges.push({ start: mcStart, end: mcEnd });
  mcStart = null;
  mcEnd = null;
  updateMcLabels();
  updateMcRangesDisplay();
  refreshUI();
});
btnMcClearRanges.addEventListener("click", () => {
  mcRanges = [];
  mcStart = null;
  mcEnd = null;
  updateMcLabels();
  updateMcRangesDisplay();
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

function fixedCropAtPointer(pointer: {
  x: number;
  y: number;
}): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  const [width, height] = selectCropFixedSize.value.split("x").map(Number);
  const rect = video.getBoundingClientRect();
  if (
    width > video.videoWidth ||
    height > video.videoHeight ||
    rect.width <= 0 ||
    rect.height <= 0
  )
    return null;

  const displayWidth = (width * rect.width) / video.videoWidth;
  const displayHeight = (height * rect.height) / video.videoHeight;
  const x = Math.min(
    Math.max(0, pointer.x - displayWidth / 2),
    rect.width - displayWidth,
  );
  const y = Math.min(
    Math.max(0, pointer.y - displayHeight / 2),
    rect.height - displayHeight,
  );
  return {
    start: { x, y },
    end: { x: x + displayWidth, y: y + displayHeight },
  };
}

function drawFixedCropPreview(
  area: ReturnType<typeof fixedCropAtPointer>,
): void {
  clearCropCanvas();
  if (!area) return;
  const ctx = cropCanvas.getContext("2d");
  if (!ctx) return;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(
    area.start.x,
    area.start.y,
    area.end.x - area.start.x,
    area.end.y - area.start.y,
  );
  ctx.setLineDash([]);
}

function updateCropDisplay(
  end?: { x: number; y: number },
  start = cropStart,
): void {
  const endPt = end ?? cropEnd;
  const rect = video.getBoundingClientRect();
  const scaleX = rect.width > 0 ? video.videoWidth / rect.width : 1;
  const scaleY = rect.height > 0 ? video.videoHeight / rect.height : 1;
  const x1 = start
    ? Math.round(Math.min(start.x, endPt?.x ?? start.x) * scaleX)
    : 0;
  const y1 = start
    ? Math.round(Math.min(start.y, endPt?.y ?? start.y) * scaleY)
    : 0;
  const x2 = start
    ? Math.round(Math.max(start.x, endPt?.x ?? start.x) * scaleX)
    : video.videoWidth;
  const y2 = start
    ? Math.round(Math.max(start.y, endPt?.y ?? start.y) * scaleY)
    : video.videoHeight;
  cropCoordDisplay.textContent = `Define crop area: top-left (${x1}, ${y1}) → bottom-right (${x2}, ${y2}) | Size: ${x2 - x1} × ${y2 - y1}`;
}

cropCanvas.addEventListener("pointermove", (e) => {
  const rect = cropCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (chkCropFixedSize.checked && !cropEnd) {
    const area = fixedCropAtPointer({ x, y });
    drawFixedCropPreview(area);
    if (area) updateCropDisplay(area.end, area.start);
    return;
  }
  if (!cropStart || cropEnd) return; // only preview after first click
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
  if (chkCropFixedSize.checked) {
    const area = fixedCropAtPointer({ x, y });
    if (!area) return;
    cropStart = area.start;
    cropEnd = area.end;
    drawCropRect();
    updateCropDisplay();
    cropCanvas.classList.remove("active");
    cropCanvas.classList.add("visible");
    refreshUI();
    return;
  }
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

function resetCropArea(): void {
  cropStart = null;
  cropEnd = null;
  clearCropCanvas();
  updateCropDisplay();
  cropCanvas.classList.add("active");
  cropCanvas.classList.remove("visible");
  refreshUI();
}

chkCropFixedSize.addEventListener("change", () => {
  setHidden(selectCropFixedSize, !chkCropFixedSize.checked);
  cropInstruction.textContent = chkCropFixedSize.checked
    ? "Move the pointer to position the area, then click to select it."
    : "Click top-left corner, then bottom-right corner on the video.";
  resetCropArea();
});

selectCropFixedSize.addEventListener("change", resetCropArea);

function snapCropToGrid(): void {
  const crop = computeCrop();
  if (!crop || !cropStart || !cropEnd) return;
  const rect = video.getBoundingClientRect();
  const scaleX = video.videoWidth / rect.width;
  const scaleY = video.videoHeight / rect.height;
  const availableWidth = video.videoWidth - crop.x;
  const availableHeight = video.videoHeight - crop.y;
  const width = Math.min(
    Math.max(10, Math.round(crop.w / 10) * 10),
    Math.floor(availableWidth / 10) * 10,
  );
  const height = Math.min(
    Math.max(10, Math.round(crop.h / 10) * 10),
    Math.floor(availableHeight / 10) * 10,
  );
  if (width < 10 || height < 10) return;

  cropEnd = {
    x: (crop.x + width) / scaleX,
    y: (crop.y + height) / scaleY,
  };
  drawCropRect();
  updateCropDisplay();
  refreshUI();
}

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "s" || !chkCrop.checked || !cropEnd) return;
  const target = e.target as HTMLElement | null;
  if (target?.matches("input, select, textarea, [contenteditable]")) return;
  e.preventDefault();
  snapCropToGrid();
});

btnResetArea.addEventListener("click", resetCropArea);

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
  const filePath = await window.electronAPI.pickAudio(selectedFavorite());
  if (filePath) {
    audioFilePath = filePath;
    audioFileLabel.textContent = filePath.split(/[\\/]/).pop() ?? filePath;
  }
  refreshUI();
});

// ── Clear all & execute ───────────────────────────────────────────────────────

function clearAllActions(): void {
  for (const chk of [
    chkNiceTrim,
    chkFastTrim,
    chkCrop,
    chkDownsample,
    chkScale,
    chkFps,
    chkSlowdown,
    chkTransform,
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
  chkMultiConcat.checked = false;
  mcStart = null;
  mcEnd = null;
  mcRanges = [];
  updateMcLabels();
  updateMcRangesDisplay();
  selectScaleResolution.value = "1280x720";
  chkWidthFollows.checked = false;
  chkHeightFollows.checked = true;
  chkFpsSource.checked = true;
  inputFps.disabled = true;
  chkMirrorHorizontal.checked = false;
  chkFlipVertical.checked = false;
  selectRotate.value = "0";
  inputCustomRotate.value = "0";
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
      (chkNiceTrim.checked || chkFastTrim.checked) &&
      rangeStart !== null &&
      rangeEnd !== null
        ? {
            mode: chkFastTrim.checked ? ("fast" as const) : ("nice" as const),
            start: rangeStart,
            end: rangeEnd,
          }
        : undefined,
    crop: chkCrop.checked ? (computeCrop() ?? undefined) : undefined,
    downsample: chkDownsample.checked
      ? { nth: Math.max(1, Math.floor(Number(inputNthFrame.value))) }
      : undefined,
    scale: chkScale.checked ? (selectedScale() ?? undefined) : undefined,
    compress: chkCompress.checked
      ? { crf: Math.max(0, Math.floor(Number(inputCrf.value))) }
      : undefined,
    frameRate:
      chkFps.checked && !chkFpsSource.checked
        ? Math.max(1, Number(inputFps.value))
        : undefined,
    slowdown: chkSlowdown.checked
      ? Math.max(0.01, Number(inputSlowdown.value))
      : undefined,
    transform: chkTransform.checked
      ? {
          mirrorHorizontal: chkMirrorHorizontal.checked,
          flipVertical: chkFlipVertical.checked,
          rotate:
            selectRotate.value === "custom"
              ? Number(inputCustomRotate.value)
              : Number(selectRotate.value),
        }
      : undefined,
    audio: chkAudioRemove.checked
      ? ("remove" as const)
      : chkAudioMap.checked
        ? ("map" as const)
        : ("none" as const),
    audioFile: chkAudioMap.checked ? (audioFilePath ?? undefined) : undefined,
    convert: chkConvert.checked,
    multiConcat:
      chkMultiConcat.checked && mcRanges.length > 0
        ? { ranges: mcRanges.map((r) => ({ start: r.start, end: r.end })) }
        : undefined,
  };

  btnExecute.disabled = true;
  statusText.textContent = "Processing…";
  const result = await window.electronAPI.runActions(options);
  statusText.textContent = result.success
    ? `✓ Saved: ${result.outputPath}`
    : `✗ Error: ${result.error}`;
  refreshUI();
});
