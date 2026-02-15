import { useEffect, useMemo, useState } from 'react'
import './app.css'
import type { DataSource, Mode, Session } from './types'
import { loadSessions, saveSessions } from './storage'
import { makeId, newSession } from './seed'

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

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const s = loadSessions()
    if (s.length) return s
    return [newSession()]
  })
  const [activeId, setActiveId] = useState<string>(() => {
    const s = loadSessions()
    return s[0]?.id ?? sessions[0]?.id
  })

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? sessions[0],
    [sessions, activeId],
  )

  useEffect(() => {
    if (!active) return
    setActiveId(active.id)
  }, [active?.id])

  function updateActive(patch: Partial<Session>) {
    if (!active) return
    setSessions((prev) =>
      prev.map((s) => (s.id === active.id ? { ...s, ...patch, updatedAt: Date.now() } : s)),
    )
  }

  function createSession() {
    const s = newSession()
    setSessions((prev) => [s, ...prev])
    setActiveId(s.id)
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeId === id) {
      const remaining = sessions.filter((s) => s.id !== id)
      setActiveId(remaining[0]?.id ?? '')
    }
  }

  function setMode(mode: Mode) {
    updateActive({ mode })
  }

  function setIntensity(intensity: number) {
    updateActive({ intensity: clamp(intensity, 1, 10) })
  }

  function setDataSource(dataSource: DataSource) {
    updateActive({ dataSource })
  }

  function sendUserMessage(text: string) {
    if (!active) return
    const trimmed = text.trim()
    if (!trimmed) return

    const now = Date.now()
    const userMsg = { id: makeId('m'), role: 'user' as const, text: trimmed, ts: now }

    const assistantMsgText =
      active.mode === 'drill'
        ? `Got it. (stub) Next: ask a question at intensity ${active.intensity}/10 based on your resume.`
        : `Got it. (stub) Chat reply at intensity ${active.intensity}/10.`

    const assistantMsg = {
      id: makeId('m'),
      role: 'assistant' as const,
      text: assistantMsgText,
      ts: now + 1,
    }

    updateActive({ messages: [...active.messages, userMsg, assistantMsg] })
  }

  function startDrill() {
    if (!active) return
    const now = Date.now()
    const note =
      active.dataSource === 'paste'
        ? active.resumeText.trim()
          ? 'Resume loaded from paste (stub). Starting drill...'
          : 'Paste resume first (stub).'
        : active.dataSource === 'pdf'
          ? `PDF import placeholder: ${active.pdfPath ?? '(none)'} (stub).`
          : `Repo import placeholder: ${active.repoPath ?? '(none)'} (stub).`

    const msg = { id: makeId('m'), role: 'assistant' as const, text: note, ts: now }
    updateActive({ messages: [...active.messages, msg], mode: 'drill' })
  }

  if (!active) return null

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
          <button className="btn" onClick={createSession}>
            New Session
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="rail">
          <div className="railHeader">
            <div className="railTitle">Projects</div>
            <div className="railHint">Local history</div>
          </div>

          <div className="sessionList">
            {sessions.map((s) => (
              <button
                key={s.id}
                className={s.id === active.id ? 'sessionItem active' : 'sessionItem'}
                onClick={() => setActiveId(s.id)}
              >
                <div className="sessionTitle">{s.title}</div>
                <div className="sessionMeta">
                  <span>{formatWhen(s.updatedAt)}</span>
                  <span className="dot" />
                  <span>{s.mode.toUpperCase()}</span>
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
                <div className="panelSub">Mode + intensity + data import (stubs)</div>
              </div>
            </div>

            <div className="fieldRow">
              <div className="seg">
                <button className={active.mode === 'chat' ? 'segBtn active' : 'segBtn'} onClick={() => setMode('chat')}>
                  Chat
                </button>
                <button className={active.mode === 'drill' ? 'segBtn active' : 'segBtn'} onClick={() => setMode('drill')}>
                  Drill
                </button>
              </div>

              <div className="intensity">
                <div className="label">Intensity</div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={active.intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
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

              <button className="btn primary" onClick={startDrill}>
                Start Drill
              </button>
            </div>

            {active.dataSource === 'paste' ? (
              <div className="importBox">
                <div className="label">Resume Text</div>
                <textarea
                  value={active.resumeText}
                  placeholder="Paste resume here..."
                  onChange={(e) => updateActive({ resumeText: e.target.value })}
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
                    onChange={(e) => updateActive({ pdfPath: e.target.value })}
                  />
                  <button className="btn" onClick={() => sendUserMessage('[stub] select pdf...')}>
                    Choose
                  </button>
                </div>
                <div className="hint">File picker + parsing will be wired later.</div>
              </div>
            ) : (
              <div className="importBox">
                <div className="label">Repo Import (placeholder)</div>
                <div className="inline">
                  <input
                    value={active.repoPath ?? ''}
                    placeholder="/path/to/repo"
                    onChange={(e) => updateActive({ repoPath: e.target.value })}
                  />
                  <button className="btn" onClick={() => sendUserMessage('[stub] scan repo...')}>
                    Scan
                  </button>
                </div>
                <div className="hint">Local indexing + retrieval will be wired later.</div>
              </div>
            )}
          </section>

          <section className="panel stage">
            <div className="panelHeader">
              <div>
                <div className="panelTitle">Stage</div>
                <div className="panelSub">Chat / drill transcript</div>
              </div>
            </div>

            <ChatPanel session={active} onSend={sendUserMessage} />
          </section>

          <section className="panel review">
            <div className="panelHeader">
              <div>
                <div className="panelTitle">Review</div>
                <div className="panelSub">Notes + scorecards (stub)</div>
              </div>
            </div>

            <div className="importBox">
              <div className="label">Notes</div>
              <textarea
                value={active.reviewNotes}
                placeholder="Capture feedback, weak spots, follow-ups..."
                onChange={(e) => updateActive({ reviewNotes: e.target.value })}
                rows={18}
              />
              <div className="hint">Saved locally with the session.</div>
            </div>

            <div className="cards">
              <div className="card">
                <div className="cardKicker">Signals</div>
                <div className="cardTitle">Communication</div>
                <div className="cardBody">Stub rubric: clarity, structure, concision.</div>
              </div>
              <div className="card">
                <div className="cardKicker">Signals</div>
                <div className="cardTitle">Technical Depth</div>
                <div className="cardBody">Stub rubric: correctness, tradeoffs, constraints.</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function ChatPanel({ session, onSend }: { session: Session; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const el = document.querySelector('.chatScroll')
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [session.messages.length, session.id])

  return (
    <div className="chat">
      <div className="chatScroll">
        {session.messages.map((m) => (
          <div key={m.id} className={m.role === 'assistant' ? 'msg assistant' : 'msg user'}>
            <div className="msgRole">{m.role === 'assistant' ? 'Grill' : 'You'}</div>
            <div className="msgText">{m.text}</div>
          </div>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          onSend(draft)
          setDraft('')
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={session.mode === 'drill' ? 'Answer the question…' : 'Ask something…'}
        />
        <button className="btn primary" type="submit">
          Send
        </button>
      </form>
    </div>
  )
}
