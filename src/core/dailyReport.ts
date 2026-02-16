export type DailyReportInput = {
  dateKey: string
  lesson408?: string | null
  luogu?: string | null
  lanqiao?: string | null
  weaknessTop: string[]
  tomorrowPlan: string[]
}

function sectionBody(content?: string | null): string[] {
  if (!content || !content.trim()) {
    return ['_今日该模块暂无导出内容，请先生成对应日报文件。_']
  }

  const lines = content
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index) => {
      if (index === 0 && line.startsWith('#')) return false
      return true
    })

  return lines.length > 0 ? lines : ['_内容为空。_']
}

export function renderDailyReport(input: DailyReportInput): string {
  const lines: string[] = []
  lines.push(`# 学习日报 ${input.dateKey}`)
  lines.push('')

  lines.push('## 408')
  lines.push(...sectionBody(input.lesson408))
  lines.push('')

  lines.push('## 洛谷')
  lines.push(...sectionBody(input.luogu))
  lines.push('')

  lines.push('## 蓝桥')
  lines.push(...sectionBody(input.lanqiao))
  lines.push('')

  lines.push('## 今日薄弱点 Top 3')
  if (input.weaknessTop.length === 0) {
    lines.push('- 今日暂无薄弱点记录。')
  } else {
    input.weaknessTop.slice(0, 3).forEach((item) => lines.push(`- ${item.replace(/^\d+\.\s*/, '')}`))
  }
  lines.push('')

  lines.push('## 明日计划（自动 3 条）')
  input.tomorrowPlan.slice(0, 3).forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`)
  })

  return lines.join('\n')
}
