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
const statusSection = document.getElementById(
  "status-section",
) as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLSpanElement;

// ── App State ─────────────────────────────────────────────────────────────────

const enum AppState {
  WaitingForMediaSelection,
  ReadyForAction,
  Trim,
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
  setHidden(statusSection, !hasMedia);
  if (next === AppState.Trim) {
    rangeStart = null;
    rangeEnd = null;
    updateTrimLabels();
  }
}

// ── File selection ────────────────────────────────────────────────────────────

function loadVideo(file: File): void {
  currentVideoPath = (file as File & { path?: string }).path ?? null;
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
