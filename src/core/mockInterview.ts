import type { Message, MockInterviewState, MockStage, Session } from '../types'
import { makeId } from '../seed'
import { extractProfileFromFreeform } from './profile'

type BackendTopic = {
  name: string
  prompt: string
}

const BACKEND_TOPICS: BackendTopic[] = [
  {
    name: 'Idempotency for order APIs',
    prompt:
      'Design idempotency for a create-order endpoint. Explain key generation, persistence strategy, concurrent duplicate handling, and TTL cleanup.',
  },
  {
    name: 'MySQL indexing and slow query diagnosis',
    prompt:
      'A critical query regressed from 20ms to 800ms. Walk through your diagnosis workflow and concrete index/query changes.',
  },
  {
    name: 'Redis cache consistency',
    prompt:
      'Describe a cache + DB consistency strategy for high-read traffic. Explain stale data risks, invalidation timing, and fallback behavior.',
  },
  {
    name: 'Concurrency and lock contention',
    prompt:
      'Your service hits lock contention at peak traffic. Explain what metrics you check first and what architectural changes you would try.',
  },
]

const ALGO_WARMUPS: string[] = [
  'Given an array, return the top-k frequent elements. Explain complexity and edge cases.',
  'Implement LRU cache behavior and discuss tradeoffs between simplicity and throughput.',
  'Find the shortest subarray whose sum is at least target. Explain why sliding window works (or does not).',
  'Detect cycles in a directed graph and explain how you would debug wrong answers in an interview.',
]

function deriveProject(session: Session): { name: string; tech: string[] } {
  const seedInput =
    session.dataSource === 'paste'
      ? session.resumeText.trim()
      : session.dataSource === 'pdf'
        ? session.pdfPath?.trim() ?? ''
        : session.repoPath?.trim() ?? ''

  const profile = extractProfileFromFreeform(seedInput)
  return profile.projects[0] ?? { name: 'Order Service', tech: ['Spring Boot', 'MySQL'] }
}

function buildStagePrompts(session: Session, backendTopicIndex: number): { stages: MockStage[]; backendTopic: string } {
  const project = deriveProject(session)
  const backendTopic = BACKEND_TOPICS[backendTopicIndex % BACKEND_TOPICS.length]
  const algoQuestion = ALGO_WARMUPS[(backendTopicIndex + 1) % ALGO_WARMUPS.length]
  const projectTech = project.tech.length ? project.tech.join(', ') : 'n/a'

  return {
    stages: [
      {
        id: 'project-deep-dive',
        title: 'Project Deep Dive',
        durationMinutes: 6,
        prompt: `Pick your strongest project (${project.name}, stack: ${projectTech}). Cover business goal, architecture, your ownership, a tough failure, and measurable impact.`,
      },
      {
        id: 'backend-fundamentals',
        title: 'Backend Fundamentals',
        durationMinutes: 5,
        prompt: backendTopic.prompt,
      },
      {
        id: 'algorithm-warmup',
        title: 'Algorithm Warmup',
        durationMinutes: 4,
        prompt: algoQuestion,
      },
    ],
    backendTopic: backendTopic.name,
  }
}

export function createMockInterview(session: Session, backendTopicCursor: number): { mock: MockInterviewState; nextCursor: number } {
  const { stages, backendTopic } = buildStagePrompts(session, backendTopicCursor)

  return {
    mock: {
      active: true,
      startedAt: Date.now(),
      stageIndex: 0,
      backendTopic,
      stages,
    },
    nextCursor: (backendTopicCursor + 1) % BACKEND_TOPICS.length,
  }
}

export function renderMockIntro(mock: MockInterviewState): string {
  return [
    'Mock Interview (Tencent/ByteDance intern) started.',
    'Total: 15 minutes, 3 stages.',
    `Flow: 1) ${mock.stages[0].title} (${mock.stages[0].durationMinutes}m) -> 2) ${mock.stages[1].title} (${mock.stages[1].durationMinutes}m, rotating topic: ${mock.backendTopic}) -> 3) ${mock.stages[2].title} (${mock.stages[2].durationMinutes}m).`,
    'After each answer, press Cmd/Ctrl+Enter to continue.',
  ].join('\n')
}

export function renderStagePrompt(mock: MockInterviewState, stageIndex: number): string {
  const stage = mock.stages[stageIndex]
  if (!stage) return 'No stage available.'
  return [`[Stage ${stageIndex + 1}/${mock.stages.length}] ${stage.title} (${stage.durationMinutes}m)`, stage.prompt].join('\n')
}

export function createMockKickoffMessages(mock: MockInterviewState): Message[] {
  const now = Date.now()
  return [
    { id: makeId('m'), role: 'assistant', text: renderMockIntro(mock), ts: now },
    { id: makeId('m'), role: 'assistant', text: renderStagePrompt(mock, 0), ts: now + 1 },
  ]
}

export function advanceMockInterview(mock: MockInterviewState): { mock: MockInterviewState; message: Message; completed: boolean } {
  const now = Date.now()
  const nextStage = mock.stageIndex + 1

  if (nextStage >= mock.stages.length) {
    return {
      mock: { ...mock, active: false, stageIndex: mock.stages.length, completedAt: now },
      message: {
        id: makeId('m'),
        role: 'assistant',
        text: 'Mock interview complete. Generate review for scores, improvement items, and tomorrow practice plan.',
        ts: now,
      },
      completed: true,
    }
  }

  return {
    mock: { ...mock, stageIndex: nextStage },
    message: {
      id: makeId('m'),
      role: 'assistant',
      text: renderStagePrompt(mock, nextStage),
      ts: now,
    },
    completed: false,
  }
}

export function isMockRunning(session: Session): boolean {
  return Boolean(session.mode === 'mock' && session.mock?.active)
}

