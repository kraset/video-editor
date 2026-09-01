import type { RunOptions } from "./operations";

interface RunResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

declare global {
  interface Window {
    electronAPI: {
      openVideo: (defaultPath?: string) => Promise<string | null>;
      pickAudio: (defaultPath?: string) => Promise<string | null>;
      getFavorites: () => Promise<string[]>;
      addFavorite: (
        folder: string,
      ) => Promise<{ folders: string[]; error?: string }>;
      getFilePath: (file: File) => string;
      runActions: (options: RunOptions) => Promise<RunResult>;
      getFfmpegPath: () => Promise<string>;
      setFfmpegPath: (value: string) => Promise<boolean>;
      pickFfmpeg: () => Promise<string | null>;
    };
  }
}
