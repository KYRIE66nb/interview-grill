import type { ComponentType, ReactNode } from 'react'
import type { Mode, Session, StorageMeta } from '../types'

export type ModeId = Mode

export type ModeRuntimeState = {
  session: Session
  meta: StorageMeta
  renderers: {
    interviewEntry: () => ReactNode
    interviewMain: () => ReactNode
    luoguEntry: () => ReactNode
    luoguMain: () => ReactNode
    lanqiaoEntry: () => ReactNode
    lanqiaoMain: () => ReactNode
  }
  exporters: {
    interview: () => Promise<void>
    luogu: () => Promise<void>
    lanqiao: () => Promise<void>
  }
}

export type ModeDefinition = {
  id: ModeId
  title: string
  shortDesc: string
  icon?: string
  layout: 'interview' | 'daily'
  entryComponent: ComponentType<ModeRuntimeState>
  mainComponent: ComponentType<ModeRuntimeState>
  exportHandler: (runtime: ModeRuntimeState) => Promise<void>
  defaultHotkeys?: string[]
}
