# Interview Grill MVP Manual Test Checklist

## 1) Mock Interview mode flow (15-minute structure)
- Open app, switch to `Mock Interview (Tencent/ByteDance intern)` mode.
- Click `Start Mock (15m)` and confirm transcript shows:
  - stage 1 project deep-dive
  - stage 2 backend fundamentals (rotating topic)
  - stage 3 algorithm warmup
- Submit one answer per stage and use `Cmd/Ctrl+Enter` to continue.
- Confirm final assistant message indicates completion and review generation prompt.

## 2) Review + score generation
- Click `Generate Review`.
- Confirm scorecard renders all 5 dimensions:
  - structure
  - correctness
  - tradeoffs
  - metrics
  - risk
- Confirm exactly 3 actionable improvements are listed.
- Confirm a `Tomorrow Practice Plan` section is present.

## 3) Session persistence + replay
- Run at least one mock session and generate review.
- Close the Electron app completely and reopen.
- Confirm the same session is restored with transcript, scorecard, and plan intact.
- In Stage panel, click `Replay` and verify transcript replays from the start.

## 4) Keyboard shortcuts
- `Cmd/Ctrl+Enter`: in mock mode, advances to next stage (or starts mock if not running).
- `Cmd/Ctrl+S`: saves current report JSON via save dialog.
- `Cmd/Ctrl+K`: opens mode switch dialog.
- `Esc`: closes mode switch dialog.

## 5) .gitignore hygiene
- Confirm no build outputs were staged (`dist/`, `release/`, `.app`, installer artifacts).
- Run `git status --short` and verify only intended source/docs edits appear.

