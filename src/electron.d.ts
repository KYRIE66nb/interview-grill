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
        exportDailyLesson: (input: { dateKey: string; markdown: string }) => Promise<{
          path?: string
          error?: string
        }>
        exportMarkdown: (input: { fileName: string; markdown: string }) => Promise<{
          path?: string
          error?: string
        }>
        readMarkdown: (input: { fileName: string }) => Promise<{
          exists: boolean
          path?: string
          content: string
        }>
        inspectPath: (input: { source: 'pdf' | 'repo'; targetPath: string }) => Promise<{
          exists: boolean
          fileCount: number
          error?: string
        }>
        updateReminders: (input: {
          reminders: unknown
        }) => Promise<{
          ok: boolean
        }>
        onReminderNavigate: (callback: (payload: { target: 'lesson408' | 'luogu' | 'lanqiao' }) => void) => () => void
      }
    }
  }
}
