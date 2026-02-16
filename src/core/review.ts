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
    '使用固定答题框架：背景 -> 决策 -> 取舍 -> 指标 -> 风险。单题控制在 90 秒内，并用一句结论收尾。',
  correctness:
    '每个后端/算法结论都补一个具体机制（数据结构、接口约束、锁策略或复杂度证明）。',
  tradeoffs:
    '做最终方案前先给出至少两个可选方案，并解释在当前约束下为什么弃选另一个。',
  metrics:
    '每个回答至少给一个可量化结果：当前基线（延迟/QPS/错误率）、预期提升、验证方式。',
  risk:
    '回答结束前固定补一个故障场景和对应兜底（降级、告警阈值、回滚或熔断）。',
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
    return { score, note: `信号密度较高（命中 ${hits} 个要点），请在压力追问下继续保持。` }
  }
  if (score === 3) {
    return { score, note: `证据强度中等（命中 ${hits} 个要点），每题再补一个具体例子会更稳。` }
  }
  return { score, note: `覆盖较弱（命中 ${hits} 个要点），回答前建议按清单逐项检查。` }
}

function dimensionLabel(dimension: ReviewDimension): string {
  if (dimension === 'structure') return '结构化'
  if (dimension === 'correctness') return '正确性'
  if (dimension === 'tradeoffs') return '取舍权衡'
  if (dimension === 'metrics') return '量化指标'
  return '风险意识'
}

function buildTomorrowPlan(lowDimensions: ReviewDimension[]): string[] {
  const focusA = lowDimensions[0] ?? 'structure'
  const focusB = lowDimensions[1] ?? 'metrics'

  return [
    `09:00-09:30：围绕「${dimensionLabel(focusA)}」录 3 道口述题，每题控制在 60-90 秒。`,
    '09:30-10:00：做 1 轮后端基础快练，强制说清取舍与故障处理。',
    '19:00-19:30：做 1 题算法热身，并口头说明复杂度与边界条件。',
    `19:30-20:00：回放今天对话，重写最弱的 2 题，并重点复评「${dimensionLabel(focusB)}」。`,
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
      ? '还没有采集到你的回答。请先完成至少一轮作答，再生成有意义的复盘报告。'
      : `综合评分 ${overall}/5。优势维度：${dimensionLabel(sortedLow[sortedLow.length - 1])}；主要短板：${dimensionLabel(weakest[0])}。建议优先强化“量化指标 + 风险兜底”的表达。`

  return {
    generatedAt: Date.now(),
    overall,
    dimensions,
    actionableImprovements,
    tomorrowPracticePlan,
    summary,
  }
}
