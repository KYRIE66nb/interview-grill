import { useCallback, useMemo } from 'react'
import { buildWeaknessProfile, ERROR_TYPE_LABELS } from '../core/mistakes'
import { buildDailyLesson, renderDailyLessonMarkdown, toDateKey } from '../core/dailyLesson'
import { exportMarkdownFile } from '../storage'
import type { DailyLessonLevel, MistakeErrorType, StorageMeta } from '../types'

type DailyLessonPageProps = {
  meta: StorageMeta
  onUpdateMeta: (updater: (meta: StorageMeta) => StorageMeta) => void
  onStatus: (message: string) => void
  onQuickAddMistake: (input: { topic: string; prompt: string; errorType: MistakeErrorType; notes: string }) => void
}

const LEVEL_OPTIONS: DailyLessonLevel[] = ['L0', 'L1', 'L2', 'L3']

function formatCheckinTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DailyLessonPage({ meta, onUpdateMeta, onStatus, onQuickAddMistake }: DailyLessonPageProps) {
  const todayDateKey = useMemo(() => toDateKey(new Date()), [])

  const weaknessProfile = useMemo(() => buildWeaknessProfile(meta.mistakes, todayDateKey), [meta.mistakes, todayDateKey])

  const lesson = useMemo(
    () =>
      buildDailyLesson({
        topicOverride: meta.dailyLesson.topicOverride,
        level: meta.dailyLesson.level,
        weaknessProfile,
      }),
    [meta.dailyLesson.level, meta.dailyLesson.topicOverride, weaknessProfile],
  )

  const completedAt = meta.dailyLesson.completedByDate[lesson.dateKey]
  const todayMistakes = useMemo(
    () => meta.mistakes.filter((item) => item.date === lesson.dateKey && item.sourceMode === '408'),
    [lesson.dateKey, meta.mistakes],
  )

  function updateTopic(topicOverride: string) {
    onUpdateMeta((previous) => ({
      ...previous,
      dailyLesson: {
        ...previous.dailyLesson,
        topicOverride,
      },
    }))
  }

  function updateLevel(level: DailyLessonLevel) {
    onUpdateMeta((previous) => ({
      ...previous,
      dailyLesson: {
        ...previous.dailyLesson,
        level,
      },
    }))
  }

  function markDone() {
    const now = Date.now()
    onUpdateMeta((previous) => ({
      ...previous,
      dailyLesson: {
        ...previous.dailyLesson,
        completedByDate: {
          ...previous.dailyLesson.completedByDate,
          [lesson.dateKey]: now,
        },
      },
    }))
    onStatus('今日小课已打卡')
  }

  const exportLesson = useCallback(async () => {
    const markdown = renderDailyLessonMarkdown(lesson, { completedAt, todayMistakes })
    const result = await exportMarkdownFile(`${lesson.dateKey}-408.md`, markdown)
    if (result.error) {
      onStatus(`导出失败：${result.error}`)
      return
    }
    onStatus(result.path ? `已导出：${result.path}` : '导出完成')
  }, [completedAt, lesson, onStatus, todayMistakes])

  return (
    <main className="lessonPage">
      <section className="lessonHero">
        <div>
          <div className="lessonTitle">408 每日小课</div>
          <div className="lessonSub">零基础渐进 + 自适应。先学懂，再做对。</div>
        </div>
        <div className="pill">
          {lesson.dateKey} · {lesson.level}
        </div>
      </section>

      <section className="lessonPanel">
        <div className="lessonPanelHeader">
          <div>
            <div className="panelTitle">今日主题（可配置）</div>
            <div className="panelSub">优先结合最近 7 天薄弱点推荐主题。</div>
          </div>
          <div className="lessonActionRow">
            <button className="btn" onClick={markDone}>
              {completedAt ? '再次打卡' : '完成打卡'}
            </button>
            <button className="btn primary" onClick={() => void exportLesson()}>
              导出 Markdown（Cmd/Ctrl+S）
            </button>
          </div>
        </div>

        <div className="filterGrid">
          <input
            value={meta.dailyLesson.topicOverride}
            placeholder="例如：数据库：B+Tree 索引"
            onChange={(event) => updateTopic(event.target.value)}
          />

          <select value={meta.dailyLesson.level} onChange={(event) => updateLevel(event.target.value as DailyLessonLevel)}>
            {LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
        </div>

        <div className="hint">当前主题：{lesson.topic}</div>
        <div className="hint">快捷键：Cmd/Ctrl+Enter 保存/打卡 · Cmd/Ctrl+S 导出</div>
        <div className="hint">{completedAt ? `今日已打卡：${formatCheckinTime(completedAt)}` : '今日未打卡'}</div>

        <div className="inline">
          <button
            className="btn"
            onClick={() =>
              onQuickAddMistake({
                topic: lesson.topic,
                prompt: `看不懂：${lesson.topic}`,
                errorType: 'concept',
                notes: '阅读小课时不理解定义或类比。',
              })
            }
          >
            看不懂
          </button>
          <button
            className="btn"
            onClick={() =>
              onQuickAddMistake({
                topic: lesson.topic,
                prompt: `做错了：${lesson.example.prompt}`,
                errorType: 'implementation',
                notes: '小算例推导或过程出错。',
              })
            }
          >
            做错了
          </button>
          <button
            className="btn"
            onClick={() =>
              onQuickAddMistake({
                topic: lesson.topic,
                prompt: `不确定：${lesson.cards[0]?.prompt ?? lesson.topic}`,
                errorType: 'unknown',
                notes: '记忆卡片无法稳定复述。',
              })
            }
          >
            不确定
          </button>
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">今日目标（3 条）</div>
        <ol className="plainList">
          {lesson.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ol>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">白话讲解（零基础）</div>
        <ol className="plainList">
          {lesson.plainTalk.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">记忆卡片（3-5 张）</div>
        <div className="lessonCardGrid">
          {lesson.cards.map((card, index) => (
            <article key={`${index}-${card.prompt}`} className="lessonCard">
              <div className="cardKicker">卡片 {index + 1}</div>
              <div className="cardTitle">{card.prompt}</div>
              <div className="cardBody">{card.answer}</div>
              <div className="hint">{card.memoryHook}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">小算例（逐步）</div>
        <div className="lessonExample">
          <div className="lessonExamplePrompt">题目：{lesson.example.prompt}</div>
          <ol className="plainList">
            {lesson.example.steps.map((step, index) => (
              <li key={`${index}-${step.title}`}>
                <strong>{step.title}：</strong>
                {step.detail}
              </li>
            ))}
          </ol>
          <div className="lessonExampleResult">结论：{lesson.example.result}</div>
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">5 分钟自测（含答案与解析）</div>
        {lesson.quizItems.map((item, index) => (
          <article key={`${index}-${item.question}`} className="lessonQuizItem">
            <div className="hint">问题 {index + 1}</div>
            <div>{item.question}</div>
            <div className="hint quizAnswerLabel">答案：{item.answer}</div>
            <div className="hint">解析：{item.explanation}</div>
          </article>
        ))}
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">针对薄弱点的 2 条微练习</div>
        <ol className="plainList">
          {lesson.microPractices.map((practice) => (
            <li key={practice}>{practice}</li>
          ))}
        </ol>
        <div className="label">最近 7 天薄弱画像</div>
        <div className="hint">
          Topic：{weaknessProfile.topTopics.length > 0 ? weaknessProfile.topTopics.join('、') : '暂无'}
        </div>
        <div className="hint">
          ErrorType：
          {weaknessProfile.topErrorTypes.length > 0
            ? weaknessProfile.topErrorTypes.map((type) => ERROR_TYPE_LABELS[type]).join('、')
            : '暂无'}
        </div>
      </section>
    </main>
  )
}
