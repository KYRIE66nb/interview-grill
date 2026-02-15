# Question Schema (MVP)

This document defines the JSON schema shapes used by Interview Grill for:
- Question bank entries
- Generated questions (parameterized)
- Follow-ups
- Scoring
- Review reports (replayable)

All examples are **illustrative**; implement as TypeScript interfaces + runtime validation (e.g. zod) in the app.

## 1) Conventions
- IDs are strings (`q_...`, `sess_...`, `turn_...`).
- Timestamps use ISO 8601 with timezone, e.g. `2026-02-15T22:00:00+08:00`.
- Chinese fields end with `_zh`.
- `tags` are short lowercase identifiers.

## 2) Question
A `Question` is the atomic prompt shown to the user.

```json
{
  "id": "q_proj_001",
  "version": 1,
  "category": "project",
  "difficulty": 2,
  "focus": ["java-backend"],
  "tags": ["resume", "ownership", "metrics"],
  "source": {
    "kind": "template",
    "template_id": "tpl_project_deep_dive",
    "inputs": {
      "project_name": "Payment Gateway",
      "tech": ["Spring Boot", "MySQL", "Redis"]
    }
  },
  "prompt": "Walk me through the architecture of <project_name>. What were the key tradeoffs?",
  "prompt_zh": "请你讲一下 <project_name> 的整体架构。你当时做了哪些关键取舍？",
  "expected": {
    "signals": [
      "clear architecture overview",
      "tradeoffs with alternatives",
      "metrics or evidence"
    ],
    "red_flags": [
      "vague responsibilities",
      "no measurable outcomes"
    ]
  },
  "constraints": {
    "time_limit_sec": 180,
    "allow_hints": true
  }
}
```

### Fields
- `id`: stable question id
- `version`: schema evolution
- `category`: one of `project` | `cs-fundamentals` | `system-design` | `algorithms` | `coding`
- `difficulty`: integer 1-5
- `focus`: array of `java-backend` | `frontend` | `algorithms` (can be empty)
- `tags`: freeform tags for selection/remediation
- `source.kind`: `bank` | `template` | `llm`
- `prompt`, `prompt_zh`: display text
- `expected.signals`: what a good answer should include
- `expected.red_flags`: common failure patterns
- `constraints`: timing and hint policy (used by intensity)

## 3) Followup
A `Followup` is asked after the user answer to probe depth or address gaps.

```json
{
  "id": "fu_001",
  "kind": "clarify",
  "prompt": "What was your p95 latency before and after the change?",
  "prompt_zh": "优化前后 p95 延迟分别是多少？",
  "trigger": {
    "when": "missing_signal",
    "signal": "metrics or evidence"
  },
  "max_depth": 2
}
```

### Fields
- `kind`: `clarify` | `drilldown` | `challenge` | `edge-case` | `reverse`
- `trigger`: simple rule for template/heuristic mode; in LLM mode it can be omitted
- `max_depth`: stop condition for follow-up chains

## 4) Score
Scores are rubric-based and attached per question turn.

```json
{
  "overall": 3,
  "dimensions": {
    "correctness": 3,
    "depth": 2,
    "clarity": 4,
    "evidence": 2,
    "tradeoffs": 3,
    "ownership": 4
  },
  "rationale_zh": "思路清晰，但缺少量化指标；对一致性取舍解释不够深入。",
  "improvements_zh": [
    "补充关键指标（QPS、延迟、错误率）",
    "对一致性/可用性取舍给出明确场景"
  ],
  "tags_hit": ["clarity"],
  "tags_miss": ["metrics", "tradeoffs"]
}
```

### Rules
- `overall`: 1-5 integer
- Each dimension: 1-5 integer
- `rationale_zh`: short explanation in Chinese
- `improvements_zh`: actionable bullets

## 5) Review (Replayable Report)
A `ReviewReport` is the persisted artifact for playback.

```json
{
  "schema_version": 1,
  "report_id": "rep_001",
  "session": {
    "session_id": "sess_001",
    "mode": "mock",
    "intensity": "normal",
    "focus": ["java-backend", "system-design"],
    "started_at": "2026-02-15T21:00:00+08:00",
    "ended_at": "2026-02-15T21:45:00+08:00"
  },
  "inputs": {
    "resume": {"kind": "text", "hash": "sha256:..."},
    "repo": {"path": "/Users/me/project", "fingerprint_hash": "sha256:..."},
    "online_mode": {"enabled": false, "provider": null}
  },
  "turns": [
    {
      "turn_id": "turn_001",
      "question": {"id": "q_proj_001", "prompt": "...", "prompt_zh": "...", "category": "project"},
      "asked_at": "2026-02-15T21:02:00+08:00",
      "answer": {
        "text": "...",
        "ended_at": "2026-02-15T21:05:00+08:00"
      },
      "followups": [
        {
          "followup": {"id": "fu_001", "prompt": "...", "prompt_zh": "..."},
          "asked_at": "2026-02-15T21:05:10+08:00",
          "answer": {"text": "...", "ended_at": "2026-02-15T21:05:40+08:00"}
        }
      ],
      "score": {"overall": 3, "dimensions": {"correctness": 3, "depth": 2, "clarity": 4, "evidence": 2, "tradeoffs": 3, "ownership": 4}, "rationale_zh": "...", "improvements_zh": ["..."]}
    }
  ],
  "summary_zh": {
    "overall_zh": "整体表达清晰，但缺少数据支撑。",
    "strengths_zh": ["结构化表达", "能解释关键模块"],
    "gaps_zh": ["指标缺失", "一致性取舍不够具体"],
    "next_actions_zh": ["准备 3 个可量化案例", "补齐缓存一致性方案对比"]
  },
  "scorecard": {
    "by_category": {
      "project": 3,
      "system-design": 3,
      "cs-fundamentals": 2,
      "algorithms": 2,
      "coding": 0
    },
    "by_dimension_avg": {
      "correctness": 3.0,
      "depth": 2.3,
      "clarity": 3.8,
      "evidence": 2.0,
      "tradeoffs": 2.7,
      "ownership": 3.5
    }
  }
}
```

### Minimal playback requirements
- Must be able to reconstruct the session timeline from `turns`
- Must show `prompt_zh`, user answers, follow-ups, and `score`

## 6) Bank Template (Optional but Recommended)
Question bank templates can be stored as JSON with placeholders.

```json
{
  "template_id": "tpl_project_deep_dive",
  "category": "project",
  "difficulty": 2,
  "prompt": "Walk me through the architecture of <project_name>. What were the key tradeoffs?",
  "prompt_zh": "请你讲一下 <project_name> 的整体架构。你当时做了哪些关键取舍？",
  "expected": {
    "signals": ["clear architecture overview", "tradeoffs with alternatives", "metrics or evidence"],
    "red_flags": ["vague responsibilities", "no measurable outcomes"]
  },
  "followups": [
    {
      "kind": "clarify",
      "prompt": "What was your p95 latency before and after the change?",
      "prompt_zh": "优化前后 p95 延迟分别是多少？",
      "trigger": {"when": "missing_signal", "signal": "metrics or evidence"},
      "max_depth": 2
    }
  ],
  "tags": ["ownership", "metrics"]
}
```
