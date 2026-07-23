export {};

declare global {
  interface Window {
    electronAPI: {
      openVideo: () => Promise<string | null>;
      getFilePath: (file: File) => string;
      trimVideo: (
        filePath: string,
        startTime: string,
        endTime: string,
      ) => Promise<{
        success: boolean;
        outputPath?: string;
        error?: string;
      }>;
      downsampleVideo: (
        filePath: string,
        nthFrame: number,
      ) => Promise<{
        success: boolean;
        outputPath?: string;
        error?: string;
      }>;
      cropVideo: (
        filePath: string,
        w: number,
        h: number,
        x: number,
        y: number,
      ) => Promise<{
        success: boolean;
        outputPath?: string;
        error?: string;
      }>;
      convertVideo: (
        filePath: string,
        srcFormat: string,
        destFormat: string,
      ) => Promise<{
        success: boolean;
        outputPath?: string;
        error?: string;
      }>;
    };
  }
}
