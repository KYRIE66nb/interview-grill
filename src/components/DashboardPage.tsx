import { useMemo } from 'react'
import { summarizeReviewPressure, addDays, ERROR_TYPE_LABELS } from '../core/mistakes'
import type { StorageMeta } from '../types'

type DashboardPageProps = {
  meta: StorageMeta
  todayDateKey: string
  onGenerateDailyReport: () => Promise<void>
}

function rangeDateKeys(todayDateKey: string, days: number): string[] {
  const list: string[] = []
  for (let i = 0; i < days; i += 1) {
    list.push(addDays(todayDateKey, -(days - 1 - i)))
  }
  return list
}

function percentage(done: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.round((done / total) * 100)}%`
}

function completionOfMode(meta: StorageMeta, modeId: 'luogu' | 'lanqiao', dateKeys: string[]): { done: number; total: number } {
  let done = 0
  dateKeys.forEach((dateKey) => {
    const progress = meta.dailyProgress[modeId][dateKey]
    if (!progress) return
    if (progress.totalCount > 0) {
      if (progress.doneCount >= progress.totalCount) done += 1
    }
  })
  return { done, total: dateKeys.length }
}

function completionOf408(meta: StorageMeta, dateKeys: string[]): { done: number; total: number } {
  let done = 0
  dateKeys.forEach((dateKey) => {
    if (meta.dailyLesson.completedByDate[dateKey]) done += 1
  })
  return { done, total: dateKeys.length }
}

function topTopics(meta: StorageMeta): string[] {
  const counter = new Map<string, number>()
  meta.mistakes.forEach((item) => {
    const topic = item.topic.trim() || '未分类'
    counter.set(topic, (counter.get(topic) ?? 0) + 1)
  })
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, count]) => `${topic} (${count})`)
}

function topErrorTypes(meta: StorageMeta): string[] {
  const counter = new Map<string, number>()
  meta.mistakes.forEach((item) => {
    const label = ERROR_TYPE_LABELS[item.errorType]
    counter.set(label, (counter.get(label) ?? 0) + 1)
  })
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => `${label} (${count})`)
}

export function DashboardPage({ meta, todayDateKey, onGenerateDailyReport }: DashboardPageProps) {
  const last7 = useMemo(() => rangeDateKeys(todayDateKey, 7), [todayDateKey])
  const last30 = useMemo(() => rangeDateKeys(todayDateKey, 30), [todayDateKey])

  const c408_7 = useMemo(() => completionOf408(meta, last7), [meta, last7])
  const c408_30 = useMemo(() => completionOf408(meta, last30), [meta, last30])
  const cluogu7 = useMemo(() => completionOfMode(meta, 'luogu', last7), [meta, last7])
  const cluogu30 = useMemo(() => completionOfMode(meta, 'luogu', last30), [meta, last30])
  const clanqiao7 = useMemo(() => completionOfMode(meta, 'lanqiao', last7), [meta, last7])
  const clanqiao30 = useMemo(() => completionOfMode(meta, 'lanqiao', last30), [meta, last30])

  const luoguToday = meta.dailyProgress.luogu[todayDateKey]
  const lanqiaoToday = meta.dailyProgress.lanqiao[todayDateKey]
  const today408Done = Boolean(meta.dailyLesson.completedByDate[todayDateKey])

  const pressure = summarizeReviewPressure(meta.mistakes, todayDateKey)
  const topicTrend = topTopics(meta)
  const errorTrend = topErrorTypes(meta)

  return (
    <main className="insightPage">
      <section className="insightHero">
        <div>
          <div className="lessonTitle">数据面板</div>
          <div className="lessonSub">完成率、薄弱点趋势、复习压力一屏查看。</div>
        </div>
        <button className="btn primary" onClick={() => void onGenerateDailyReport()}>
          生成今日日报
        </button>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">7/30 天完成率</div>
        <div className="dashboardGrid">
          <article className="metricCard">
            <div className="label">408（7 天）</div>
            <div className="overallScore">{percentage(c408_7.done, c408_7.total)}</div>
            <div className="hint">{c408_7.done}/{c408_7.total}</div>
          </article>
          <article className="metricCard">
            <div className="label">洛谷（7 天）</div>
            <div className="overallScore">{percentage(cluogu7.done, cluogu7.total)}</div>
            <div className="hint">{cluogu7.done}/{cluogu7.total}</div>
          </article>
          <article className="metricCard">
            <div className="label">蓝桥（7 天）</div>
            <div className="overallScore">{percentage(clanqiao7.done, clanqiao7.total)}</div>
            <div className="hint">{clanqiao7.done}/{clanqiao7.total}</div>
          </article>
          <article className="metricCard">
            <div className="label">408（30 天）</div>
            <div className="overallScore">{percentage(c408_30.done, c408_30.total)}</div>
            <div className="hint">{c408_30.done}/{c408_30.total}</div>
          </article>
          <article className="metricCard">
            <div className="label">洛谷（30 天）</div>
            <div className="overallScore">{percentage(cluogu30.done, cluogu30.total)}</div>
            <div className="hint">{cluogu30.done}/{cluogu30.total}</div>
          </article>
          <article className="metricCard">
            <div className="label">蓝桥（30 天）</div>
            <div className="overallScore">{percentage(clanqiao30.done, clanqiao30.total)}</div>
            <div className="hint">{clanqiao30.done}/{clanqiao30.total}</div>
          </article>
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">今日完成情况</div>
        <div className="dashboardGrid">
          <article className="metricCard">
            <div className="label">408</div>
            <div className="overallScore">{today408Done ? '1/1' : '0/1'}</div>
          </article>
          <article className="metricCard">
            <div className="label">洛谷</div>
            <div className="overallScore">{luoguToday ? `${luoguToday.doneCount}/${luoguToday.totalCount}` : '0/0'}</div>
          </article>
          <article className="metricCard">
            <div className="label">蓝桥</div>
            <div className="overallScore">{lanqiaoToday ? `${lanqiaoToday.doneCount}/${lanqiaoToday.totalCount}` : '0/0'}</div>
          </article>
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">薄弱点趋势</div>
        <div className="lessonTwoCol">
          <div>
            <div className="label">Top Topics</div>
            <ol className="plainList">
              {topicTrend.length === 0 ? <li>暂无数据</li> : null}
              {topicTrend.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
          <div>
            <div className="label">Top Error Types</div>
            <ol className="plainList">
              {errorTrend.length === 0 ? <li>暂无数据</li> : null}
              {errorTrend.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">复习队列压力</div>
        <div className="inline">
          <div className="pill">今日到期 {pressure.dueToday}</div>
          <div className="pill">未来 7 天到期 {pressure.dueNext7Days}</div>
        </div>
      </section>
    </main>
  )
}
