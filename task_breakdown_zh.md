# task_breakdown_zh (中文)

1) 需求与数据契约
- 产出：`SPEC.md`、`docs/question-schema.md`
- 验收：schema 能覆盖 Question/Followup/Score/ReviewReport；支持三模式三强度

2) 本地存储与目录
- 产出：`core/storage`（profiles/sessions/reports）
- 验收：可创建 session；report.json 可落盘；可加载历史 report 回放

3) 简历导入
- 产出：文本粘贴解析；PDF 文本提取（best-effort）
- 验收：能抽取项目名/时间/技术栈关键词；允许用户编辑修正

4) Repo 扫描（指纹）
- 产出：根据文件签名识别 Java/前端/算法相关；抽取依赖摘要
- 验收：给出 `RepoProfile`：语言/框架/关键目录/候选模块

5) 题库与模板系统
- 产出：本地题库 JSON（按 category/tags/difficulty）；模板填充器
- 验收：可用 resume+repo 参数生成项目深挖问题；followups 可触发

6) 会话引擎（状态机）
- 产出：mode/intensity 驱动的问答流程；计时；追问深度控制
- 验收：连续模式不停问；单题模式可选题；mock 模式按轮次推进

7) 评分引擎（rubric）
- 产出：维度评分 + overall；rationale_zh + improvements_zh
- 验收：每题必出 score；类别聚合 scorecard 能生成

8) Review 报告与回放
- 产出：`ReviewReport` 生成；回放 UI（时间线 + 跳转 + 展示评分）
- 验收：能完整复现 session；支持“重做薄弱项”入口

9) 在线 LLM（可选增强，默认关闭）
- 产出：Provider-agnostic `LLMClient`；显式开关；脱敏/最小上传策略
- 验收：不开启时 0 网络；开启后有明显提示；无 key 不可用

10) 工程化
- 产出：基础日志、崩溃保护、打包脚本
- 验收：macOS 开发可跑；能生成可安装包（后续 CI）
