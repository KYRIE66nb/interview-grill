import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { DataSource, DailyModeId, MistakeErrorType, Mode, ReviewDimension, Session, StorageMeta } from './types'
import {
  exportMarkdownFile,
  inspectImportPath,
  loadCachedState,
  loadState,
  readMarkdownFile,
  saveSessionReport,
  saveState,
  subscribeReminderNavigation,
  syncReminderSettings,
} from './storage'
import { makeId, newSession } from './seed'
import { extractProfileFromFreeform } from './core/profile'
import { loadSeedBankFromDisk } from './core/questionBank'
import { chooseNextQuestion, intensityTier, renderQuestionZh } from './core/engine'
import {
  advanceMockInterview,
  createMockInterview,
  createMockKickoffMessages,
  isMockRunning,
} from './core/mockInterview'
import { generateReviewReport } from './core/review'
import { DailyLessonPage } from './components/DailyLessonPage'
import { buildDailyLesson, renderDailyLessonMarkdown, toDateKey } from './core/dailyLesson'
import { LUOGU_SOURCES, generateLuoguDailyProgress, renderLuoguMarkdown } from './core/luogu'
import {
  LANQIAO_TOPIC_OPTIONS,
  generateLanqiaoDailyProgress,
  getLanqiaoTaskUrl,
  renderLanqiaoMarkdown,
  type LanqiaoDifficulty,
  type LanqiaoPlanType,
} from './core/lanqiao'
import { MODES, MODE_MAP } from './modes/registry'
import type { ModeRuntimeState } from './modes/types'
import { getDailyProgress, patchDailyTask, saveDailyNote, saveDailyProgress } from './storage/storage'
import { createMistakeItem, aggregateMistakeTop, buildWeaknessProfile, ERROR_TYPE_LABELS } from './core/mistakes'
import { renderDailyReport } from './core/dailyReport'
import { MistakeBookPage } from './components/MistakeBookPage'
import { ReviewQueuePage } from './components/ReviewQueuePage'
import { DashboardPage } from './components/DashboardPage'
import { ReminderSettingsPage } from './components/ReminderSettingsPage'

const DIMENSION_LABELS: Record<ReviewDimension, string> = {
  structure: '结构化',
  correctness: '正确性',
  tradeoffs: '取舍权衡',
  metrics: '量化指标',
  risk: '风险意识',
}

