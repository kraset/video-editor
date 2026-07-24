export {};

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
  multiConcat?: { ranges: { start: number; end: number }[] };
}

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
