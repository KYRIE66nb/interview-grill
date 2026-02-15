export {}

declare global {
  interface Window {
    ig?: {
      version: string
      storage: {
        loadState: () => Promise<unknown>
        saveState: (state: unknown) => Promise<void>
        saveReport: (input: { defaultFileName: string; payload: unknown }) => Promise<{
          canceled?: boolean
          path?: string
          error?: string
        }>
      }
    }
  }
}

