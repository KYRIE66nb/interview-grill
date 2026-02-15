import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { DataSource, Mode, ReviewDimension, Session, StorageMeta } from './types'
import { loadCachedState, loadState, saveSessionReport, saveState } from './storage'
import { makeId, newSession } from './seed'
import { extractProfileFromFreeform } from './core/profile'
import { loadSeedBankFromDisk } from './core/questionBank'
import { chooseNextQuestion, renderQuestionZh } from './core/engine'
import {
  advanceMockInterview,
  createMockInterview,
  createMockKickoffMessages,
  isMockRunning,
} from './core/mockInterview'
import { generateReviewReport } from './core/review'

const MODE_OPTIONS: Array<{ mode: Mode; label: string; hint: string }> = [
  { mode: 'mock', label: 'Mock Interview (Tencent/ByteDance intern)', hint: '15-minute structured flow with stage transitions.' },
  { mode: 'drill', label: 'Drill', hint: 'Continuous targeted questioning by intensity.' },
  { mode: 'chat', label: 'Chat', hint: 'Open-ended prep and answer polish.' },
]

const DIMENSION_LABELS: Record<ReviewDimension, string> = {
  structure: 'Structure',
  correctness: 'Correctness',
  tradeoffs: 'Tradeoffs',
  metrics: 'Metrics',
  risk: 'Risk',
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function formatWhen(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function nextActionLabel(session: Session) {
  if (session.mode === 'mock') return isMockRunning(session) ? 'Next / Continue' : 'Start Mock (15m)'
  if (session.mode === 'drill') return 'Start Drill'
  return 'Open Chat'
}

export default function App() {
  const [bootState] = useState(() => loadCachedState())
  const [sessions, setSessions] = useState<Session[]>(bootState.sessions)
  const [storageMeta, setStorageMeta] = useState<StorageMeta>(bootState.meta)
  const [activeId, setActiveId] = useState<string>(bootState.sessions[0]?.id ?? '')
  const [isHydrating, setIsHydrating] = useState(true)
  const [modeSwitchOpen, setModeSwitchOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const active = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? sessions[0] ?? null,
    [sessions, activeId],
  )

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

  const mutateSession = useCallback((sessionId: string, updater: (session: Session) => Session) => {
    setSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...updater(session), updatedAt: Date.now() } : session)),
    )
  }, [])

  const mutateActive = useCallback((updater: (session: Session) => Session) => {
    if (!active) return
    mutateSession(active.id, updater)
  }, [active, mutateSession])

  function createSession() {
    const session = newSession('mock')
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

  function setMode(mode: Mode) {
    mutateActive((session) => ({ ...session, mode }))
  }

  function setIntensity(intensity: number) {
    mutateActive((session) => ({ ...session, intensity: clamp(intensity, 1, 10) }))
  }

  function setDataSource(dataSource: DataSource) {
    mutateActive((session) => ({ ...session, dataSource }))
  }

  const startDrill = useCallback(() => {
    mutateActive((session) => {
      const now = Date.now()

      const seedInput =
        session.dataSource === 'paste'
          ? session.resumeText.trim()
          : session.dataSource === 'pdf'
            ? session.pdfPath?.trim() || ''
            : session.repoPath?.trim() || ''

      const profile = extractProfileFromFreeform(seedInput)
      const project = profile.projects[0] ?? { name: 'Order Service', tech: ['SpringBoot', 'MySQL'] }

      const bank = loadSeedBankFromDisk()
      const asked = new Set(session.messages.filter((message) => message.role === 'assistant').map((message) => message.id))
      const question = chooseNextQuestion(bank, project, 'drill', session.intensity, asked)

      const intro = {
        id: makeId('m'),
        role: 'assistant' as const,
        text: `Drill started: target project ${project.name}; stack ${project.tech.join(' ')}.`,
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

  const continueMockFlow = useCallback(() => {
    mutateActive((session) => {
      if (!session.mock) return session
      const step = advanceMockInterview(session.mock)
      const nextSession = {
        ...session,
        mock: step.mock,
        messages: [...session.messages, step.message],
      }
      return step.completed ? { ...nextSession, reviewReport: generateReviewReport(nextSession) } : nextSession
    })
  }, [mutateActive])

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

    mutateActive((session) => {
      const now = Date.now()
      return {
        ...session,
        messages: [
          ...session.messages,
          {
            id: makeId('m'),
            role: 'assistant',
            text: 'Chat mode is ready. Share one answer and I will tighten it for structure, metrics, and risk coverage.',
            ts: now,
          },
        ],
      }
    })
  }

  function sendUserMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    mutateActive((session) => {
      const now = Date.now()
      const userMessage = { id: makeId('m'), role: 'user' as const, text: trimmed, ts: now }

      let assistantText = 'Captured. Continue when ready.'
      if (session.mode === 'mock' && session.mock?.active) {
        const stage = session.mock.stages[session.mock.stageIndex]
        assistantText = `Captured for ${stage?.title ?? 'this stage'}. Press Cmd/Ctrl+Enter to continue to the next stage.`
      } else if (session.mode === 'drill') {
        assistantText = 'Good. Keep answer flow: structure -> correctness -> tradeoffs -> metrics -> risk.'
      } else if (session.mode === 'chat') {
        assistantText = 'Nice. Want me to turn this into a 60-second STAR answer?'
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
    setStatusMessage('Review generated')
  }

  const saveReport = useCallback(async () => {
    if (!active) return

    let sessionToSave = active
    if (!sessionToSave.reviewReport) {
      const reviewReport = generateReviewReport(sessionToSave)
      sessionToSave = { ...sessionToSave, reviewReport }
      mutateSession(sessionToSave.id, (session) => ({ ...session, reviewReport }))
    }

    const result = await saveSessionReport(sessionToSave)
    if (result.error) {
      setStatusMessage(`Save failed: ${result.error}`)
      return
    }
    if (result.canceled) {
      setStatusMessage('Save canceled')
      return
    }

    mutateSession(sessionToSave.id, (session) => ({ ...session, lastSavedReportAt: Date.now() }))
    setStatusMessage(result.path ? `Saved report: ${result.path}` : 'Saved report')
  }, [active, mutateSession])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && modeSwitchOpen) {
        event.preventDefault()
        setModeSwitchOpen(false)
        return
      }

      if (!(event.metaKey || event.ctrlKey)) return

      if (event.key === 'Enter') {
        event.preventDefault()
        if (active?.mode === 'mock') {
          if (isMockRunning(active)) continueMockFlow()
          else startMockInterviewFlow()
        } else if (active?.mode === 'drill') {
          startDrill()
        }
        return
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveReport()
        return
      }

      if (event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setModeSwitchOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, continueMockFlow, modeSwitchOpen, saveReport, startDrill, startMockInterviewFlow])

  if (!active) return null
  const reviewReport = active.reviewReport

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">IG</div>
          <div className="brandText">
            <div className="brandTitle">Interview Grill</div>
            <div className="brandSub">Desktop prototype • local-only</div>
          </div>
        </div>
        <div className="topbarRight">
          {statusMessage ? <div className="statusPill">{statusMessage}</div> : null}
          <button className="btn" onClick={() => setModeSwitchOpen(true)}>
            Mode Switch (Cmd/Ctrl+K)
          </button>
          <button className="btn" onClick={createSession}>
            New Session
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="rail">
          <div className="railHeader">
            <div className="railTitle">Sessions</div>
            <div className="railHint">Local history (restores on reopen)</div>
          </div>

          <div className="sessionList">
            {sessions.map((session) => (
              <button
                key={session.id}
                className={session.id === active.id ? 'sessionItem active' : 'sessionItem'}
                onClick={() => setActiveId(session.id)}
              >
                <div className="sessionTitle">{session.title}</div>
                <div className="sessionMeta">
                  <span>{formatWhen(session.updatedAt)}</span>
                  <span className="dot" />
                  <span>{session.mode.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="railFooter">
            <button
              className="btn danger"
              onClick={() => deleteSession(active.id)}
              disabled={sessions.length <= 1}
              title={sessions.length <= 1 ? 'Keep at least one session' : 'Delete session'}
            >
              Delete
            </button>
          </div>
        </aside>

        <main className="main">
          <section className="panel controls">
            <div className="panelHeader">
              <div>
                <div className="panelTitle">Setup</div>
                <div className="panelSub">Mode + intensity + local context import</div>
              </div>
            </div>

            <div className="fieldRow">
              <div className="seg">
                <button className={active.mode === 'mock' ? 'segBtn active' : 'segBtn'} onClick={() => setMode('mock')}>
                  Mock Interview
                </button>
                <button className={active.mode === 'drill' ? 'segBtn active' : 'segBtn'} onClick={() => setMode('drill')}>
                  Drill
                </button>
                <button className={active.mode === 'chat' ? 'segBtn active' : 'segBtn'} onClick={() => setMode('chat')}>
                  Chat
                </button>
              </div>

              <div className="intensity">
                <div className="label">Intensity</div>
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

            <div className="fieldRow">
              <div className="seg">
                <button
                  className={active.dataSource === 'paste' ? 'segBtn active' : 'segBtn'}
                  onClick={() => setDataSource('paste')}
                >
                  Paste
                </button>
                <button
                  className={active.dataSource === 'pdf' ? 'segBtn active' : 'segBtn'}
                  onClick={() => setDataSource('pdf')}
                >
                  PDF
                </button>
                <button
                  className={active.dataSource === 'repo' ? 'segBtn active' : 'segBtn'}
                  onClick={() => setDataSource('repo')}
                >
                  Repo
                </button>
              </div>

              <button className="btn primary" onClick={runSelectedMode}>
                {nextActionLabel(active)}
              </button>
            </div>

            {active.mode === 'mock' && active.mock ? (
              <div className="importBox compact">
                <div className="label">Mock status</div>
                <div className="hint">
                  {active.mock.active
                    ? `Running stage ${Math.min(active.mock.stageIndex + 1, active.mock.stages.length)}/${active.mock.stages.length} · backend topic: ${active.mock.backendTopic}`
                    : `Last run completed at ${formatWhen(active.mock.completedAt ?? active.updatedAt)}`}
                </div>
              </div>
            ) : null}

            {active.dataSource === 'paste' ? (
              <div className="importBox">
                <div className="label">Resume Text</div>
                <textarea
                  value={active.resumeText}
                  placeholder="Paste resume or project summary here..."
                  onChange={(event) => mutateActive((session) => ({ ...session, resumeText: event.target.value }))}
                  rows={10}
                />
              </div>
            ) : active.dataSource === 'pdf' ? (
              <div className="importBox">
                <div className="label">PDF Import (placeholder)</div>
                <div className="inline">
                  <input
                    value={active.pdfPath ?? ''}
                    placeholder="/path/to/resume.pdf"
                    onChange={(event) => mutateActive((session) => ({ ...session, pdfPath: event.target.value }))}
                  />
                  <button className="btn" onClick={() => sendUserMessage('[stub] select pdf...')}>
                    Choose
                  </button>
                </div>
                <div className="hint">File picker + parsing can be wired later.</div>
              </div>
            ) : (
              <div className="importBox">
                <div className="label">Repo Import (placeholder)</div>
                <div className="inline">
                  <input
                    value={active.repoPath ?? ''}
                    placeholder="/path/to/repo"
                    onChange={(event) => mutateActive((session) => ({ ...session, repoPath: event.target.value }))}
                  />
                  <button className="btn" onClick={() => sendUserMessage('[stub] scan repo...')}>
                    Scan
                  </button>
                </div>
                <div className="hint">Local indexing + retrieval can be wired later.</div>
              </div>
            )}
          </section>

          <section className="panel stage">
            <div className="panelHeader">
              <div>
                <div className="panelTitle">Stage</div>
                <div className="panelSub">Transcript with replay · Cmd/Ctrl+Enter = next/continue</div>
              </div>
            </div>

            <ChatPanel key={active.id} session={active} onSend={sendUserMessage} onContinue={continueMockFlow} />
          </section>

          <section className="panel review">
            <div className="panelHeader">
              <div>
                <div className="panelTitle">Review</div>
                <div className="panelSub">5-dimension scorecard + 3 improvements + tomorrow plan</div>
              </div>
            </div>

            <div className="importBox">
              <div className="label">Notes</div>
              <textarea
                value={active.reviewNotes}
                placeholder="Capture observations and follow-ups..."
                onChange={(event) => mutateActive((session) => ({ ...session, reviewNotes: event.target.value }))}
                rows={7}
              />
              <div className="inline reviewActions">
                <button className="btn" onClick={generateReview}>
                  Generate Review
                </button>
                <button className="btn primary" onClick={() => void saveReport()}>
                  Save Report (Cmd/Ctrl+S)
                </button>
              </div>
              <div className="hint">
                {active.lastSavedReportAt ? `Last saved: ${formatWhen(active.lastSavedReportAt)}` : 'Reports include messages + scores + plan.'}
              </div>
            </div>

            {reviewReport ? (
              <>
                <div className="importBox compact">
                  <div className="label">Overall</div>
                  <div className="overallScore">{reviewReport.overall}/5</div>
                  <div className="hint">{reviewReport.summary}</div>
                </div>

                <div className="cards">
                  {(Object.keys(DIMENSION_LABELS) as ReviewDimension[]).map((dimension) => {
                    const entry = reviewReport.dimensions[dimension]
                    return (
                      <div key={dimension} className="card">
                        <div className="cardKicker">Dimension</div>
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
                  <div className="label">3 Actionable Improvements</div>
                  <ol className="plainList">
                    {reviewReport.actionableImprovements.slice(0, 3).map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ol>
                </div>

                <div className="importBox compact">
                  <div className="label">Tomorrow Practice Plan</div>
                  <ol className="plainList">
                    {reviewReport.tomorrowPracticePlan.map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ol>
                </div>
              </>
            ) : (
              <div className="importBox compact">
                <div className="hint">No scorecard yet. Generate review after at least one answer.</div>
              </div>
            )}
          </section>
        </main>
      </div>

      {modeSwitchOpen ? (
        <div className="modeOverlay" onClick={() => setModeSwitchOpen(false)}>
          <div className="modeDialog" onClick={(event) => event.stopPropagation()}>
            <div className="panelTitle">Switch Mode</div>
            <div className="panelSub">Cmd/Ctrl+K</div>
            <div className="modeList">
              {MODE_OPTIONS.map((option) => (
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
}: {
  session: Session
  onSend: (text: string) => void
  onContinue: () => void
}) {
  const [draft, setDraft] = useState('')
  const [replayMode, setReplayMode] = useState(false)
  const [replayIndex, setReplayIndex] = useState(session.messages.length)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  const visibleCount = replayMode ? Math.min(replayIndex, session.messages.length) : session.messages.length
  const visibleMessages = session.messages.slice(0, visibleCount)

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
            if (!session.messages.length) return
            setReplayIndex(1)
            setReplayMode(true)
          }}
          disabled={session.messages.length <= 1}
        >
          Replay
        </button>
        <button className="btn" onClick={() => setReplayMode((current) => !current)} disabled={session.messages.length <= 1}>
          {replayMode ? 'Pause' : 'Resume'}
        </button>
        <button
          className="btn"
          onClick={() => {
            setReplayMode(false)
            setReplayIndex(session.messages.length)
          }}
        >
          Latest
        </button>
        <div className="pill">{replayMode ? `${visibleCount}/${session.messages.length}` : `${session.messages.length} messages`}</div>
        {session.mode === 'mock' ? (
          <button className="btn primary" onClick={onContinue} disabled={!session.mock?.active}>
            Next / Continue
          </button>
        ) : null}
      </div>

      <div className="chatScroll" ref={chatScrollRef}>
        {visibleMessages.map((message) => (
          <div key={message.id} className={message.role === 'assistant' ? 'msg assistant' : 'msg user'}>
            <div className="msgRole">{message.role === 'assistant' ? 'Grill' : 'You'}</div>
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
          placeholder={session.mode === 'mock' ? 'Answer current stage...' : 'Send a message...'}
        />
        <button className="btn primary" type="submit">
          Send
        </button>
      </form>
    </div>
  )
}
