import { useMemo, useState } from 'react'
import { applySrsReview, ERROR_TYPE_LABELS, type ReviewRating } from '../core/mistakes'
import type { MistakeItem, StorageMeta } from '../types'

type ReviewQueuePageProps = {
  meta: StorageMeta
  todayDateKey: string
  onUpdateMeta: (updater: (meta: StorageMeta) => StorageMeta) => void
  onExport?: () => Promise<void>
}

const RATING_OPTIONS: Array<{ value: ReviewRating; label: string; hint: string }> = [
  { value: 'again', label: 'Again', hint: '没想起来，明天再来' },
  { value: 'hard', label: 'Hard', hint: '想起来了但很吃力' },
  { value: 'good', label: 'Good', hint: '基本掌握' },
  { value: 'easy', label: 'Easy', hint: '非常熟练' },
]

function sortDue(a: MistakeItem, b: MistakeItem): number {
  if (a.srs.dueDate !== b.srs.dueDate) return a.srs.dueDate.localeCompare(b.srs.dueDate)
  return b.severity - a.severity
}

export function ReviewQueuePage({ meta, todayDateKey, onUpdateMeta, onExport }: ReviewQueuePageProps) {
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({})

  const dueItems = useMemo(
    () => meta.mistakes.filter((item) => item.status !== 'fixed' && item.srs.dueDate <= todayDateKey).sort(sortDue),
    [meta.mistakes, todayDateKey],
  )

  const future7DaysCount = useMemo(
    () => meta.mistakes.filter((item) => item.status !== 'fixed' && item.srs.dueDate > todayDateKey).length,
    [meta.mistakes, todayDateKey],
  )

  function submitReview(itemId: string, rating: ReviewRating) {
    onUpdateMeta((prev) => ({
      ...prev,
      mistakes: prev.mistakes.map((item) => {
        if (item.id !== itemId) return item
        return applySrsReview(item, rating, todayDateKey)
      }),
    }))
  }

  return (
    <main className="insightPage">
      <section className="insightHero">
        <div>
          <div className="lessonTitle">复习队列（SRS）</div>
          <div className="lessonSub">今日到期条目：先回忆再看答案，再给 Again/Hard/Good/Easy 评分。</div>
        </div>
        <div className="pill">到期 {dueItems.length} 条</div>
      </section>

      <section className="lessonPanel">
        <div className="inline">
          <div className="pill">今日到期：{dueItems.length}</div>
          <div className="pill">未来待复习：{future7DaysCount}</div>
          {onExport ? (
            <button className="btn" onClick={() => void onExport()}>
              导出今日复习清单
            </button>
          ) : null}
        </div>
        <div className="hint">快捷键：Cmd/Ctrl+Enter 在本页会保存当前编辑状态；评分按钮会立即更新下次 dueDate。</div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">到期条目</div>
        {dueItems.length === 0 ? <div className="hint">今天没有到期复习，太棒了。可以去 408/洛谷/蓝桥做新任务。</div> : null}

        <div className="taskList">
          {dueItems.map((item, index) => (
            <article key={item.id} className="taskCard mistakeCard">
              <div className="taskHeader">
                <div className="taskCheck">
                  <span>#{index + 1}</span>
                  <span className="pill">{item.sourceMode}</span>
                  <span className="pill">{item.srs.dueDate}</span>
                </div>
                <div className="hint">错因：{ERROR_TYPE_LABELS[item.errorType]} · 严重度 {item.severity}</div>
              </div>

              <div className="label">回忆题干 / 知识点</div>
              <div>{item.prompt}</div>

              <div className="inline">
                <button
                  className="btn"
                  onClick={() =>
                    setRevealedIds((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                >
                  {revealedIds[item.id] ? '隐藏答案' : '显示答案/复盘'}
                </button>
                <div className="hint">主题：{item.topic}</div>
              </div>

              {revealedIds[item.id] ? (
                <div className="reviewReveal">
                  <div className="hint">我的答案：{item.myAnswer || '（未填写）'}</div>
                  <div className="hint">参考答案：{item.expected || '（未填写）'}</div>
                  <div className="hint">复盘：{item.notes || '（未填写）'}</div>
                </div>
              ) : null}

              <div className="reviewRatingRow">
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={`${item.id}-${option.value}`}
                    className="btn"
                    onClick={() => submitReview(item.id, option.value)}
                    title={option.hint}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="hint">当前间隔：{item.srs.intervalDays} 天 · 复习次数：{item.srs.reviewCount}</div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
