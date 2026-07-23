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

// ── File selection ──────────────────────────────────────────────────────────

function loadVideo(file: File): void {
  video.src = URL.createObjectURL(file);
  showPlayer();
}

function loadVideoFromPath(filePath: string): void {
  video.src = `file:///${filePath.replace(/\\/g, "/")}`;
  showPlayer();
}

function showPlayer(): void {
  playerWrapper.removeAttribute("hidden");
}

pickFileBtn.addEventListener("click", async () => {
  const filePath = await window.electronAPI.openVideo();
  if (filePath) loadVideoFromPath(filePath);
});

// ── Drag & drop ─────────────────────────────────────────────────────────────

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith("video/")) loadVideo(file);
});

// ── Portrait / landscape sizing ──────────────────────────────────────────────

video.addEventListener("loadedmetadata", () => {
  const isPortrait = video.videoHeight > video.videoWidth;
  if (isPortrait) {
    videoContainer.classList.add("portrait");
    videoContainer.classList.remove("landscape");
  } else {
    videoContainer.classList.add("landscape");
    videoContainer.classList.remove("portrait");
  }
});

// ── Play / pause ─────────────────────────────────────────────────────────────

playPauseBtn.addEventListener("click", () => {
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
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

// ── Progress bar ─────────────────────────────────────────────────────────────

// Prevent timeupdate from overwriting progress.value while the user drags.
let isSeeking = false;

progress.addEventListener("pointerdown", () => {
  isSeeking = true;
});

// Catch release even when pointer drifts off the element.
window.addEventListener("pointerup", () => {
  isSeeking = false;
});

// Keep the bar in sync with playback, but not while the user is dragging.
video.addEventListener("timeupdate", () => {
  if (!isSeeking && video.duration) {
    progress.value = String((video.currentTime / video.duration) * 100);
    updateProgressFill();
  }
});

// Seek immediately as the knob moves so the user sees live frame updates.
progress.addEventListener("input", () => {
  if (video.duration) {
    video.currentTime = (Number(progress.value) / 100) * video.duration;
    updateProgressFill();
  }
});

function updateProgressFill(): void {
  progress.style.setProperty("--val", `${progress.value}%`);
}
