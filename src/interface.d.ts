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
      openVideo: () => Promise<string | null>;
      pickAudio: () => Promise<string | null>;
      getFilePath: (file: File) => string;
      runActions: (options: RunOptions) => Promise<RunResult>;
      getFfmpegPath: () => Promise<string>;
      setFfmpegPath: (value: string) => Promise<boolean>;
      pickFfmpeg: () => Promise<string | null>;
    };
  }
}