const MODE_SWITCH_OPTIONS = MODES.map((mode) => ({ mode: mode.id, label: mode.title, hint: mode.shortDesc }))

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function formatWhen(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function modeTagLabel(mode: Mode) {
  if (mode === 'mock') return '模拟'
  if (mode === 'drill') return '快练'
  if (mode === 'chat') return '问答'
  if (mode === 'luogu') return '洛谷'
  return '蓝桥'
}

function modeShortLabel(mode: Mode) {
  if (mode === 'mock') return '模拟面试'
  if (mode === 'drill') return '专项快练'
  if (mode === 'chat') return '自由问答'
  if (mode === 'luogu') return '洛谷题单'
  return '蓝桥刷题'
}

function dataSourceLabel(source: DataSource) {
  if (source === 'paste') return '粘贴文本'
  if (source === 'pdf') return 'PDF 文件'
  return '仓库目录'
}

function countTextWords(input: string): number {
  const text = input.trim()
  if (!text) return 0
  const words = text.split(/\s+/).filter(Boolean).length
  const hanChars = Array.from(text).filter((ch) => /[\u4e00-\u9fff]/.test(ch)).length
  return Math.max(words, hanChars)
}

function mockStagePrefix(stageIndex: number) {
  return [`[阶段 ${stageIndex + 1}/`, `[Stage ${stageIndex + 1}/`]
}

function hasUserAnswerForCurrentMockStage(session: Session): boolean {
  if (!session.mock?.active) return false
  const stageIndex = session.mock.stageIndex
  const prefixes = mockStagePrefix(stageIndex)
  const prompt = [...session.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && prefixes.some((prefix) => message.text.startsWith(prefix)))
  const promptTs = prompt?.ts ?? session.mock.startedAt
  return session.messages.some((message) => message.role === 'user' && message.ts > promptTs)
}

function intensityProfile(intensity: number): { title: string; detail: string } {
  const tier = intensityTier(intensity)
  if (tier === 'gentle') {
    return { title: '轻压模式', detail: '追问较少，题目更基础，答题节奏更宽松。' }
  }
  if (tier === 'normal') {
    return { title: '标准模式', detail: '中等追问，难度均衡，要求结构与指标并重。' }
  }
  return { title: '高压模式', detail: '高频追问，高难题占比更高，阶段时间更紧。' }
}

function sessionTitleZh(session: Session) {
  if (/^(Mock Interview|Drill|Chat|Luogu|Lanqiao)\b/i.test(session.title)) {
    const dateText = new Date(session.createdAt).toLocaleDateString()
    if (session.mode === 'mock') return `模拟面试 ${dateText}`
    if (session.mode === 'drill') return `专项快练 ${dateText}`
    if (session.mode === 'chat') return `自由问答 ${dateText}`
    if (session.mode === 'luogu') return `洛谷每日 ${dateText}`
    return `蓝桥刷题 ${dateText}`
  }
  return session.title
}

function nextActionLabel(session: Session, options: { hasLuogu: boolean; hasLanqiao: boolean; canContinueMock: boolean }): string {
  if (session.mode === 'mock') return isMockRunning(session) ? (options.canContinueMock ? '下一步 / 继续' : '请先作答') : '开始模拟（15 分钟）'
  if (session.mode === 'drill') return '开始快练'
  if (session.mode === 'chat') return '进入问答'
  if (session.mode === 'luogu') return options.hasLuogu ? '刷新今日题单' : '生成今日题单'
  return options.hasLanqiao ? '刷新今日训练' : '生成今日训练'
}

function laneqiaoDifficultyLabel(difficulty: LanqiaoDifficulty): string {
  if (difficulty === 'easy') return '简单'
  if (difficulty === 'medium') return '中等'
  if (difficulty === 'hard') return '困难'
  return '全部'
}

function reviewDimensionToMistakeType(dimension: ReviewDimension): MistakeErrorType {
  if (dimension === 'structure') return 'expression'
  if (dimension === 'correctness') return 'concept'
  if (dimension === 'tradeoffs') return 'boundary'
  if (dimension === 'metrics') return 'complexity'
  return 'implementation'
}

type AppScreen = 'interview' | 'lesson408' | 'mistakes' | 'review' | 'dashboard' | 'reminders'

function normalizeScreenForReminder(target: 'lesson408' | 'luogu' | 'lanqiao'): AppScreen {
  if (target === 'lesson408') return 'lesson408'
  return 'interview'
}

function renderMistakeBookMarkdown(dateKey: string, meta: StorageMeta): string {
  const lines: string[] = []
  lines.push(`# 错题本与薄弱点 ${dateKey}`)
  lines.push('')
  lines.push(`- 总条目：${meta.mistakes.length}`)
  lines.push(`- 待处理：${meta.mistakes.filter((item) => item.status === 'open').length}`)
  lines.push(`- 已复习：${meta.mistakes.filter((item) => item.status === 'reviewed').length}`)
  lines.push(`- 已修复：${meta.mistakes.filter((item) => item.status === 'fixed').length}`)
  lines.push('')
  lines.push('## 条目明细')
  meta.mistakes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((item, index) => {
      lines.push(`### ${index + 1}. ${item.topic || '未分类'} [${item.sourceMode}]`)
      lines.push(`- 日期：${item.date}`)
      lines.push(`- 题干：${item.prompt}`)
      lines.push(`- 错因：${ERROR_TYPE_LABELS[item.errorType]}`)
      lines.push(`- 严重度：${item.severity}`)
      lines.push(`- 状态：${item.status}`)
      lines.push(`- 备注：${item.notes || '无'}`)
      lines.push(`- 下次复习：${item.srs.dueDate}（间隔 ${item.srs.intervalDays} 天）`)
      lines.push('')
    })
  return lines.join('\n')
}

function renderReviewQueueMarkdown(dateKey: string, meta: StorageMeta): string {
  const due = meta.mistakes
    .filter((item) => item.status !== 'fixed' && item.srs.dueDate <= dateKey)
    .sort((a, b) => a.srs.dueDate.localeCompare(b.srs.dueDate))

  const lines: string[] = []
  lines.push(`# 今日复习清单 ${dateKey}`)
  lines.push('')
  lines.push(`- 到期条目：${due.length}`)
  lines.push('')
  lines.push('## 复习列表')
  if (due.length === 0) {
    lines.push('- 今日无到期复习。')
  } else {
    due.forEach((item, index) => {
      lines.push(`${index + 1}. [${item.sourceMode}] ${item.topic}`)
      lines.push(`   - 题干：${item.prompt}`)
      lines.push(`   - 错因：${ERROR_TYPE_LABELS[item.errorType]} / 严重度 ${item.severity}`)
      lines.push(`   - 下次复习：${item.srs.dueDate}`)
      lines.push(`   - 备注：${item.notes || '无'}`)
    })
  }
  return lines.join('\n')
}

export default function App() {
  const [bootState] = useState(() => loadCachedState())
  const [sessions, setSessions] = useState<Session[]>(bootState.sessions)
  const [storageMeta, setStorageMeta] = useState<StorageMeta>(bootState.meta)
  const [activeId, setActiveId] = useState<string>(bootState.sessions[0]?.id ?? '')
  const [screen, setScreen] = useState<AppScreen>('interview')
  const [isHydrating, setIsHydrating] = useState(true)
  const [modeSwitchOpen, setModeSwitchOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [sessionFilter, setSessionFilter] = useState<'all' | Mode>('all')
  const autoJumpAppliedRef = useRef(false)

  const active = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? sessions[0] ?? null,
    [sessions, activeId],
  )

  const activeIntensityProfile = useMemo(
    () => intensityProfile(active?.intensity ?? 1),
    [active?.intensity],
  )

  const canContinueMock = useMemo(
    () => (active ? hasUserAnswerForCurrentMockStage(active) : false),
    [active],
  )

  const todayDateKey = toDateKey(new Date())
  const luoguProgress = useMemo(
    () => getDailyProgress(storageMeta, 'luogu', todayDateKey),
    [storageMeta, todayDateKey],
  )
  const lanqiaoProgress = useMemo(
    () => getDailyProgress(storageMeta, 'lanqiao', todayDateKey),
    [storageMeta, todayDateKey],
  )
  const dueReviewCount = useMemo(
    () => storageMeta.mistakes.filter((item) => item.status !== 'fixed' && item.srs.dueDate <= todayDateKey).length,
    [storageMeta.mistakes, todayDateKey],
  )

  const mutateSession = useCallback((sessionId: string, updater: (session: Session) => Session) => {
    setSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...updater(session), updatedAt: Date.now() } : session)),
    )
  }, [])

  const mutateActive = useCallback((updater: (session: Session) => Session) => {
    if (!active) return
    mutateSession(active.id, updater)
  }, [active, mutateSession])

  const updateStorageMeta = useCallback((updater: (meta: StorageMeta) => StorageMeta) => {
    setStorageMeta((prev) => updater(prev))
  }, [])

  const appendActiveAssistantMessage = useCallback(
    (text: string) => {
      mutateActive((session) => ({
        ...session,
        messages: [...session.messages, { id: makeId('m'), role: 'assistant', text, ts: Date.now() }],
      }))
    },
    [mutateActive],
  )

  const setMode = useCallback(
    (mode: Mode) => {
      mutateActive((session) => ({ ...session, mode }))
    },
    [mutateActive],
  )

  const setIntensity = useCallback(
    (intensity: number) => {
      mutateActive((session) => ({ ...session, intensity: clamp(intensity, 1, 10) }))
    },
    [mutateActive],
  )

  const setDataSource = useCallback(
    (dataSource: DataSource) => {
      mutateActive((session) => ({ ...session, dataSource }))
    },
    [mutateActive],
  )

  const syncReminderSettingsForMeta = useCallback(async (meta: Pick<StorageMeta, 'reminders'>) => {
    await syncReminderSettings(meta.reminders)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const state = await loadState()
      if (cancelled) return
      setSessions(state.sessions)
      setStorageMeta(state.meta)
      setActiveId((prev) => (state.sessions.some((session) => session.id === prev) ? prev : state.sessions[0]?.id ?? ''))
      setIsHydrating(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isHydrating) return
    void saveState({ version: 2, sessions, meta: storageMeta })
  }, [sessions, storageMeta, isHydrating])

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(''), 2600)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  useEffect(() => {
    if (isHydrating) return
    void syncReminderSettingsForMeta({ reminders: storageMeta.reminders })
  }, [isHydrating, storageMeta.reminders, syncReminderSettingsForMeta])

  useEffect(() => {
    const unsubscribe = subscribeReminderNavigation((payload) => {
      setScreen(normalizeScreenForReminder(payload.target))
      if (payload.target === 'luogu') {
        setMode('luogu')
      } else if (payload.target === 'lanqiao') {
        setMode('lanqiao')
      }
      setStatusMessage(`提醒已触发：已跳转到${payload.target === 'lesson408' ? ' 408 每日小课' : payload.target === 'luogu' ? ' 洛谷题单' : ' 蓝桥刷题'}`)
    })
    return unsubscribe
  }, [setMode])

  useEffect(() => {
    if (isHydrating) return
    if (autoJumpAppliedRef.current) return
    if (!storageMeta.appSettings.autoJumpTodayTask) return
    if (!active) return

    autoJumpAppliedRef.current = true
    const timer = window.setTimeout(() => {
      if (dueReviewCount > 0) {
        setScreen('review')
        setStatusMessage(`今日有 ${dueReviewCount} 条到期复习，已自动跳转`)
        return
      }

      if (!storageMeta.dailyLesson.completedByDate[todayDateKey]) {
        setScreen('lesson408')
        setStatusMessage('已自动跳转到 408 今日任务')
        return
      }

      if (!luoguProgress || luoguProgress.doneCount < luoguProgress.totalCount) {
        setScreen('interview')
        setMode('luogu')
        setStatusMessage('已自动跳转到洛谷今日题单')
        return
      }

      if (!lanqiaoProgress || lanqiaoProgress.doneCount < lanqiaoProgress.totalCount) {
        setScreen('interview')
        setMode('lanqiao')
        setStatusMessage('已自动跳转到蓝桥今日训练')
        return
      }

      setScreen('dashboard')
      setStatusMessage('今日任务已完成，已跳转到数据面板')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [
    active,
    dueReviewCount,
    isHydrating,
    lanqiaoProgress,
    luoguProgress,
    setMode,
    storageMeta.appSettings.autoJumpTodayTask,
    storageMeta.dailyLesson.completedByDate,
    todayDateKey,
  ])

  function createSession() {
    const session = newSession(active?.mode ?? 'mock')
    setSessions((prev) => [session, ...prev])
    setActiveId(session.id)
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== id)
      if (remaining.length === 0) {
        const replacement = newSession('mock')
        setActiveId(replacement.id)
        return [replacement]
      }
      if (activeId === id) setActiveId(remaining[0].id)
      return remaining
    })
  }

  function setSessionModeConfig(updater: (config: Session['modeConfig']) => Session['modeConfig']) {
    mutateActive((session) => ({ ...session, modeConfig: updater(session.modeConfig) }))
  }

  const importContext = useCallback(
    async (source: DataSource) => {
      if (!active) return

      if (source === 'paste') {
        const text = active.resumeText.trim()
        if (!text) {
          setStatusMessage('请先粘贴简历或项目内容')
          return
        }
        mutateSession(active.id, (session) => ({
          ...session,
          contextImport: {
            source,
            importedAt: Date.now(),
            wordCount: countTextWords(text),
            fileCount: 0,
          },
        }))
        setStatusMessage('文本已导入到当前会话')
        return
      }

      const targetPath = source === 'pdf' ? active.pdfPath?.trim() ?? '' : active.repoPath?.trim() ?? ''
      if (!targetPath) {
        setStatusMessage(source === 'pdf' ? '请先填写 PDF 路径' : '请先填写仓库路径')
        return
      }

      const inspect = await inspectImportPath(source, targetPath)
      if (!inspect.exists) {
        setStatusMessage(inspect.error ?? '路径不存在或不可访问')
        return
      }

      mutateSession(active.id, (session) => ({
        ...session,
        contextImport: {
          source,
          importedAt: Date.now(),
          wordCount: 0,
          fileCount: inspect.fileCount,
          path: targetPath,
        },
      }))
      setStatusMessage(source === 'pdf' ? 'PDF 路径已导入' : `仓库已导入（约 ${inspect.fileCount} 个文件）`)
    },
    [active, mutateSession],
  )

  function clearImportedContext() {
    mutateActive((session) => ({ ...session, contextImport: null }))
    setStatusMessage('已清空导入上下文')
  }

  const startDrill = useCallback(() => {
    mutateActive((session) => {
      const now = Date.now()
      const importedSource = session.contextImport?.source

      const seedInput =
        importedSource === 'paste'
          ? session.resumeText.trim()
          : importedSource === 'pdf'
            ? session.contextImport?.path?.trim() || session.pdfPath?.trim() || ''
            : importedSource === 'repo'
              ? session.contextImport?.path?.trim() || session.repoPath?.trim() || ''
              : session.dataSource === 'paste'
                ? session.resumeText.trim()
                : session.dataSource === 'pdf'
                  ? session.pdfPath?.trim() || ''
                  : session.repoPath?.trim() || ''

      const profile = extractProfileFromFreeform(seedInput)
      const project = profile.projects[0] ?? { name: '订单系统', tech: ['SpringBoot', 'MySQL'] }

      const bank = loadSeedBankFromDisk()
      const asked = new Set(session.messages.filter((message) => message.role === 'assistant').map((message) => message.id))
      const question = chooseNextQuestion(bank, project, 'drill', session.intensity, asked)

      const intro = {
        id: makeId('m'),
        role: 'assistant' as const,
        text: `已开始快练：目标项目 ${project.name}；技术栈 ${project.tech.join(' ')}。`,
        ts: now,
      }

      const questionMessage = {
        id: makeId('m'),
        role: 'assistant' as const,
        text: renderQuestionZh(question, project, session.intensity),
        ts: now + 1,
      }

      return { ...session, messages: [...session.messages, intro, questionMessage], mode: 'drill' }
    })
  }, [mutateActive])

  const startMockInterviewFlow = useCallback(() => {
    if (!active) return
    const { mock, nextCursor } = createMockInterview(active, storageMeta.backendTopicCursor)
    const kickoff = createMockKickoffMessages(mock)

    setStorageMeta((prev) => ({ ...prev, backendTopicCursor: nextCursor }))
    mutateSession(active.id, (session) => ({
      ...session,
      mode: 'mock',
      mock,
      messages: [...session.messages, ...kickoff],
      reviewReport: null,
    }))
  }, [active, mutateSession, storageMeta.backendTopicCursor])

  const continueMockFlow = useCallback(
    (skipCurrent: boolean = false) => {
      if (!active?.mock?.active) return

      const hasAnswer = hasUserAnswerForCurrentMockStage(active)
      if (!hasAnswer && !skipCurrent) {
        setStatusMessage('当前阶段还没作答，请先发送回答，或点击“跳过本题”')
        return
      }

      mutateSession(active.id, (session) => {
        if (!session.mock) return session
        const currentStage = session.mock.stages[session.mock.stageIndex]
        const transitionMessage = {
          id: makeId('m'),
          role: 'assistant' as const,
          text: hasAnswer
            ? `已记录「${currentStage?.title ?? '当前阶段'}」的回答，继续下一阶段。`
            : `你选择跳过「${currentStage?.title ?? '当前阶段'}」，继续下一阶段。`,
          ts: Date.now(),
        }

        const step = advanceMockInterview(session.mock)
        const nextSession = {
          ...session,
          mock: step.mock,
          messages: [...session.messages, transitionMessage, step.message],
        }
        return step.completed ? { ...nextSession, reviewReport: generateReviewReport(nextSession) } : nextSession
      })
    },
    [active, mutateSession],
  )

  const generateLuoguDaily = useCallback(() => {
    if (!active) return
    const dateKey = toDateKey(new Date())
    const sourceId = active.modeConfig.luoguSourceId ?? LUOGU_SOURCES[0].id
    const existing = getDailyProgress(storageMeta, 'luogu', dateKey)
    const progress = generateLuoguDailyProgress({
      dateKey,
      sourceId,
      existing,
    })

    updateStorageMeta((meta) => saveDailyProgress(meta, progress))
    mutateSession(active.id, (session) => ({
      ...session,
      mode: 'luogu',
      messages: [
        ...session.messages,
        {
          id: makeId('m'),
          role: 'assistant',
          text: `洛谷每日题单已生成：${progress.dateKey}（${progress.doneCount}/${progress.totalCount} 完成）`,
          ts: Date.now(),
        },
      ],
    }))
    setStatusMessage(`洛谷题单已生成：${progress.totalCount} 题`)
  }, [active, mutateSession, storageMeta, updateStorageMeta])

  const generateLanqiaoDaily = useCallback(() => {
    if (!active) return
    const dateKey = toDateKey(new Date())
    const planType: LanqiaoPlanType = active.modeConfig.lanqiaoPlanType ?? 'daily'
    const topic = active.modeConfig.lanqiaoTopic ?? LANQIAO_TOPIC_OPTIONS[0]
    const difficulty: LanqiaoDifficulty = active.modeConfig.lanqiaoDifficulty ?? 'all'
    const existing = getDailyProgress(storageMeta, 'lanqiao', dateKey)

    const progress = generateLanqiaoDailyProgress({
      dateKey,
      planType,
      topic,
      difficulty,
      existing,
    })

    updateStorageMeta((meta) => saveDailyProgress(meta, progress))
    mutateSession(active.id, (session) => ({
      ...session,
      mode: 'lanqiao',
      messages: [
        ...session.messages,
        {
          id: makeId('m'),
          role: 'assistant',
          text: `蓝桥杯今日训练已生成：${progress.dateKey}（模式：${progress.planType === 'topic' ? '专题训练' : '每日 1-2 题'}）`,
          ts: Date.now(),
        },
      ],
    }))
    setStatusMessage(`蓝桥杯训练已生成：${progress.totalCount} 题`)
  }, [active, mutateSession, storageMeta, updateStorageMeta])

  const saveDailySnapshot = useCallback(
    (modeId: DailyModeId) => {
      const dateKey = toDateKey(new Date())
      const progress = getDailyProgress(storageMeta, modeId, dateKey)
      if (!progress) {
        setStatusMessage(modeId === 'luogu' ? '今天还没有洛谷题单，先生成后再保存' : '今天还没有蓝桥训练，先生成后再保存')
        return
      }
      setStatusMessage(`${modeId === 'luogu' ? '洛谷' : '蓝桥'}进度已保存：${progress.doneCount}/${progress.totalCount}`)
      appendActiveAssistantMessage(`${modeId === 'luogu' ? '洛谷题单' : '蓝桥训练'}进度已保存：${progress.doneCount}/${progress.totalCount}`)
    },
    [appendActiveAssistantMessage, storageMeta],
  )

  function runSelectedMode() {
    if (!active) return

    if (active.mode === 'mock') {
      if (isMockRunning(active)) {
        continueMockFlow()
      } else {
        startMockInterviewFlow()
      }
      return
    }

    if (active.mode === 'drill') {
      startDrill()
      return
    }

    if (active.mode === 'chat') {
      mutateActive((session) => {
        const now = Date.now()
        return {
          ...session,
          messages: [
            ...session.messages,
            {
              id: makeId('m'),
              role: 'assistant',
              text: '自由问答已就绪。发来一段回答，我会帮你按结构、指标、风险做优化。',
              ts: now,
            },
          ],
        }
      })
      return
    }

    if (active.mode === 'luogu') {
      generateLuoguDaily()
      return
    }

    generateLanqiaoDaily()
  }

  function sendUserMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    mutateActive((session) => {
      const now = Date.now()
      const userMessage = { id: makeId('m'), role: 'user' as const, text: trimmed, ts: now }

      let assistantText = '已记录，准备好后继续。'
      if (session.mode === 'mock' && session.mock?.active) {
        const stage = session.mock.stages[session.mock.stageIndex]
        assistantText = `已记录「${stage?.title ?? '当前阶段'}」。按 Cmd/Ctrl+Enter 进入下一阶段。`
      } else if (session.mode === 'drill') {
        assistantText = '不错，继续按这个顺序答：结构 -> 正确性 -> 取舍 -> 指标 -> 风险。'
      } else if (session.mode === 'chat') {
        assistantText = '很好，要不要我把它整理成 60 秒 STAR 版本？'
      }

      const assistantMessage = {
        id: makeId('m'),
        role: 'assistant' as const,
        text: assistantText,
        ts: now + 1,
      }

      return { ...session, messages: [...session.messages, userMessage, assistantMessage] }
    })
  }

  function generateReview() {
    mutateActive((session) => ({ ...session, reviewReport: generateReviewReport(session) }))
    setStatusMessage('复盘报告已生成')
  }

  const saveInterviewReport = useCallback(async () => {
    if (!active) return

    let sessionToSave = active
    if (!sessionToSave.reviewReport) {
      const reviewReport = generateReviewReport(sessionToSave)
      sessionToSave = { ...sessionToSave, reviewReport }
      mutateSession(sessionToSave.id, (session) => ({ ...session, reviewReport }))
    }

    const result = await saveSessionReport(sessionToSave)
    if (result.error) {
      setStatusMessage(`保存失败：${result.error}`)
      return
    }
    if (result.canceled) {
      setStatusMessage('已取消保存')
      return
    }

    mutateSession(sessionToSave.id, (session) => ({ ...session, lastSavedReportAt: Date.now() }))
    setStatusMessage(result.path ? `已保存报告：${result.path}` : '报告已保存')
  }, [active, mutateSession])

  const exportLuoguMarkdown = useCallback(async () => {
    if (!active) return
    const dateKey = toDateKey(new Date())
    const sourceId = active.modeConfig.luoguSourceId ?? LUOGU_SOURCES[0].id
    const existing = getDailyProgress(storageMeta, 'luogu', dateKey)
    const progress = existing ?? generateLuoguDailyProgress({ dateKey, sourceId })

    if (!existing) {
      updateStorageMeta((meta) => saveDailyProgress(meta, progress))
    }

    const markdown = renderLuoguMarkdown(progress)
    const result = await exportMarkdownFile(`${dateKey}-luogu.md`, markdown)
    if (result.error) {
      setStatusMessage(`导出失败：${result.error}`)
      return
    }

    mutateSession(active.id, (session) => ({ ...session, lastSavedReportAt: Date.now() }))
    setStatusMessage(result.path ? `已导出：${result.path}` : '导出完成')
  }, [active, mutateSession, storageMeta, updateStorageMeta])

  const exportLanqiaoMarkdown = useCallback(async () => {
    if (!active) return
    const dateKey = toDateKey(new Date())
    const existing = getDailyProgress(storageMeta, 'lanqiao', dateKey)
    const progress =
      existing ??
      generateLanqiaoDailyProgress({
        dateKey,
        planType: active.modeConfig.lanqiaoPlanType ?? 'daily',
        topic: active.modeConfig.lanqiaoTopic ?? LANQIAO_TOPIC_OPTIONS[0],
        difficulty: active.modeConfig.lanqiaoDifficulty ?? 'all',
      })

    if (!existing) {
      updateStorageMeta((meta) => saveDailyProgress(meta, progress))
    }

    const markdown = renderLanqiaoMarkdown(progress)
    const result = await exportMarkdownFile(`${dateKey}-lanqiao.md`, markdown)
    if (result.error) {
      setStatusMessage(`导出失败：${result.error}`)
      return
    }

    mutateSession(active.id, (session) => ({ ...session, lastSavedReportAt: Date.now() }))
    setStatusMessage(result.path ? `已导出：${result.path}` : '导出完成')
  }, [active, mutateSession, storageMeta, updateStorageMeta])

  const markLessonDone = useCallback(() => {
    const now = Date.now()
    updateStorageMeta((previous) => ({
      ...previous,
      dailyLesson: {
        ...previous.dailyLesson,
        completedByDate: {
          ...previous.dailyLesson.completedByDate,
          [todayDateKey]: now,
        },
      },
    }))
    setStatusMessage('408 今日进度已保存/打卡')
  }, [todayDateKey, updateStorageMeta])

  const exportLessonMarkdown = useCallback(async () => {
    const weaknessProfile = buildWeaknessProfile(storageMeta.mistakes, todayDateKey)
    const lesson = buildDailyLesson({
      topicOverride: storageMeta.dailyLesson.topicOverride,
      level: storageMeta.dailyLesson.level,
      weaknessProfile,
    })
    const todayMistakes = storageMeta.mistakes.filter((item) => item.sourceMode === '408' && item.date === lesson.dateKey)
    const markdown = renderDailyLessonMarkdown(lesson, {
      completedAt: storageMeta.dailyLesson.completedByDate[lesson.dateKey],
      todayMistakes,
    })
    const result = await exportMarkdownFile(`${lesson.dateKey}-408.md`, markdown)
    if (result.error) {
      setStatusMessage(`导出失败：${result.error}`)
      return
    }
    setStatusMessage(result.path ? `已导出：${result.path}` : '导出完成')
  }, [storageMeta, todayDateKey])

  const addMistake = useCallback(
    (input: {
      sourceMode: '408' | 'luogu' | 'lanqiao' | 'interview'
      topic: string
      prompt: string
      errorType?: MistakeErrorType
      notes?: string
      tags?: string[]
      severity?: number
      myAnswer?: string
      expected?: string
    }) => {
      if (!input.prompt.trim()) return
      const item = createMistakeItem({
        sourceMode: input.sourceMode,
        topic: input.topic,
        prompt: input.prompt,
        errorType: input.errorType,
        notes: input.notes,
        tags: input.tags,
        severity: input.severity,
        myAnswer: input.myAnswer,
        expected: input.expected,
        dateKey: todayDateKey,
      })
      updateStorageMeta((meta) => ({
        ...meta,
        mistakes: [item, ...meta.mistakes],
      }))
      setStatusMessage('已加入错题本')
    },
    [todayDateKey, updateStorageMeta],
  )

  const exportMistakeMarkdown = useCallback(async () => {
    const markdown = renderMistakeBookMarkdown(todayDateKey, storageMeta)
    const result = await exportMarkdownFile(`${todayDateKey}-mistakes.md`, markdown)
    if (result.error) {
      setStatusMessage(`导出失败：${result.error}`)
      return
    }
    setStatusMessage(result.path ? `已导出：${result.path}` : '导出完成')
  }, [storageMeta, todayDateKey])

  const exportReviewMarkdown = useCallback(async () => {
    const markdown = renderReviewQueueMarkdown(todayDateKey, storageMeta)
    const result = await exportMarkdownFile(`${todayDateKey}-review.md`, markdown)
    if (result.error) {
      setStatusMessage(`导出失败：${result.error}`)
      return
    }
    setStatusMessage(result.path ? `已导出：${result.path}` : '导出完成')
  }, [storageMeta, todayDateKey])

  const generateDailySummaryReport = useCallback(async () => {
    const lessonResult = await readMarkdownFile(`${todayDateKey}-408.md`)
    const luoguResult = await readMarkdownFile(`${todayDateKey}-luogu.md`)
    const lanqiaoResult = await readMarkdownFile(`${todayDateKey}-lanqiao.md`)

    const weaknessTop = aggregateMistakeTop(storageMeta.mistakes, todayDateKey, 3)
    const tomorrowPlan: string[] = []
    if (!storageMeta.dailyLesson.completedByDate[todayDateKey]) {
      tomorrowPlan.push('先完成 408 小课，并记录至少 1 条薄弱点。')
    } else {
      tomorrowPlan.push('复述 408 今日卡片，并做 1 题微练习。')
    }
    if (!luoguProgress || luoguProgress.doneCount < luoguProgress.totalCount) {
      tomorrowPlan.push('补完洛谷未完成题，并写 1 条错因。')
    } else {
      tomorrowPlan.push('洛谷加练 1 题同标签题。')
    }
    if (!lanqiaoProgress || lanqiaoProgress.doneCount < lanqiaoProgress.totalCount) {
      tomorrowPlan.push('蓝桥至少完成 1 题，并补全复盘卡。')
    } else {
      tomorrowPlan.push('蓝桥复盘 1 题并优化复杂度表达。')
    }

    const markdown = renderDailyReport({
      dateKey: todayDateKey,
      lesson408: lessonResult.exists ? lessonResult.content : null,
      luogu: luoguResult.exists ? luoguResult.content : null,
      lanqiao: lanqiaoResult.exists ? lanqiaoResult.content : null,
      weaknessTop,
      tomorrowPlan: tomorrowPlan.slice(0, 3),
    })

    const result = await exportMarkdownFile(`${todayDateKey}.md`, markdown)
    if (result.error) {
      setStatusMessage(`生成日报失败：${result.error}`)
      return
    }
    setStatusMessage(result.path ? `今日日报已生成：${result.path}` : '今日日报已生成')
  }, [lanqiaoProgress, luoguProgress, storageMeta, todayDateKey])

  const exportCurrentMode = useCallback(async () => {
    if (!active) return
    const definition = MODE_MAP[active.mode]
    const runtime: ModeRuntimeState = {
      session: active,
      meta: storageMeta,
      renderers: {
        interviewEntry: () => null,
        interviewMain: () => null,
        luoguEntry: () => null,
        luoguMain: () => null,
        lanqiaoEntry: () => null,
        lanqiaoMain: () => null,
      },
      exporters: {
        interview: saveInterviewReport,
        luogu: exportLuoguMarkdown,
        lanqiao: exportLanqiaoMarkdown,
      },
    }
    await definition.exportHandler(runtime)
  }, [active, storageMeta, saveInterviewReport, exportLuoguMarkdown, exportLanqiaoMarkdown])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && modeSwitchOpen) {
        event.preventDefault()
        setModeSwitchOpen(false)
        return
      }

      if (!(event.metaKey || event.ctrlKey)) return

      if (event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setScreen('interview')
        setModeSwitchOpen(true)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        if (screen === 'interview') {
          if (!active) return
          if (active.mode === 'mock') {
            if (isMockRunning(active)) continueMockFlow(event.shiftKey)
            else startMockInterviewFlow()
            return
          }

          if (active.mode === 'drill') {
            startDrill()
            return
          }

          if (active.mode === 'luogu') {
            saveDailySnapshot('luogu')
            return
          }

          if (active.mode === 'lanqiao') {
            saveDailySnapshot('lanqiao')
            return
          }
          return
        }

        if (screen === 'lesson408') {
          markLessonDone()
          return
        }

        if (screen === 'review') {
          setStatusMessage('复习评分会自动保存，无需额外操作')
          return
        }

        if (screen === 'mistakes') {
          setStatusMessage('错题本编辑已自动保存')
          return
        }

        if (screen === 'reminders') {
          setStatusMessage('提醒设置已自动保存')
          return
        }

        if (screen === 'dashboard') {
          void generateDailySummaryReport()
          return
        }
        return
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (screen === 'interview') {
          void exportCurrentMode()
          return
        }
        if (screen === 'lesson408') {
          void exportLessonMarkdown()
          return
        }
        if (screen === 'mistakes') {
          void exportMistakeMarkdown()
          return
        }
        if (screen === 'review') {
          void exportReviewMarkdown()
          return
        }
        if (screen === 'dashboard') {
          void generateDailySummaryReport()
          return
        }
        if (screen === 'reminders') {
          setStatusMessage('提醒配置已保存')
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    active,
    continueMockFlow,
    exportCurrentMode,
    exportLessonMarkdown,
    exportMistakeMarkdown,
    exportReviewMarkdown,
    generateDailySummaryReport,
    markLessonDone,
    modeSwitchOpen,
    saveDailySnapshot,
    screen,
    startDrill,
    startMockInterviewFlow,
  ])

  if (!active) return null

  const modeDefinition = MODE_MAP[active.mode]

  const renderInterviewEntry = () => {
    const isMockInProgress = active.mode === 'mock' && isMockRunning(active)
    const setupActionLabel = nextActionLabel(active, {
      hasLuogu: Boolean(luoguProgress),
      hasLanqiao: Boolean(lanqiaoProgress),
      canContinueMock,
    })
    const setupActionDisabled = isMockInProgress && !canContinueMock

    return (
      <section className="panel controls">
        <div className="panelHeader">
          <div>
            <div className="panelTitle">训练设置</div>
            <div className="panelSub">模式 + 强度 + 本地上下文导入</div>
          </div>
        </div>

        <div className="importBox compact">
          <div className="label">会话名称（可重命名）</div>
          <input
            value={active.title}
            onChange={(event) => mutateActive((session) => ({ ...session, title: event.target.value }))}
            placeholder="输入会话名称"
          />
        </div>

        <div className="fieldRow">
          <div className="seg">
            {MODES.map((mode) => (
              <button
                key={`inline-mode-${mode.id}`}
                className={active.mode === mode.id ? 'segBtn active' : 'segBtn'}
                onClick={() => setMode(mode.id)}
                title={mode.shortDesc}
              >
                {modeShortLabel(mode.id)}
              </button>
            ))}
          </div>

          <div className="intensity">
            <div className="label">强度</div>
            <input
              type="range"
              min={1}
              max={10}
              value={active.intensity}
              onChange={(event) => setIntensity(Number(event.target.value))}
            />
            <div className="pill">{active.intensity}/10</div>
          </div>
        </div>
        <div className="importBox compact">
          <div className="hint">强度映射：{activeIntensityProfile.title} · {activeIntensityProfile.detail}</div>
        </div>

        <div className="fieldRow">
          <div className="seg">
            <button className={active.dataSource === 'paste' ? 'segBtn active' : 'segBtn'} onClick={() => setDataSource('paste')}>
              粘贴
            </button>
            <button className={active.dataSource === 'pdf' ? 'segBtn active' : 'segBtn'} onClick={() => setDataSource('pdf')}>
              PDF
            </button>
            <button className={active.dataSource === 'repo' ? 'segBtn active' : 'segBtn'} onClick={() => setDataSource('repo')}>
              仓库
            </button>
          </div>

          <button className="btn primary" onClick={runSelectedMode} disabled={setupActionDisabled}>
            {setupActionLabel}
          </button>
        </div>

        {active.contextImport ? (
          <div className="importBox compact">
            <div className="label">导入状态</div>
            <div className="hint">
              来源：{dataSourceLabel(active.contextImport.source)} · 字数：{active.contextImport.wordCount} · 文件数：
              {active.contextImport.fileCount} · 最近导入：{formatWhen(active.contextImport.importedAt)}
            </div>
            {active.contextImport.path ? <div className="hint">路径：{active.contextImport.path}</div> : null}
            <div className="inline">
              <button className="btn" onClick={clearImportedContext}>
                清空导入
              </button>
              <button className="btn" onClick={() => void importContext(active.contextImport?.source ?? active.dataSource)}>
                重新导入
              </button>
            </div>
          </div>
        ) : (
          <div className="importBox compact">
            <div className="hint">尚未导入上下文。导入后会显示来源、字数/文件数和时间。</div>
          </div>
        )}

        {active.mode === 'mock' && active.mock ? (
          <div className="importBox compact">
            <div className="label">模拟状态</div>
            <div className="hint">
              {active.mock.active
                ? `进行中：第 ${Math.min(active.mock.stageIndex + 1, active.mock.stages.length)}/${active.mock.stages.length} 阶段 · 后端主题：${active.mock.backendTopic}`
                : `上次完成时间：${formatWhen(active.mock.completedAt ?? active.updatedAt)}`}
            </div>
          </div>
        ) : null}

        {active.dataSource === 'paste' ? (
          <div className="importBox">
            <div className="label">简历文本</div>
            <textarea
              value={active.resumeText}
              placeholder="在这里粘贴简历或项目摘要..."
              onChange={(event) => mutateActive((session) => ({ ...session, resumeText: event.target.value }))}
              rows={10}
            />
            <div className="inline">
              <button className="btn" onClick={() => void importContext('paste')}>
                导入文本
              </button>
            </div>
          </div>
        ) : active.dataSource === 'pdf' ? (
          <div className="importBox">
            <div className="label">PDF 导入（占位）</div>
            <div className="inline">
              <input
                value={active.pdfPath ?? ''}
                placeholder="/你的路径/简历.pdf"
                onChange={(event) => mutateActive((session) => ({ ...session, pdfPath: event.target.value }))}
              />
              <button className="btn" onClick={() => void importContext('pdf')}>
                导入 PDF
              </button>
            </div>
            <div className="hint">文件选择与解析能力可后续接入。</div>
          </div>
        ) : (
          <div className="importBox">
            <div className="label">仓库导入（占位）</div>
            <div className="inline">
              <input
                value={active.repoPath ?? ''}
                placeholder="/你的路径/repo"
                onChange={(event) => mutateActive((session) => ({ ...session, repoPath: event.target.value }))}
              />
              <button className="btn" onClick={() => void importContext('repo')}>
                导入仓库
              </button>
            </div>
            <div className="hint">本地索引与检索能力可后续接入。</div>
          </div>
        )}
      </section>
    )
  }

  const renderInterviewMain = () => {
    const reviewReport = active.reviewReport
    return (
      <>
        <section className="panel stage">
          <div className="panelHeader">
            <div>
              <div className="panelTitle">面试过程</div>
              <div className="panelSub">可回放对话 · Cmd/Ctrl+Enter 继续 · Shift+Cmd/Ctrl+Enter 跳过当前阶段</div>
            </div>
          </div>

          <ChatPanel
            key={active.id}
            session={active}
            onSend={sendUserMessage}
            onContinue={continueMockFlow}
            canContinueMock={canContinueMock}
          />
        </section>

        <section className="panel review">
          <div className="panelHeader">
            <div>
              <div className="panelTitle">复盘报告</div>
              <div className="panelSub">五维评分 + 3 条改进建议 + 明日计划</div>
            </div>
          </div>

          <div className="importBox">
            <div className="label">备注</div>
            <textarea
              value={active.reviewNotes}
              placeholder="记录你的观察、问题和改进点..."
              onChange={(event) => mutateActive((session) => ({ ...session, reviewNotes: event.target.value }))}
              rows={7}
            />
            <div className="inline reviewActions">
              <button className="btn" onClick={generateReview}>
                生成复盘
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (!reviewReport) {
                    setStatusMessage('请先生成复盘再入库薄弱点')
                    return
                  }
                  const weakest = (Object.keys(DIMENSION_LABELS) as ReviewDimension[]).sort(
                    (a, b) => reviewReport.dimensions[a].score - reviewReport.dimensions[b].score,
                  )[0]
                  addMistake({
                    sourceMode: 'interview',
                    topic: `面试复盘：${DIMENSION_LABELS[weakest]}`,
                    prompt: `面试表达短板：${DIMENSION_LABELS[weakest]}`,
                    errorType: reviewDimensionToMistakeType(weakest),
                    notes: reviewReport.dimensions[weakest].note,
                    severity: 3,
                  })
                }}
              >
                记入薄弱点
              </button>
              <button className="btn primary" onClick={() => void saveInterviewReport()}>
                保存报告（Cmd/Ctrl+S）
              </button>
            </div>
            <div className="hint">
              {active.lastSavedReportAt ? `最近保存：${formatWhen(active.lastSavedReportAt)}` : '报告包含对话、评分和练习计划。'}
            </div>
          </div>

          {reviewReport ? (
            <>
              <div className="importBox compact">
                <div className="label">总分</div>
                <div className="overallScore">{reviewReport.overall}/5</div>
                <div className="hint">{reviewReport.summary}</div>
              </div>

              <div className="cards">
                {(Object.keys(DIMENSION_LABELS) as ReviewDimension[]).map((dimension) => {
                  const entry = reviewReport.dimensions[dimension]
                  return (
                    <div key={dimension} className="card">
                      <div className="cardKicker">维度</div>
                      <div className="cardTitle">{DIMENSION_LABELS[dimension]}</div>
                      <div className="scoreRow">
                        <span className="scoreBadge">{entry.score}/5</span>
                      </div>
                      <div className="cardBody">{entry.note}</div>
                    </div>
                  )
                })}
              </div>

              <div className="importBox compact">
                <div className="label">3 条可执行改进</div>
                <ol className="plainList">
                  {reviewReport.actionableImprovements.slice(0, 3).map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ol>
              </div>

              <div className="importBox compact">
                <div className="label">明日练习计划</div>
                <ol className="plainList">
                  {reviewReport.tomorrowPracticePlan.map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <div className="importBox compact">
              <div className="hint">暂未生成评分卡，请先完成至少一轮回答。</div>
            </div>
          )}
        </section>
      </>
    )
  }

  const renderLuoguEntry = () => {
    const sourceId = active.modeConfig.luoguSourceId ?? LUOGU_SOURCES[0].id
    const selectedSource = LUOGU_SOURCES.find((source) => source.id === sourceId) ?? LUOGU_SOURCES[0]
    const summary = luoguProgress ? `完成 ${luoguProgress.doneCount}/${luoguProgress.totalCount}` : '今日尚未生成题单'

    return (
      <section className="panel controls">
        <div className="panelHeader">
          <div>
            <div className="panelTitle">洛谷题单每日推送</div>
            <div className="panelSub">每日固定抽题，完成状态会自动持久化。</div>
          </div>
        </div>

        <div className="importBox compact">
          <div className="label">模式切换</div>
          <div className="seg">
            {MODES.map((mode) => (
              <button
                key={`luogu-mode-${mode.id}`}
                className={active.mode === mode.id ? 'segBtn active' : 'segBtn'}
                onClick={() => setMode(mode.id)}
              >
                {modeShortLabel(mode.id)}
              </button>
            ))}
          </div>
        </div>

        <div className="importBox compact">
          <div className="label">今日日期（Asia/Shanghai）</div>
          <div className="pill">{todayDateKey}</div>
        </div>

        <div className="importBox compact">
          <div className="label">题单来源</div>
          <select
            value={sourceId}
            onChange={(event) =>
              setSessionModeConfig((config) => ({
                ...config,
                luoguSourceId: event.target.value,
              }))
            }
          >
            {LUOGU_SOURCES.map((source) => (
              <option key={source.id} value={source.id}>
                {source.title}
              </option>
            ))}
          </select>
          <div className="hint">{selectedSource.description}</div>
        </div>

        <div className="importBox compact">
          <div className="inline">
            <button className="btn primary" onClick={generateLuoguDaily}>
              生成 / 刷新今日题单
            </button>
            <button className="btn" onClick={() => void exportLuoguMarkdown()}>
              导出 Markdown
            </button>
          </div>
          <div className="hint">{summary}</div>
          <div className="hint">快捷键：Cmd/Ctrl+Enter 保存进度 · Cmd/Ctrl+S 导出</div>
        </div>
      </section>
    )
  }

  const renderLuoguMain = () => {
    const dateKey = toDateKey(new Date())

    return (
      <section className="panel stage">
        <div className="panelHeader">
          <div>
            <div className="panelTitle">今日洛谷题单</div>
            <div className="panelSub">可追踪、可复盘、可导出；状态自动保存。</div>
          </div>
        </div>

        {luoguProgress ? (
          <div className="importBox dailyTasks">
            <div className="dailySummaryRow">
              <div className="pill">完成 {luoguProgress.doneCount}/{luoguProgress.totalCount}</div>
              <div className="hint">最后更新：{formatWhen(luoguProgress.updatedAt)}</div>
            </div>

            <div className="taskList">
              {luoguProgress.tasks.map((task) => (
                <article key={task.taskId} className="taskCard">
                  <div className="taskHeader">
                    <label className="taskCheck">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={(event) =>
                          updateStorageMeta((meta) =>
                            patchDailyTask(meta, 'luogu', dateKey, task.taskId, (current) => ({
                              ...current,
                              status: event.target.checked ? 'done' : 'todo',
                            })),
                          )
                        }
                      />
                      <span>{task.taskId}</span>
                    </label>
                    <span className="pill">{task.difficulty}</span>
                  </div>
                  <div className="taskTitle">{task.title}</div>
                  {task.url ? (
                    <a className="taskLink" href={task.url} target="_blank" rel="noreferrer">
                      {task.url}
                    </a>
                  ) : null}
                  <textarea
                    rows={2}
                    placeholder="备注：卡点、时间、思路摘要"
                    value={task.note}
                    onChange={(event) =>
                      updateStorageMeta((meta) =>
                        patchDailyTask(meta, 'luogu', dateKey, task.taskId, (current) => ({
                          ...current,
                          note: event.target.value,
                        })),
                      )
                    }
                  />
                  <div className="inline">
                    <button
                      className="btn"
                      onClick={() =>
                        addMistake({
                          sourceMode: 'luogu',
                          topic: task.title,
                          prompt: `${task.taskId} ${task.title}`,
                          errorType: 'unknown',
                          notes: task.note || '洛谷题目练习中遇到困难。',
                          tags: [task.difficulty],
                          severity: task.status === 'done' ? 2 : 3,
                        })
                      }
                    >
                      加入错题本
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="inline">
              <button className="btn" onClick={() => saveDailySnapshot('luogu')}>
                保存进度（Cmd/Ctrl+Enter）
              </button>
              <button className="btn primary" onClick={() => void exportLuoguMarkdown()}>
                导出 Markdown（Cmd/Ctrl+S）
              </button>
            </div>

            <div className="label">今日总备注</div>
            <textarea
              className="dailySummaryTextarea"
              rows={3}
              value={luoguProgress.notes}
              onChange={(event) =>
                updateStorageMeta((meta) => saveDailyNote(meta, 'luogu', dateKey, event.target.value))
              }
              placeholder="今日整体总结（例如：哪类题最卡、明天优先补哪块）"
            />

            <DailyTraceFeed session={active} title="追踪记录（最近 10 条）" />
          </div>
        ) : (
          <div className="importBox">
            <div className="hint">今日还没有题单。点击“生成 / 刷新今日题单”开始。</div>
            <button className="btn primary" onClick={generateLuoguDaily}>
              生成今日题单
            </button>
          </div>
        )}
      </section>
    )
  }

  const renderLanqiaoEntry = () => {
    const planType: LanqiaoPlanType = active.modeConfig.lanqiaoPlanType ?? 'daily'
    const topic = active.modeConfig.lanqiaoTopic ?? LANQIAO_TOPIC_OPTIONS[0]
    const difficulty: LanqiaoDifficulty = active.modeConfig.lanqiaoDifficulty ?? 'all'

    return (
      <section className="panel controls">
        <div className="panelHeader">
          <div>
            <div className="panelTitle">蓝桥杯刷题模式</div>
            <div className="panelSub">每日 1-2 题 / 专题训练，附带复盘卡导出。</div>
          </div>
        </div>

        <div className="importBox compact">
          <div className="label">模式切换</div>
          <div className="seg">
            {MODES.map((mode) => (
              <button
                key={`lanqiao-mode-${mode.id}`}
                className={active.mode === mode.id ? 'segBtn active' : 'segBtn'}
                onClick={() => setMode(mode.id)}
              >
                {modeShortLabel(mode.id)}
              </button>
            ))}
          </div>
        </div>

        <div className="importBox compact">
          <div className="label">训练子模式</div>
          <div className="seg">
            <button
              className={planType === 'daily' ? 'segBtn active' : 'segBtn'}
              onClick={() =>
                setSessionModeConfig((config) => ({
                  ...config,
                  lanqiaoPlanType: 'daily',
                }))
              }
            >
              每日 1-2 题
            </button>
            <button
              className={planType === 'topic' ? 'segBtn active' : 'segBtn'}
              onClick={() =>
                setSessionModeConfig((config) => ({
                  ...config,
                  lanqiaoPlanType: 'topic',
                }))
              }
            >
              专题训练
            </button>
          </div>
        </div>

        <div className="importBox compact">
          <div className="label">专题</div>
          <select
            value={topic}
            onChange={(event) =>
              setSessionModeConfig((config) => ({
                ...config,
                lanqiaoTopic: event.target.value,
              }))
            }
          >
            {LANQIAO_TOPIC_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <div className="label">难度</div>
          <select
            value={difficulty}
            onChange={(event) =>
              setSessionModeConfig((config) => ({
                ...config,
                lanqiaoDifficulty: event.target.value as LanqiaoDifficulty,
              }))
            }
          >
            <option value="all">全部</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </div>

        <div className="importBox compact">
          <div className="inline">
            <button className="btn primary" onClick={generateLanqiaoDaily}>
              生成今日训练
            </button>
            <button className="btn" onClick={() => void exportLanqiaoMarkdown()}>
              导出 Markdown
            </button>
          </div>
          <div className="hint">
            {lanqiaoProgress ? `完成 ${lanqiaoProgress.doneCount}/${lanqiaoProgress.totalCount}` : '今日尚未生成训练'}
          </div>
          <div className="hint">快捷键：Cmd/Ctrl+Enter 保存进度 · Cmd/Ctrl+S 导出</div>
        </div>
      </section>
    )
  }

  const renderLanqiaoMain = () => {
    const dateKey = toDateKey(new Date())

    return (
      <section className="panel stage">
        <div className="panelHeader">
          <div>
            <div className="panelTitle">蓝桥杯今日训练</div>
            <div className="panelSub">每题复盘卡：思路 / 坑点 / 复杂度 / 可复用模板。</div>
          </div>
        </div>

        {lanqiaoProgress ? (
          <div className="importBox dailyTasks">
            <div className="dailySummaryRow">
              <div className="pill">完成 {lanqiaoProgress.doneCount}/{lanqiaoProgress.totalCount}</div>
              <div className="hint">
                {lanqiaoProgress.planType === 'topic' ? '专题训练' : '每日 1-2 题'} · {lanqiaoProgress.topic ?? '综合'} ·
                {laneqiaoDifficultyLabel(lanqiaoProgress.difficulty ?? 'all')}
              </div>
            </div>

            <div className="taskList">
              {lanqiaoProgress.tasks.map((task) => (
                <article key={task.taskId} className="taskCard">
                  <div className="taskHeader">
                    <label className="taskCheck">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={(event) =>
                          updateStorageMeta((meta) =>
                            patchDailyTask(meta, 'lanqiao', dateKey, task.taskId, (current) => ({
                              ...current,
                              status: event.target.checked ? 'done' : 'todo',
                            })),
                          )
                        }
                      />
                      <span>{task.taskId}</span>
                    </label>
                    <span className="pill">{task.topic ?? '综合'} / {task.difficulty}</span>
                  </div>

                  <div className="taskTitle">{task.title}</div>
                  <a
                    className="taskLink"
                    href={getLanqiaoTaskUrl(task)}
                    target="_blank"
                    rel="noreferrer"
                    title={getLanqiaoTaskUrl(task)}
                  >
                    打开题目链接（蓝桥）
                  </a>
                  <textarea
                    rows={2}
                    placeholder="题目备注（可写关键点/来源）"
                    value={task.note}
                    onChange={(event) =>
                      updateStorageMeta((meta) =>
                        patchDailyTask(meta, 'lanqiao', dateKey, task.taskId, (current) => ({
                          ...current,
                          note: event.target.value,
                        })),
                      )
                    }
                  />

                  <div className="reviewGrid">
                    <textarea
                      rows={2}
                      placeholder="思路"
                      value={task.review.thinking}
                      onChange={(event) =>
                        updateStorageMeta((meta) =>
                          patchDailyTask(meta, 'lanqiao', dateKey, task.taskId, (current) => ({
                            ...current,
                            review: {
                              ...current.review,
                              thinking: event.target.value,
                            },
                          })),
                        )
                      }
                    />
                    <textarea
                      rows={2}
                      placeholder="坑点"
                      value={task.review.pitfall}
                      onChange={(event) =>
                        updateStorageMeta((meta) =>
                          patchDailyTask(meta, 'lanqiao', dateKey, task.taskId, (current) => ({
                            ...current,
                            review: {
                              ...current.review,
                              pitfall: event.target.value,
                            },
                          })),
                        )
                      }
                    />
                    <textarea
                      rows={2}
                      placeholder="复杂度"
                      value={task.review.complexity}
                      onChange={(event) =>
                        updateStorageMeta((meta) =>
                          patchDailyTask(meta, 'lanqiao', dateKey, task.taskId, (current) => ({
                            ...current,
                            review: {
                              ...current.review,
                              complexity: event.target.value,
                            },
                          })),
                        )
                      }
                    />
                    <textarea
                      rows={2}
                      placeholder="可复用模板"
                      value={task.review.template}
                      onChange={(event) =>
                        updateStorageMeta((meta) =>
                          patchDailyTask(meta, 'lanqiao', dateKey, task.taskId, (current) => ({
                            ...current,
                            review: {
                              ...current.review,
                              template: event.target.value,
                            },
                          })),
                        )
                      }
                    />
                  </div>
                  <div className="inline">
                    <button
                      className="btn"
                      onClick={() =>
                        addMistake({
                          sourceMode: 'lanqiao',
                          topic: task.topic ?? '蓝桥训练',
                          prompt: `${task.taskId} ${task.title}`,
                          errorType: task.review.pitfall.trim() ? 'implementation' : 'unknown',
                          notes: task.review.pitfall || task.note || '蓝桥训练遇到卡点。',
                          tags: [task.topic ?? '综合', task.difficulty],
                          severity: task.status === 'done' ? 2 : 3,
                        })
                      }
                    >
                      加入错题本
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="inline">
              <button className="btn" onClick={() => saveDailySnapshot('lanqiao')}>
                保存进度（Cmd/Ctrl+Enter）
              </button>
              <button className="btn primary" onClick={() => void exportLanqiaoMarkdown()}>
                导出 Markdown（Cmd/Ctrl+S）
              </button>
            </div>

            <div className="label">今日总复盘</div>
            <textarea
              className="dailySummaryTextarea"
              rows={3}
              value={lanqiaoProgress.notes}
              onChange={(event) =>
                updateStorageMeta((meta) => saveDailyNote(meta, 'lanqiao', dateKey, event.target.value))
              }
              placeholder="写下今日最大的收获 / 明天要补的内容"
            />

            <DailyTraceFeed session={active} title="追踪记录（最近 10 条）" />
          </div>
        ) : (
          <div className="importBox">
            <div className="hint">今日还没有训练题。点击“生成今日训练”开始。</div>
            <button className="btn primary" onClick={generateLanqiaoDaily}>
              生成今日训练
            </button>
          </div>
        )}
      </section>
    )
  }

  const modeRuntime: ModeRuntimeState = {
    session: active,
    meta: storageMeta,
    renderers: {
      interviewEntry: renderInterviewEntry,
      interviewMain: renderInterviewMain,
      luoguEntry: renderLuoguEntry,
      luoguMain: renderLuoguMain,
      lanqiaoEntry: renderLanqiaoEntry,
      lanqiaoMain: renderLanqiaoMain,
    },
    exporters: {
      interview: saveInterviewReport,
      luogu: exportLuoguMarkdown,
      lanqiao: exportLanqiaoMarkdown,
    },
  }

  const setupActionLabel = nextActionLabel(active, {
    hasLuogu: Boolean(luoguProgress),
    hasLanqiao: Boolean(lanqiaoProgress),
    canContinueMock,
  })

  const sessionsForList = sessionFilter === 'all' ? sessions : sessions.filter((session) => session.mode === sessionFilter)
  const EntryComponent = modeDefinition.entryComponent
  const MainComponent = modeDefinition.mainComponent

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">IG</div>
          <div className="brandText">
            <div className="brandTitle">面试烤炉</div>
            <div className="brandSub">桌面版原型 • 数据仅本地保存</div>
          </div>
        </div>
        <div className="topbarRight">
          <div className="seg topSwitch">
            <button className={screen === 'interview' ? 'segBtn active' : 'segBtn'} onClick={() => setScreen('interview')}>
              面试训练
            </button>
            <button
              className={screen === 'lesson408' ? 'segBtn active' : 'segBtn'}
              onClick={() => {
                setModeSwitchOpen(false)
                setScreen('lesson408')
              }}
            >
              408 每日小课
            </button>
            <button className={screen === 'mistakes' ? 'segBtn active' : 'segBtn'} onClick={() => setScreen('mistakes')}>
              错题本
            </button>
            <button className={screen === 'review' ? 'segBtn active' : 'segBtn'} onClick={() => setScreen('review')}>
              复习
            </button>
            <button className={screen === 'dashboard' ? 'segBtn active' : 'segBtn'} onClick={() => setScreen('dashboard')}>
              Dashboard
            </button>
            <button className={screen === 'reminders' ? 'segBtn active' : 'segBtn'} onClick={() => setScreen('reminders')}>
              提醒
            </button>
          </div>
          {statusMessage ? <div className="statusPill">{statusMessage}</div> : null}
          {screen === 'interview' ? (
            <>
              <button className="btn" onClick={() => setModeSwitchOpen(true)}>
                切换模式（Cmd/Ctrl+K）
              </button>
              <button className="btn" onClick={createSession}>
                新建会话
              </button>
            </>
          ) : screen === 'dashboard' ? (
            <button className="btn" onClick={() => void generateDailySummaryReport()}>
              生成今日日报
            </button>
          ) : null}
        </div>
      </header>

      {screen === 'lesson408' ? (
        <DailyLessonPage
          meta={storageMeta}
          onUpdateMeta={updateStorageMeta}
          onStatus={setStatusMessage}
          onQuickAddMistake={(input) =>
            addMistake({
              sourceMode: '408',
              topic: input.topic,
              prompt: input.prompt,
              errorType: input.errorType,
              notes: input.notes,
              severity: 3,
            })
          }
        />
      ) : screen === 'mistakes' ? (
        <MistakeBookPage
          meta={storageMeta}
          todayDateKey={todayDateKey}
          onUpdateMeta={updateStorageMeta}
          onExport={exportMistakeMarkdown}
        />
      ) : screen === 'review' ? (
        <ReviewQueuePage
          meta={storageMeta}
          todayDateKey={todayDateKey}
          onUpdateMeta={updateStorageMeta}
          onExport={exportReviewMarkdown}
        />
      ) : screen === 'dashboard' ? (
        <DashboardPage meta={storageMeta} todayDateKey={todayDateKey} onGenerateDailyReport={generateDailySummaryReport} />
      ) : screen === 'reminders' ? (
        <ReminderSettingsPage
          meta={storageMeta}
          onUpdateMeta={updateStorageMeta}
          onSyncReminders={syncReminderSettingsForMeta}
        />
      ) : (
        <div className="layout">
          <aside className="rail">
            <div className="railHeader">
              <div className="railTitle">会话列表</div>
              <div className="railHint">本地历史（重新打开自动恢复）</div>
              <div className="seg railFilter">
                <button className={sessionFilter === 'all' ? 'segBtn active' : 'segBtn'} onClick={() => setSessionFilter('all')}>
                  全部
                </button>
                {MODES.map((mode) => (
                  <button
                    key={`filter-${mode.id}`}
                    className={sessionFilter === mode.id ? 'segBtn active' : 'segBtn'}
                    onClick={() => setSessionFilter(mode.id)}
                  >
                    {modeTagLabel(mode.id)}
                  </button>
                ))}
              </div>
            </div>

            <div className="sessionList">
              {sessionsForList.map((session) => (
                <button
                  key={session.id}
                  className={session.id === active.id ? 'sessionItem active' : 'sessionItem'}
                  onClick={() => setActiveId(session.id)}
                >
                  <div className="sessionTitle">{sessionTitleZh(session)}</div>
                  <div className="sessionMeta">
                    <span>{formatWhen(session.updatedAt)}</span>
                    <span className="dot" />
                    <span>{modeTagLabel(session.mode)}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="railFooter">
              <button
                className="btn danger"
                onClick={() => deleteSession(active.id)}
                disabled={sessions.length <= 1}
                title={sessions.length <= 1 ? '至少保留一个会话' : '删除当前会话'}
              >
                删除
              </button>
            </div>
          </aside>

          <main className={modeDefinition.layout === 'daily' ? 'main mainDaily' : 'main'}>
            <EntryComponent {...modeRuntime} />
            <MainComponent {...modeRuntime} />
          </main>
        </div>
      )}

      {screen === 'interview' && modeSwitchOpen ? (
        <div className="modeOverlay" onClick={() => setModeSwitchOpen(false)}>
          <div className="modeDialog" onClick={(event) => event.stopPropagation()}>
            <div className="panelTitle">切换模式</div>
            <div className="panelSub">Cmd/Ctrl+K · 当前动作：{setupActionLabel}</div>
            <div className="modeList">
              {MODE_SWITCH_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  className={active.mode === option.mode ? 'modeItem active' : 'modeItem'}
                  onClick={() => {
                    setMode(option.mode)
                    setModeSwitchOpen(false)
                  }}
                >
                  <div className="modeItemTitle">{option.label}</div>
                  <div className="modeItemHint">{option.hint}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ChatPanel({
  session,
  onSend,
  onContinue,
  canContinueMock,
}: {
  session: Session
  onSend: (text: string) => void
  onContinue: (skipCurrent?: boolean) => void
  canContinueMock: boolean
}) {
  const [draft, setDraft] = useState('')
  const [replayMode, setReplayMode] = useState(false)
  const [replayIndex, setReplayIndex] = useState(session.messages.length)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  const canReplay = session.messages.length > 1
  const visibleCount = replayMode ? Math.min(replayIndex, session.messages.length) : session.messages.length
  const visibleMessages = session.messages.slice(0, visibleCount)
  const hasPendingReplay = replayIndex < session.messages.length
  const replayHint = replayMode
    ? `正在回放：第 ${visibleCount}/${session.messages.length} 条`
    : hasPendingReplay
      ? `已暂停在第 ${visibleCount} 条，点击“继续回放”可从此处恢复`
      : `${session.messages.length} 条消息`

  useEffect(() => {
    if (!replayMode) return

    const timer = window.setInterval(() => {
      setReplayIndex((current) => {
        if (current >= session.messages.length) {
          window.clearInterval(timer)
          setReplayMode(false)
          return session.messages.length
        }
        return current + 1
      })
    }, 700)

    return () => window.clearInterval(timer)
  }, [replayMode, session.messages.length])

  useEffect(() => {
    const el = chatScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [visibleMessages.length, session.id])

  return (
    <div className="chat">
      <div className="chatTools">
        <button
          className="btn"
          onClick={() => {
            if (!canReplay) return
            setReplayIndex(1)
            setReplayMode(true)
          }}
          disabled={!canReplay}
        >
          从头回放
        </button>
        <button
          className="btn"
          onClick={() => setReplayMode((current) => !current)}
          disabled={!canReplay || (!replayMode && !hasPendingReplay)}
        >
          {replayMode ? '暂停回放' : '继续回放'}
        </button>
        <button
          className="btn"
          onClick={() => {
            setReplayMode(false)
            setReplayIndex(session.messages.length)
          }}
          disabled={!canReplay}
        >
          跳到最新
        </button>
        <div className="pill">{replayHint}</div>
        {session.mode === 'mock' ? (
          <>
            <button className="btn primary" onClick={() => onContinue(false)} disabled={!session.mock?.active || !canContinueMock}>
              {canContinueMock ? '下一步 / 继续' : '请先作答'}
            </button>
            <button className="btn" onClick={() => onContinue(true)} disabled={!session.mock?.active}>
              跳过本题
            </button>
          </>
        ) : null}
      </div>
      {session.mode === 'mock' && !canContinueMock ? (
        <div className="hint stageHint">当前阶段还没有你的回答；可先发送回答，或点击“跳过本题”。</div>
      ) : null}

      <div className="chatScroll" ref={chatScrollRef}>
        {visibleMessages.map((message) => (
          <div key={message.id} className={message.role === 'assistant' ? 'msg assistant' : 'msg user'}>
            <div className="msgRole">{message.role === 'assistant' ? '面试官' : '你'}</div>
            <div className="msgText">{message.text}</div>
          </div>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          onSend(draft)
          setDraft('')
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={session.mode === 'mock' ? '回答当前阶段...' : '输入消息...'}
        />
        <button className="btn primary" type="submit">
          发送
        </button>
      </form>
    </div>
  )
}

function DailyTraceFeed({ session, title }: { session: Session; title: string }) {
  const items = [...session.messages].slice(-10).reverse()

  return (
    <div className="importBox compact">
      <div className="label">{title}</div>
      <div className="dailyTraceList">
        {items.length === 0 ? <div className="hint">暂无记录</div> : null}
        {items.map((item) => (
          <div key={item.id} className="dailyTraceItem">
            <span className="dailyTraceRole">{item.role === 'assistant' ? '系统' : '你'}</span>
            <span className="dailyTraceText">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
