export {};

declare global {
  interface Window {
    electronAPI: {
      openVideo: () => Promise<string | null>;
    };
  }
}
