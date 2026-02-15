# leader_plan (中文)

目标：做一款桌面端 Interview Grill，能把简历/项目/代码库转成高强度面试训练；默认离线；可选在线 LLM（用户自带 key、显式开启）。

交付物（MVP）：
- 桌面端基础壳（Setup/Session/Review 三页）
- 本地数据流：简历导入（文本+PDF）+ repo 扫描 + 题目生成 + 会话状态机 + 评分 + 报告落盘
- 三种模式：连续拷打 / 单题练习 / 完整模拟
- 三档强度：温柔 / 正常 / 地狱（影响提示、追问深度、节奏）
- 产出：中文总结 + 评分量表 + 可回放 ReviewReport（时间线）
- 隐私：默认 0 网络；在线模式必须显式开关 + key；默认不上传 repo

里程碑：
- M1（可用闭环）：离线模式跑通一场 mock interview，生成并回放 report
- M2（可个性化）：题目能结合简历项目 + repo 指纹进行项目追问，且能按薄弱标签复训
- M3（可扩展）：题库模板化、schema 固化、在线 LLM 适配器（可插拔）

关键决策：
- 数据以 JSON 为主（Question/Followup/Score/ReviewReport），先稳定 schema 再做花活
- 先用模板+规则实现“可用”拷打；LLM 只做增强（且默认关闭）
- 全链路可审计：每轮问答都能在 report 中复现

风险与对策：
- PDF 解析质量参差：MVP 允许 best-effort，提供用户手动校正
- 评分主观：先用统一 rubric + 明确 rationale_zh；后续再引入更复杂评估
- 在线模式隐私：红线是默认离线；在线必须显式、可见、可撤销
