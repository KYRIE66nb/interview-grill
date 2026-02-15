export type Mode = 'chat' | 'drill'

export type DataSource = 'paste' | 'pdf' | 'repo'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: number
}

export type Session = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  mode: Mode
  intensity: number
  dataSource: DataSource
  resumeText: string
  pdfPath?: string
  repoPath?: string
  messages: Message[]
  reviewNotes: string
}
