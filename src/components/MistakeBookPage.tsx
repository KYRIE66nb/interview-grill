import { useMemo, useState } from 'react'
import { ERROR_TYPE_LABELS, filterMistakes } from '../core/mistakes'
import type { MistakeErrorType, MistakeItem, MistakeSourceMode, StorageMeta } from '../types'

type MistakeBookPageProps = {
  meta: StorageMeta
  todayDateKey: string
  onUpdateMeta: (updater: (meta: StorageMeta) => StorageMeta) => void
  onExport: () => Promise<void>
}

const SOURCE_OPTIONS: Array<{ value: MistakeSourceMode | 'all'; label: string }> = [
  { value: 'all', label: '全部来源' },
  { value: '408', label: '408' },
  { value: 'luogu', label: '洛谷' },
  { value: 'lanqiao', label: '蓝桥' },
  { value: 'interview', label: '面试' },
]

const STATUS_OPTIONS: Array<{ value: MistakeItem['status'] | 'all'; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'open', label: '待处理' },
  { value: 'reviewed', label: '已复习' },
  { value: 'fixed', label: '已修复' },
]

const ERROR_OPTIONS: Array<{ value: MistakeErrorType | 'all'; label: string }> = [
  { value: 'all', label: '全部错因' },
  { value: 'concept', label: '概念不清' },
  { value: 'boundary', label: '边界条件' },
  { value: 'complexity', label: '复杂度判断' },
  { value: 'implementation', label: '实现细节' },
  { value: 'careless', label: '粗心失误' },
  { value: 'unknown', label: '不会做' },
  { value: 'expression', label: '表达不清' },
]

function sourceLabel(source: MistakeSourceMode): string {
  if (source === '408') return '408'
  if (source === 'luogu') return '洛谷'
  if (source === 'lanqiao') return '蓝桥'
  return '面试'
}

export function MistakeBookPage({ meta, todayDateKey, onUpdateMeta, onExport }: MistakeBookPageProps) {
  const [sourceMode, setSourceMode] = useState<MistakeSourceMode | 'all'>('all')
  const [errorType, setErrorType] = useState<MistakeErrorType | 'all'>('all')
  const [status, setStatus] = useState<MistakeItem['status'] | 'all'>('all')
  const [minSeverity, setMinSeverity] = useState(1)
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filtered = useMemo(
    () =>
      filterMistakes(meta.mistakes, {
        sourceMode,
        errorType,
        status,
        minSeverity,
        tag: query,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }).sort((a, b) => b.updatedAt - a.updatedAt),
    [meta.mistakes, sourceMode, errorType, status, minSeverity, query, fromDate, toDate],
  )

  function patchItem(id: string, updater: (item: MistakeItem) => MistakeItem) {
    onUpdateMeta((prev) => ({
      ...prev,
      mistakes: prev.mistakes.map((item) => (item.id === id ? updater(item) : item)),
    }))
  }

  function removeItem(id: string) {
    onUpdateMeta((prev) => ({
      ...prev,
      mistakes: prev.mistakes.filter((item) => item.id !== id),
    }))
  }

  return (
    <main className="insightPage">
      <section className="insightHero">
        <div>
          <div className="lessonTitle">错题本 / 薄弱点</div>
          <div className="lessonSub">跨 408 / 洛谷 / 蓝桥 / 面试统一管理，可筛选、编辑、导出、进入复习。</div>
        </div>
        <div className="pill">今日 {todayDateKey}</div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">筛选</div>
        <div className="filterGrid">
          <select value={sourceMode} onChange={(event) => setSourceMode(event.target.value as MistakeSourceMode | 'all')}>
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select value={errorType} onChange={(event) => setErrorType(event.target.value as MistakeErrorType | 'all')}>
            {ERROR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select value={status} onChange={(event) => setStatus(event.target.value as MistakeItem['status'] | 'all')}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="inlineFilter">
            严重度 ≥
            <input
              type="number"
              min={1}
              max={5}
              value={minSeverity}
              onChange={(event) => setMinSeverity(Math.max(1, Math.min(5, Number(event.target.value) || 1)))}
            />
          </label>

          <input value={query} placeholder="按标签/主题搜索" onChange={(event) => setQuery(event.target.value)} />
          <input value={fromDate} type="date" onChange={(event) => setFromDate(event.target.value)} />
          <input value={toDate} type="date" onChange={(event) => setToDate(event.target.value)} />
        </div>

        <div className="inline">
          <button className="btn" onClick={() => {
            setSourceMode('all')
            setErrorType('all')
            setStatus('all')
            setMinSeverity(1)
            setQuery('')
            setFromDate('')
            setToDate('')
          }}>
            重置筛选
          </button>
          <button className="btn primary" onClick={() => void onExport()}>
            导出错题本 Markdown
          </button>
          <div className="hint">共 {filtered.length} 条</div>
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">错题列表</div>

        {filtered.length === 0 ? <div className="hint">当前筛选下暂无记录。</div> : null}

        <div className="taskList">
          {filtered.map((item) => (
            <article key={item.id} className="taskCard mistakeCard">
              <div className="taskHeader">
                <div className="taskCheck">
                  <span>{sourceLabel(item.sourceMode)}</span>
                  <span className="pill">{item.date}</span>
                  <span className="pill">S{item.severity}</span>
                </div>

                <div className="inline">
                  <button className="btn" onClick={() => patchItem(item.id, (current) => ({
                    ...current,
                    updatedAt: Date.now(),
                    status: 'fixed',
                  }))}>
                    标记 fixed
                  </button>
                  <button className="btn danger" onClick={() => removeItem(item.id)}>
                    删除
                  </button>
                </div>
              </div>

              <input
                value={item.topic}
                placeholder="主题"
                onChange={(event) => patchItem(item.id, (current) => ({
                  ...current,
                  topic: event.target.value,
                  updatedAt: Date.now(),
                }))}
              />

              <textarea
                rows={2}
                value={item.prompt}
                placeholder="题干/知识点"
                onChange={(event) => patchItem(item.id, (current) => ({
                  ...current,
                  prompt: event.target.value,
                  updatedAt: Date.now(),
                }))}
              />

              <div className="filterGrid">
                <select
                  value={item.errorType}
                  onChange={(event) =>
                    patchItem(item.id, (current) => ({
                      ...current,
                      errorType: event.target.value as MistakeErrorType,
                      updatedAt: Date.now(),
                    }))
                  }
                >
                  {ERROR_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                    <option key={`${item.id}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={item.status}
                  onChange={(event) =>
                    patchItem(item.id, (current) => ({
                      ...current,
                      status: event.target.value as MistakeItem['status'],
                      updatedAt: Date.now(),
                    }))
                  }
                >
                  {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                    <option key={`${item.id}-${option.value}-status`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label className="inlineFilter">
                  严重度
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={item.severity}
                    onChange={(event) =>
                      patchItem(item.id, (current) => ({
                        ...current,
                        severity: Math.max(1, Math.min(5, Number(event.target.value) || 1)) as MistakeItem['severity'],
                        updatedAt: Date.now(),
                      }))
                    }
                  />
                </label>
              </div>

              <textarea
                rows={2}
                value={item.notes}
                placeholder="复盘备注"
                onChange={(event) => patchItem(item.id, (current) => ({
                  ...current,
                  notes: event.target.value,
                  updatedAt: Date.now(),
                }))}
              />

              <div className="hint">
                SRS：下次复习 {item.srs.dueDate} · 间隔 {item.srs.intervalDays} 天 · 复习 {item.srs.reviewCount} 次 · 错因 {ERROR_TYPE_LABELS[item.errorType]}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
