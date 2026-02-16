export type Mode = 'chat' | 'drill' | 'mock' | 'luogu' | 'lanqiao'

export type DataSource = 'paste' | 'pdf' | 'repo'

export type DailyModeId = 'luogu' | 'lanqiao'
export type DailyLessonLevel = 'L0' | 'L1' | 'L2' | 'L3'

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

export type ContextImportState = {
  source: DataSource
  importedAt: number
  wordCount: number
  fileCount: number
  path?: string
}

export type StorageMeta = {
  backendTopicCursor: number
  dailyLesson: DailyLessonMeta
  dailyProgress: DailyProgress
  mistakes: MistakeItem[]
  reminders: ReminderSettings
  appSettings: AppSettings
}

export type DailyLessonMeta = {
  topicOverride: string
  level: DailyLessonLevel
  completedByDate: Record<string, number>
}

export type MistakeSourceMode = '408' | 'luogu' | 'lanqiao' | 'interview'

export type MistakeErrorType =
  | 'concept'
  | 'boundary'
  | 'complexity'
  | 'implementation'
  | 'careless'
  | 'unknown'
  | 'expression'

export type MistakeStatus = 'open' | 'reviewed' | 'fixed'

export type SrsState = {
  intervalDays: number
  ease: number
  dueDate: string
  lastReviewedAt?: number
  reviewCount: number
}

export type MistakeItem = {
  id: string
  createdAt: number
  updatedAt: number
  date: string
  sourceMode: MistakeSourceMode
  topic: string
  tags: string[]
  prompt: string
  myAnswer?: string
  expected?: string
  errorType: MistakeErrorType
  severity: 1 | 2 | 3 | 4 | 5
  notes: string
  status: MistakeStatus
  srs: SrsState
}

export type ReminderId = 'lesson408' | 'luogu' | 'lanqiao'

export type ReminderConfig = {
  id: ReminderId
  title: string
  enabled: boolean
  time: string
}

export type ReminderSettings = {
  lesson408: ReminderConfig
  luogu: ReminderConfig
  lanqiao: ReminderConfig
}

export type AppSettings = {
  autoJumpTodayTask: boolean
}

export type DailyTaskStatus = 'todo' | 'done'

export type DailyTaskReview = {
  thinking: string
  pitfall: string
  complexity: string
  template: string
}

export type DailyTask = {
  taskId: string
  title: string
  difficulty: string
  url?: string
  topic?: string
  status: DailyTaskStatus
  note: string
  review: DailyTaskReview
}

export type ModeProgress = {
  modeId: DailyModeId
  dateKey: string
  sourceId: string
  sourceTitle: string
  generatedAt: number
  updatedAt: number
  totalCount: number
  doneCount: number
  notes: string
  planType?: 'daily' | 'topic'
  topic?: string
  difficulty?: 'all' | 'easy' | 'medium' | 'hard'
  tasks: DailyTask[]
}

export type DailyProgress = Record<DailyModeId, Record<string, ModeProgress>>

export type SessionModeConfig = {
  luoguSourceId?: string
  lanqiaoPlanType?: 'daily' | 'topic'
  lanqiaoTopic?: string
  lanqiaoDifficulty?: 'all' | 'easy' | 'medium' | 'hard'
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
  contextImport: ContextImportState | null
  modeConfig: SessionModeConfig
  messages: Message[]
  reviewNotes: string
  mock: MockInterviewState | null
  reviewReport: ReviewReport | null
  lastSavedReportAt?: number
}
