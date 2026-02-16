import type { ReminderId, StorageMeta } from '../types'

type ReminderSettingsPageProps = {
  meta: StorageMeta
  onUpdateMeta: (updater: (meta: StorageMeta) => StorageMeta) => void
  onSyncReminders: (meta: Pick<StorageMeta, 'reminders'>) => Promise<void>
}

const REMINDER_ORDER: ReminderId[] = ['lesson408', 'luogu', 'lanqiao']

export function ReminderSettingsPage({ meta, onUpdateMeta, onSyncReminders }: ReminderSettingsPageProps) {
  async function applyAndSync(updater: (meta: StorageMeta) => StorageMeta) {
    const nextMeta = updater(meta)
    onUpdateMeta(() => nextMeta)
    await onSyncReminders({ reminders: nextMeta.reminders })
  }

  return (
    <main className="insightPage">
      <section className="insightHero">
        <div>
          <div className="lessonTitle">提醒设置</div>
          <div className="lessonSub">配置 3 条每日提醒，重启后仍生效，点击通知可跳转对应页面。</div>
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">每日提醒</div>
        <div className="taskList">
          {REMINDER_ORDER.map((id) => {
            const item = meta.reminders[id]
            return (
              <article key={id} className="taskCard">
                <div className="taskHeader">
                  <div className="taskTitle">{item.title}</div>
                  <label className="taskCheck">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) => {
                        void applyAndSync((prev) => ({
                          ...prev,
                          reminders: {
                            ...prev.reminders,
                            [id]: {
                              ...prev.reminders[id],
                              enabled: event.target.checked,
                            },
                          },
                        }))
                      }}
                    />
                    <span>{item.enabled ? '开启' : '关闭'}</span>
                  </label>
                </div>

                <div className="inline">
                  <span className="label">提醒时间（HH:MM）</span>
                  <input
                    type="time"
                    value={item.time}
                    onChange={(event) => {
                      void applyAndSync((prev) => ({
                        ...prev,
                        reminders: {
                          ...prev.reminders,
                          [id]: {
                            ...prev.reminders[id],
                            time: event.target.value,
                          },
                        },
                      }))
                    }}
                  />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="lessonPanel">
        <div className="panelTitle">启动行为</div>
        <label className="taskCheck">
          <input
            type="checkbox"
            checked={meta.appSettings.autoJumpTodayTask}
            onChange={(event) => {
              void applyAndSync((prev) => ({
                ...prev,
                appSettings: {
                  ...prev.appSettings,
                  autoJumpTodayTask: event.target.checked,
                },
              }))
            }}
          />
          <span>启用自动跳转“今日最优先任务”（默认开启）</span>
        </label>
        <div className="hint">
          规则：有到期复习则去复习页；否则 408 未完成则去 408；否则洛谷未完成则去洛谷；否则蓝桥未完成则去蓝桥；全部完成则去 Dashboard。
        </div>
      </section>
    </main>
  )
}
