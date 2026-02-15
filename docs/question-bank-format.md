# Question Bank Format (Offline-first, Git-friendly)

This document defines how to store and version a local interview question bank.

Goals:
- Offline by default (no remote dependencies)
- Easy to edit in a text editor
- Git-diff friendly
- Extensible without breaking older content

## Recommended approach for MVP

Use Markdown files with YAML front matter per question.
- Humans can read/edit quickly.
- Git diffs are clean.
- The app can parse front matter for metadata and Markdown body for content.

Directory layout:

```text
question-bank/
  questions/
    seed/
      seed-zh.md
```

## One question per Markdown (future split)

In MVP we start with a single seed file, but the long-term layout is:

```text
question-bank/questions/
  java/
    q-java-string.md
  concurrency/
    q-jmm-volatile.md
  db/
    q-mysql-index.md
  sysdesign/
    q-rate-limit.md
```

Each file uses YAML front matter:

```markdown
---
id: q-jmm-volatile
version: 1
lang: zh
created: 2026-02-15
updated: 2026-02-15
category: interview
tracks: [java-backend]

tags:
  - concurrency/volatile
  - jvm/memory-model
  - java/basics

difficulty: L2
projects: []
related: []
---

## Prompt
...

## Followups
...

## Checkpoints
...

## Red flags
...
```

### Field definitions
- `id` (required): stable unique id
- `version` (required): bump when meaning changes
- `lang`: `zh` or `en`
- `created`/`updated`: `YYYY-MM-DD`
- `category`: `interview` (reserved for now)
- `tracks`: preset collections (e.g. `java-backend`)
- `tags`: must align with `docs/topic-taxonomy.md`
- `difficulty`: `L1`..`L5`
- `projects`: optional mapping to a project id
- `related`: related question ids

## Difficulty guidelines

- L1: definitions + basic usage
- L2: common pitfalls + practical tradeoffs
- L3: internals/edge cases + performance implications
- L4: design-level reasoning + correctness constraints
- L5: highly specialized tuning

## Optional export format (JSONL)

If we need bulk import/export later:
- `question-bank/export/questions.jsonl`
- one JSON per line, mirroring the YAML fields
