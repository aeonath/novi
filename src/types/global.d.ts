// Global ambient types for renderer access to preload API
declare global {
  interface Window {
    api: {
      getVersion: () => Promise<string>;
      ping: () => Promise<string>;
      getSetting: <T = unknown>(key: string, defaults?: T) => Promise<T | undefined>;
      setSetting: (key: string, value: unknown) => Promise<unknown>;
      reportError: (message: string, stack?: string) => void;
      copyDiagnostics: () => Promise<string>;
      getCrashesDirectory: () => Promise<string>;
    };
  }
}

export {};
