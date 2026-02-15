import type { ReviewDimension, ReviewReport, Session } from '../types'

const DIMENSIONS: ReviewDimension[] = ['structure', 'correctness', 'tradeoffs', 'metrics', 'risk']

const KEYWORDS: Record<ReviewDimension, RegExp> = {
  structure: /\b(first|second|finally|step|summary|therefore)\b|首先|其次|最后|第一|第二|第三/gi,
  correctness:
    /\b(consistency|index|transaction|latency|throughput|complexity|o\(|deadlock|cache|replica|idempot)\b|正确|复杂度|索引|事务|并发/gi,
  tradeoffs: /\b(tradeoff|pros|cons|cost|benefit|vs|choose|option|constraint)\b|取舍|权衡|成本|收益|约束/gi,
  metrics: /\b(ms|qps|rps|p99|sla|error rate|throughput|latency|%|million|k)\b|\d+|指标|耗时|成功率|吞吐/gi,
  risk: /\b(risk|failure|fallback|rollback|alert|monitor|degrade|retry|incident)\b|风险|故障|回滚|兜底|监控|降级/gi,
}

const IMPROVEMENT_TEMPLATES: Record<ReviewDimension, string> = {
  structure:
    'Use a strict answer frame: context -> decision -> tradeoff -> metric -> risk. Keep each answer under 90 seconds and close with one takeaway.',
  correctness:
    'For each backend/algorithm claim, attach one concrete mechanism (data structure, API contract, lock strategy, or complexity proof).',
  tradeoffs:
    'State at least two options before the final design decision and explain why the rejected option lost under interview constraints.',
  metrics:
    'Add a measurable result in every answer: latency/QPS/error-rate baseline, expected improvement, and validation method.',
  risk:
    'Always include one failure mode plus mitigation (fallback, alert threshold, rollback, or circuit breaker) before ending the answer.',
}

function clampScore(score: number): number {
  return Math.max(1, Math.min(5, score))
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern)
  return matches ? matches.length : 0
}

function scoreDimension(text: string, dimension: ReviewDimension): { score: number; note: string } {
  const hits = countMatches(text, KEYWORDS[dimension])
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const base = 1 + Math.floor(hits / 2)
  const densityBoost = wordCount > 120 ? 1 : 0
  const score = clampScore(base + densityBoost)

  if (score >= 4) {
    return { score, note: `Strong signal density (${hits} cues). Keep this level under pressure.` }
  }
  if (score === 3) {
    return { score, note: `Moderate evidence (${hits} cues). Add one more concrete example per answer.` }
  }
  return { score, note: `Weak coverage (${hits} cues). Use a deliberate checklist before speaking.` }
}

function buildTomorrowPlan(lowDimensions: ReviewDimension[]): string[] {
  const focusA = lowDimensions[0] ?? 'structure'
  const focusB = lowDimensions[1] ?? 'metrics'

  return [
    `09:00-09:30: Record 3 answers focused on ${focusA}; enforce a 60-90 second structure.`,
    `09:30-10:00: Do one backend fundamentals drill and verbalize tradeoffs + failure handling.`,
    `19:00-19:30: Solve one warmup algorithm and explain complexity plus edge cases out loud.`,
    `19:30-20:00: Replay today's transcript, rewrite weakest 2 answers, and rescore ${focusB}.`,
  ]
}

export function generateReviewReport(session: Session): ReviewReport {
  const userAnswers = session.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.text.trim())
    .filter(Boolean)

  const corpus = userAnswers.join('\n').toLowerCase()
  const dimensions = {
    structure: scoreDimension(corpus, 'structure'),
    correctness: scoreDimension(corpus, 'correctness'),
    tradeoffs: scoreDimension(corpus, 'tradeoffs'),
    metrics: scoreDimension(corpus, 'metrics'),
    risk: scoreDimension(corpus, 'risk'),
  }

  const overall = clampScore(
    Math.round(
      (dimensions.structure.score +
        dimensions.correctness.score +
        dimensions.tradeoffs.score +
        dimensions.metrics.score +
        dimensions.risk.score) /
        DIMENSIONS.length,
    ),
  )

  const sortedLow = [...DIMENSIONS].sort((a, b) => dimensions[a].score - dimensions[b].score)
  const weakest = sortedLow.slice(0, 3)
  const actionableImprovements = weakest.map((dimension) => IMPROVEMENT_TEMPLATES[dimension])
  const tomorrowPracticePlan = buildTomorrowPlan(weakest)

  const summary =
    userAnswers.length === 0
      ? 'No user answers captured yet. Provide at least one round of responses to generate a meaningful review.'
      : `Overall ${overall}/5. Best area: ${sortedLow[sortedLow.length - 1]}. Primary gap: ${weakest[0]}. Prioritize metrics and risk storytelling for Tencent/ByteDance-style follow-up pressure.`

  return {
    generatedAt: Date.now(),
    overall,
    dimensions,
    actionableImprovements,
    tomorrowPracticePlan,
    summary,
  }
}

