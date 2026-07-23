export {};

declare global {
  interface Window {
    electronAPI: {
      openVideo: () => Promise<string | null>;
      trimVideo: (
        filePath: string,
        startTime: string,
        endTime: string,
      ) => Promise<{
        success: boolean;
        outputPath?: string;
        error?: string;
      }>;
    };
  }
}
