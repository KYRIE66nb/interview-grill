# Interview Grill Desktop App Spec (MVP)

## 1) Product Goal
Interview Grill is a desktop app that helps a candidate **practice interview pressure** by turning their **resume + projects + codebase** into targeted, structured interview sessions.

Primary outcomes:
- Ask high-signal questions (project deep dive + CS fundamentals + system design + algorithms + coding)
- Produce **Chinese** summaries, a clear **scoring rubric**, and a **replayable review report**
- Default to **on-device only** privacy; optional online LLM is explicit opt-in with user key

## 2) Target Users / Use Cases
- New grad / mid-level SWE preparing for interviews
- Power users who want a repeatable “grill” workflow and measurable progress

Key use cases:
- Import resume text or PDF and extract projects/skills
- Point to a repo path; app derives tech stack and relevant drilling points
- Run a session in one of three modes with adjustable intensity
- Review session report; redo weak areas

## 3) Inputs
MVP input sources (all local):
- Resume plain text (paste)
- Resume PDF (local file)
- Repo path (local folder)
- Project templates (local YAML/JSON prompt templates packaged with app)

Derived signals (MVP heuristics):
- Project list + keywords (from resume parsing)
- Repo tech fingerprint (by scanning filenames: `pom.xml`, `build.gradle`, `package.json`, etc.)
- Topic coverage tags: `java-backend`, `frontend`, `algorithms`, `system-design`, `cs-fundamentals`

## 4) Modes & Intensity
Modes:
- Continuous grilling: app keeps asking until user stops
- Per-question practice: user selects a topic/question; focused practice
- Full mock interview: timed, structured rounds (warmup -> deep dive -> design -> algo/coding -> wrap-up)

Intensity:
- Gentle: hints early, fewer follow-ups, lower interruption
- Normal: standard interview pacing, moderate follow-ups
- Hell: rapid follow-ups, adversarial clarification, higher bar for evidence/metrics

## 5) Questioning System (What We Ask)
Question categories (MVP):
- Project-specific drill: architecture, tradeoffs, metrics, failures, debugging, ownership
- 8-gu (CS fundamentals): OS / network / DB / JVM / concurrency / security basics
- System design: caching, rate limit, idempotency, MQ, data modeling, consistency
- Algorithms: fundamentals + project-relevant patterns
- Coding exercises: short problems + optionally longer take-home style

MVP question selection policy:
- Start from resume projects (highest weight)
- Mix in 8-gu + system design + algo to ensure breadth
- Increase difficulty if scores are high; remediate weak tags

## 6) Outputs
MVP outputs (persisted locally):
- Chinese session summary (high-level performance + key gaps)
- Per-question scores (rubric-based)
- “Replayable” review report: timeline transcript + questions + user answers + follow-ups + scoring + suggestions

Export (MVP):
- Save as JSON (primary)
- Optional export to Markdown (secondary)

## 7) Privacy & Online Mode
Default: on-device only.
- All inputs, transcripts, and reports stored locally
- No network calls required for local mode

Optional online LLM mode:
- Explicit opt-in toggle + user-provided API key
- Clear indicator when online mode is active
- Never upload repo by default; only upload **extracted snippets** if user enables “share context”

## 8) MVP Scope (What We Build First)
### 8.1 Desktop App Shell
- Cross-platform desktop (recommended: Electron + React + local Node runtime)
- Single-window UI with three main screens:
  - Setup: import resume/PDF + choose repo path + choose focus directions + mode/intensity
  - Session: live Q/A view + timer + hints (depending on intensity)
  - Review: session report playback + scoring breakdown + “redo” button

### 8.2 Local Engine
- Resume ingestion:
  - Text paste parser (MVP)
  - PDF text extraction (MVP; best-effort)
- Repo scanner (MVP):
  - Detect languages/frameworks by file signatures and basic dependency parsing
- Question bank (MVP):
  - Local JSON templates; can be tagged and parameterized
  - Simple generator that fills placeholders from extracted project facts
- Session runner (MVP):
  - Orchestrates question -> answer capture -> follow-ups -> scoring -> report assembly

### 8.3 Scoring & Rubric (MVP)
- Standardized rubric dimensions:
  - Correctness, Depth, Clarity, Evidence/Metrics, Tradeoffs, Ownership
- Category-specific modifiers (e.g., coding emphasizes correctness + complexity)
- Scores: 1-5 per dimension + overall

### 8.4 Reports (MVP)
- Persist `ReviewReport` JSON to app data directory
- Playback UI:
  - chronological transcript
  - jump-to-question navigation
  - show suggested better answer in Chinese

## 9) Architecture (Implementable)
### 9.1 High-level
- UI (Renderer): session controls, transcript view, review playback
- Core (Main/Node): ingestion, repo scan, question generation, scoring, persistence

Suggested module split:
- `core/ingest` (resume text, PDF extract)
- `core/repo` (fingerprint, lightweight indexing)
- `core/questions` (bank, templating, selection)
- `core/session` (state machine)
- `core/scoring` (rubric)
- `core/storage` (local files, encryption optional)

### 9.2 Local LLM / Heuristics
MVP can run without any model:
- Template-driven questions + deterministic follow-ups
- Basic scoring rules (keyword coverage + structure checks)

Optional (later): on-device small model integration.

### 9.3 Online LLM Adapter (Opt-in)
- Provider-agnostic interface: `LLMClient.generate()`
- Input redaction layer
- Rate limit + error handling

## 10) Data Model (MVP)
All stored as JSON (see `docs/question-schema.md`). Core entities:
- `CandidateProfile` (resume facts, projects, skills, preferences)
- `RepoProfile` (detected stack, modules, notable files)
- `Question` / `Followup`
- `Session` (mode, intensity, focus)
- `AnswerTurn` (question, user answer, followups, timestamps)
- `Score` (rubric)
- `ReviewReport` (session + transcript + summary_zh)

Storage layout (example):
- `~/<appData>/profiles/<profile_id>.json`
- `~/<appData>/sessions/<session_id>/report.json`
- `~/<appData>/sessions/<session_id>/artifacts/*.md`

## 11) Non-goals (MVP)
- Not a full ATS/resume builder
- Not a collaborative cloud product (no accounts, no sync)
- Not a full IDE; code execution sandbox is optional and deferred
- Not a perfect PDF parser (best-effort text extraction is acceptable)
- Not guaranteed to be “truthful” in online LLM mode; must label generated content

## 12) Acceptance Criteria (MVP)
- Works fully offline: can import resume text, set repo path, run a session, generate report
- Supports 3 modes + 3 intensities
- Question generation uses resume + repo fingerprint to personalize at least the project drill section
- Produces a replayable report with per-question scoring and Chinese summary
- Online mode requires explicit opt-in + key; default is off
