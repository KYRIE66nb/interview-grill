#!/bin/sh
set -eu

RUN_ID="run_interview_grill_demo_002"
RUN_TITLE_ZH="Interview Grill：Team 可视化流水线演示"
OUT="runs/${RUN_ID}.jsonl"

node scripts/atv-log.mjs --out "$OUT" --run-id "$RUN_ID" --run-title-zh "$RUN_TITLE_ZH" --type message --stage planning --from-id lead --from-name Lead --from-role lead --content-zh "开始演示：这是一段会被 ATV 回放的事件流。" --meta-leader-plan leader_plan.md --meta-task-breakdown-zh task_breakdown_zh.md

node scripts/atv-log.mjs --out "$OUT" --run-id "$RUN_ID" --run-title-zh "$RUN_TITLE_ZH" --type agent_status --stage planning --from-id planner --from-name Planner --from-role planner --status-state running --status-label-zh "生成题库 taxonomy + 种子题" --status-details-zh "离线优先，Git 友好。"

node scripts/atv-log.mjs --out "$OUT" --run-id "$RUN_ID" --run-title-zh "$RUN_TITLE_ZH" --type artifact --stage planning --from-id planner --from-name Planner --from-role planner --summary-zh "题库：已定义 tags 与 Markdown+front matter 规范，并提供中文种子题。"

node scripts/atv-log.mjs --out "$OUT" --run-id "$RUN_ID" --run-title-zh "$RUN_TITLE_ZH" --type agent_status --stage build --from-id builder --from-name Builder --from-role builder --status-state running --status-label-zh "搭 Electron 框架" --status-details-zh "解决打包 file:// 资源路径问题，避免黑屏。"

node scripts/atv-log.mjs --out "$OUT" --run-id "$RUN_ID" --run-title-zh "$RUN_TITLE_ZH" --type agent_status --stage build --from-id builder --from-name Builder --from-role builder --status-state done --status-label-zh "桌面骨架完成" --status-details-zh "三栏 UI + 本地历史占位。"

node scripts/atv-log.mjs --out "$OUT" --run-id "$RUN_ID" --run-title-zh "$RUN_TITLE_ZH" --type artifact --stage build --from-id builder --from-name Builder --from-role builder --summary-zh "桌面端可运行：Setup/Session/Review 页面占位，后续接入问答引擎。"

node scripts/atv-log.mjs --out "$OUT" --run-id "$RUN_ID" --run-title-zh "$RUN_TITLE_ZH" --type agent_status --stage verify --from-id reviewer --from-name Reviewer --from-role reviewer --status-state done --status-label-zh "评分与复盘就绪" --status-details-zh "Rubric + 复盘模板 + 离线防脑补护栏。"

node scripts/atv-log.mjs --out "$OUT" --run-id "$RUN_ID" --run-title-zh "$RUN_TITLE_ZH" --type artifact --stage verify --from-id lead --from-name Lead --from-role lead --summary-zh "MVP 形成闭环：离线题库->问答->评分->复盘回放；在线模式作为可选增强。"

echo "Wrote ${OUT}"
