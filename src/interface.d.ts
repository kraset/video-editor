export {};

declare global {
  interface Window {
    electronAPI: {
      openVideo: () => Promise<string | null>;
      trimVideo: (filePath: string) => Promise<{
        success: boolean;
        outputPath?: string;
        error?: string;
      }>;
    };
  }
}
