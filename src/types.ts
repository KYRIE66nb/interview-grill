export type Mode = 'chat' | 'drill' | 'mock'

export type DataSource = 'paste' | 'pdf' | 'repo'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: number
}

export type MockStageId = 'project-deep-dive' | 'backend-fundamentals' | 'algorithm-warmup'

export type MockStage = {
  id: MockStageId
  title: string
  durationMinutes: number
  prompt: string
}

export type MockInterviewState = {
  active: boolean
  startedAt: number
  stageIndex: number
  backendTopic: string
  stages: MockStage[]
  completedAt?: number
}

export type ReviewDimension = 'structure' | 'correctness' | 'tradeoffs' | 'metrics' | 'risk'

export type ReviewDimensionResult = {
  score: number
  note: string
}

export type ReviewReport = {
  generatedAt: number
  overall: number
  dimensions: Record<ReviewDimension, ReviewDimensionResult>
  actionableImprovements: string[]
  tomorrowPracticePlan: string[]
  summary: string
}

export type StorageMeta = {
  backendTopicCursor: number
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
  mock: MockInterviewState | null
  reviewReport: ReviewReport | null
  lastSavedReportAt?: number
}
