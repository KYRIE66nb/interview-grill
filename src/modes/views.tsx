import type { ModeRuntimeState } from './types'

export function InterviewEntryView({ renderers }: ModeRuntimeState) {
  return <>{renderers.interviewEntry()}</>
}

export function InterviewMainView({ renderers }: ModeRuntimeState) {
  return <>{renderers.interviewMain()}</>
}

export function LuoguEntryView({ renderers }: ModeRuntimeState) {
  return <>{renderers.luoguEntry()}</>
}

export function LuoguMainView({ renderers }: ModeRuntimeState) {
  return <>{renderers.luoguMain()}</>
}

export function LanqiaoEntryView({ renderers }: ModeRuntimeState) {
  return <>{renderers.lanqiaoEntry()}</>
}

export function LanqiaoMainView({ renderers }: ModeRuntimeState) {
  return <>{renderers.lanqiaoMain()}</>
}
