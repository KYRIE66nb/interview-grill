import type { DailyLessonLevel, MistakeItem, MistakeErrorType } from '../types'

export type DailyLessonCard = {
  prompt: string
  answer: string
  memoryHook: string
}

export type DailyLessonExampleStep = {
  title: string
  detail: string
}

export type DailyLessonExample = {
  prompt: string
  steps: DailyLessonExampleStep[]
  result: string
}

export type DailyLessonQuizItem = {
  question: string
  answer: string
  explanation: string
}

export type WeaknessProfile = {
  topTopics: string[]
  topErrorTypes: MistakeErrorType[]
}

export type DailyLesson = {
  dateKey: string
  level: DailyLessonLevel
  topic: string
  goals: string[]
  plainTalk: string[]
  cards: DailyLessonCard[]
  example: DailyLessonExample
  actionablePoints: string[]
  quizItems: DailyLessonQuizItem[]
  microPractices: string[]
  tomorrowSuggestions: string[]
}

type LessonLevelTemplate = {
  goals: string[]
  definition: string
  analogy: string
  misconception: string
  cards: DailyLessonCard[]
  example: DailyLessonExample
  actionablePoints: string[]
  quizItems: DailyLessonQuizItem[]
}

type TopicLessonTemplate = {
  topic: string
  keywords: string[]
  levels: Record<DailyLessonLevel, LessonLevelTemplate>
}

const LESSON_BANK: TopicLessonTemplate[] = [
  {
    topic: '操作系统：时间片轮转调度（RR）',
    keywords: ['操作系统', '调度', 'rr', '时间片', '进程'],
    levels: {
      L0: {
        goals: ['知道 RR 是什么', '会画 3 个进程的轮转时间线', '能说出时间片太大/太小的后果'],
        definition: 'RR（时间片轮转）就是把 CPU 切成一小段一小段，按顺序轮流给每个进程。',
        analogy: '像食堂打饭，每人先打一勺再去队尾，大家都能先吃到。',
        misconception: '常见误解：RR 会让总耗时最短。其实 RR 更关注“响应快”，不是“总时间最短”。',
        cards: [
          {
            prompt: 'Q1：RR 的核心目标是什么？',
            answer: 'A：让每个进程都尽快获得 CPU，提升交互响应公平性。',
            memoryHook: '先保证人人有份，再谈整体最优。',
          },
          {
            prompt: 'Q2：时间片太小会怎样？',
            answer: 'A：切换过于频繁，上下文切换开销变大。',
            memoryHook: '切太碎，忙着“换人”而不是“干活”。',
          },
          {
            prompt: 'Q3：时间片太大会怎样？',
            answer: 'A：响应变慢，效果接近先来先服务。',
            memoryHook: '一人占太久，后面的人都在等。',
          },
        ],
        example: {
          prompt: 'A/B/C 同时到达，运行时间 3/5/4 ms，时间片 q=2 ms，求完成时刻。',
          steps: [
            { title: '第 1 轮', detail: '0-2 A，2-4 B，4-6 C。A 余 1，B 余 3，C 余 2。' },
            { title: '第 2 轮', detail: '6-7 A 完成，7-9 B，9-11 C 完成。' },
            { title: '收尾', detail: '11-12 B 完成，所以完成时刻 A=7，B=12，C=11。' },
          ],
          result: '只要按“排队 + 扣减剩余时间”逐步算，就不会乱。',
        },
        actionablePoints: [
          '先画时间轴，再写每轮剩余时间。',
          '每轮结束更新“还剩多少 ms”。',
          '最后统一读取完成时刻，别边算边跳步骤。',
          '口述时固定模板：目标 -> 机制 -> 取舍。',
        ],
        quizItems: [
          {
            question: '时间片无限大时，RR 退化成什么？',
            answer: '退化成 FCFS（先来先服务）。',
            explanation: '因为第一个进程会一直跑到结束，队列不再轮转。',
          },
          {
            question: 'RR 最优先优化的是吞吐还是响应？',
            answer: '响应。',
            explanation: 'RR 的设计初衷是交互体验，不是最小平均周转时间。',
          },
        ],
      },
      L1: {
        goals: ['会算平均周转时间', '会比较 RR 与 FCFS', '能解释切换开销'],
        definition: 'RR 在公平与效率之间做平衡，核心参数是时间片 q。',
        analogy: '会议轮流发言，每人限定 2 分钟，避免被一个人占满。',
        misconception: '常见误解：q 越小越公平越好。过小会明显降低吞吐。',
        cards: [
          {
            prompt: 'Q1：q 变小对响应和开销的影响？',
            answer: 'A：响应更快，但切换成本上升。',
            memoryHook: '响应和开销此消彼长。',
          },
          {
            prompt: 'Q2：何时 RR 明显优于 FCFS？',
            answer: 'A：交互任务多、短作业混杂时。',
            memoryHook: '用户在等反馈时，RR 更友好。',
          },
          {
            prompt: 'Q3：答调度题最稳顺序？',
            answer: 'A：时间轴 -> 完成时刻 -> 周转时间 -> 平均值。',
            memoryHook: '先过程，后结果。',
          },
        ],
        example: {
          prompt: 'A/B/C 到达时间 0/1/2，CPU 需求 5/3/4，q=2，求平均周转时间。',
          steps: [
            { title: '构建轮转队列', detail: '按到达时刻入队，每次最多执行 2ms。' },
            { title: '记录完成时刻', detail: '每个进程执行完立即记 finish。' },
            { title: '计算周转', detail: 'turnaround = finish - arrival，最后取平均。' },
          ],
          result: '调度题易错点是漏算到达时刻，务必单独列 arrival。',
        },
        actionablePoints: ['固定写出 arrival 和 burst 两列', '算周转前先检查 finish 是否都已记录', '比较算法时同时给响应与吞吐两项结论'],
        quizItems: [
          {
            question: 'RR 中上下文切换增多通常影响哪项指标？',
            answer: '吞吐率会下降。',
            explanation: '更多 CPU 时间花在切换而非执行有效任务。',
          },
          {
            question: '周转时间公式是什么？',
            answer: '完成时刻 - 到达时刻。',
            explanation: '注意不是开始执行时刻。',
          },
        ],
      },
      L2: {
        goals: ['会解释 RR 在多核与优先级中的限制', '会分析极端负载下表现', '会给调优策略'],
        definition: 'RR 常作为分时系统基础策略，工程上通常与优先级、多级反馈队列联合使用。',
        analogy: '主会场轮流发言，VIP 通道再叠加优先级规则。',
        misconception: '误解：RR 单独就能覆盖所有业务场景。',
        cards: [
          { prompt: 'Q1：RR 为什么常与 MLFQ 搭配？', answer: 'A：兼顾交互任务响应与长任务吞吐。', memoryHook: '单一 RR 不够“聪明”。' },
          { prompt: 'Q2：q 如何调优？', answer: 'A：参考平均 CPU burst 和可接受响应阈值。', memoryHook: '先有目标 SLA，再定 q。' },
          { prompt: 'Q3：RR 的短板？', answer: 'A：上下文切换成本和长任务完成延迟。', memoryHook: '公平提升，效率可能下降。' },
        ],
        example: {
          prompt: '高并发下 q 从 10ms 调到 4ms，响应提升但 CPU usage 飙升，怎么解释？',
          steps: [
            { title: '分析变化', detail: 'q 减少导致轮转频率提升。' },
            { title: '定位成本', detail: '上下文切换次数上涨，内核态开销增加。' },
            { title: '给出折中', detail: '在 4~8ms 做压测，找响应与吞吐平衡点。' },
          ],
          result: '调度参数必须配合压测数据，不可凭感觉。',
        },
        actionablePoints: ['回答里加一条“如何观测”（ctx switch/sched latency）', '说明调优是区间，不是唯一值', '给出回滚策略避免误调带来抖动'],
        quizItems: [
          {
            question: 'RR 调小 q 一定能提升整体性能吗？',
            answer: '不一定。',
            explanation: '响应可能提升，但切换开销会吃掉收益。',
          },
          {
            question: '工程中常看哪两个指标评估调度调优？',
            answer: '响应延迟 + 上下文切换/CPU 使用率。',
            explanation: '二者共同决定体验与成本。',
          },
        ],
      },
      L3: {
        goals: ['会用数据证明调度策略选型', '会从负载模型反推调参', '能回答异常场景追问'],
        definition: 'RR 是可解释性强的基线策略，专家级回答重点在“何时不用 RR”。',
        analogy: '排队系统里 RR 是基础规则，复杂场景要加预约和分流。',
        misconception: '误解：公平就等于用户体验最好。',
        cards: [
          { prompt: 'Q1：何时应该放弃纯 RR？', answer: 'A：实时任务或批处理极重场景。', memoryHook: '需求决定算法，不要反过来。' },
          { prompt: 'Q2：如何证明你的 q 合理？', answer: 'A：给出 latency 分位数与吞吐成本曲线。', memoryHook: '结论要有图或表支撑。' },
          { prompt: 'Q3：面试官追问“抖动”怎么答？', answer: 'A：谈上下文切换、缓存污染、NUMA 亲和。', memoryHook: '从 OS 开销链路拆解。' },
        ],
        example: {
          prompt: '某服务 p99 延迟抖动明显，你怀疑调度参数，如何实验验证？',
          steps: [
            { title: '设计 AB 实验', detail: '保持业务流量与机器规格一致，比较不同 q。' },
            { title: '采集指标', detail: '记录 p95/p99、ctx switch、CPU steal、run queue length。' },
            { title: '给出决策', detail: '以 SLA + 成本为目标，选最小可接受抖动方案。' },
          ],
          result: '高级回答要“实验方法 + 指标 + 决策标准”三件套。',
        },
        actionablePoints: ['准备一个调度调优真实案例', '每次答题都补“如何验证”', '练习 60 秒讲清 tradeoff 与回滚'],
        quizItems: [
          {
            question: '为什么只看平均延迟不足以评估调度效果？',
            answer: '因为尾延迟（p99）更能反映真实体验风险。',
            explanation: '平均值会掩盖极慢请求，线上故障常出在尾部。',
          },
          {
            question: '调度参数调整后第一步做什么？',
            answer: '先设监控与回滚阈值。',
            explanation: '避免新参数引发不可控抖动。',
          },
        ],
      },
    },
  },
  {
    topic: '计算机网络：TCP 三次握手与重传',
    keywords: ['网络', 'tcp', '握手', '重传', 'rto'],
    levels: {
      L0: {
        goals: ['记住三次握手三步', '知道为什么不是两次', '理解丢包后重传'],
        definition: 'TCP 三次握手是在正式传数据前，确认双方都“能发也能收”。',
        analogy: '像打电话：你在吗？我在，你听得到吗？听得到，开始说正事。',
        misconception: '常见误解：三次握手只是“形式流程”。本质是避免历史连接误判。',
        cards: [
          {
            prompt: 'Q1：第一次握手发什么？',
            answer: 'A：客户端发 SYN，请求建立连接。',
            memoryHook: '我想连你。',
          },
          {
            prompt: 'Q2：第二次握手发什么？',
            answer: 'A：服务端回 SYN+ACK，表示收到并同意。',
            memoryHook: '我收到了，也想连你。',
          },
          {
            prompt: 'Q3：第三次握手发什么？',
            answer: 'A：客户端回 ACK，双方进入已连接。',
            memoryHook: '确认完成，开始传数据。',
          },
        ],
        example: {
          prompt: 'SYN 丢失 1 次，RTO=80ms，RTT=40ms，多久建连成功？',
          steps: [
            { title: '第一次 SYN', detail: 't=0 发出但丢失。' },
            { title: '等待重传', detail: 't=80ms 超时重传 SYN。' },
            { title: '完成握手', detail: '再经历约 1 个 RTT（40ms）完成握手。' },
          ],
          result: '总时长约 120ms。',
        },
        actionablePoints: ['先背三步报文名', '解释“两次不行”时提到历史 SYN', '会口算一次简单重传耗时'],
        quizItems: [
          {
            question: 'TCP 为什么不是两次握手？',
            answer: '两次无法避免历史 SYN 导致误建立连接。',
            explanation: '第三次 ACK 用来确认双方都处于同一条新连接。',
          },
          {
            question: 'SYN 丢了后谁重传？',
            answer: '客户端重传 SYN。',
            explanation: '谁发送谁负责超时重传。',
          },
        ],
      },
      L1: {
        goals: ['会解释序列号意义', '会讲半连接队列', '能回答第三次 ACK 丢失'],
        definition: '三次握手还承担初始序列号同步，保障后续可靠传输。',
        analogy: '像双方先对齐对话编号，防止旧消息混进新会话。',
        misconception: '误解：握手完就绝对可靠。可靠还依赖后续确认与重传。',
        cards: [
          { prompt: 'Q1：握手阶段同步什么关键信息？', answer: 'A：双方初始序列号与连接状态。', memoryHook: '先对齐编号再通信。' },
          { prompt: 'Q2：第三次 ACK 丢了会怎样？', answer: 'A：服务端会重发 SYN+ACK，客户端再回 ACK。', memoryHook: '服务端没收到确认就不会放心。' },
          { prompt: 'Q3：半连接队列风险是什么？', answer: 'A：可能被 SYN Flood 占满。', memoryHook: '队列满了真用户进不来。' },
        ],
        example: {
          prompt: '服务端收到 SYN 后迟迟收不到第三次 ACK，会发生什么？',
          steps: [
            { title: '停留半连接', detail: '连接处于 SYN_RECV，等待 ACK。' },
            { title: '触发重发', detail: '服务端按策略重发 SYN+ACK。' },
            { title: '超时释放', detail: '超过重试阈值后释放半连接资源。' },
          ],
          result: '这也是 SYN 攻击会耗尽资源的原因。',
        },
        actionablePoints: ['答题带上状态名（SYN_SENT/SYN_RECV/ESTABLISHED）', '讲一次 SYN Flood 防护（SYN cookie/队列调优）', '重传问题先说 RTO，再说 RTT 估计'],
        quizItems: [
          {
            question: '半连接状态是哪个？',
            answer: '服务端通常处于 SYN_RECV。',
            explanation: '表示已收到 SYN，但未确认三次握手完成。',
          },
          {
            question: 'RTO 主要依据什么估计？',
            answer: 'RTT 的动态测量结果。',
            explanation: '网络波动越大，RTO 会更保守。',
          },
        ],
      },
      L2: {
        goals: ['会讲 TCP 建连参数调优', '理解重传退避', '会从抓包定位建连异常'],
        definition: '中级重点是把握手、重传、队列容量与线上故障联系起来。',
        analogy: '门口安检：通道数、排队长度、超时规则一起决定通行效率。',
        misconception: '误解：调大 backlog 就能解决所有建连问题。',
        cards: [
          { prompt: 'Q1：重传为什么指数退避？', answer: 'A：避免拥塞时继续放大网络压力。', memoryHook: '越堵越慢发。' },
          { prompt: 'Q2：建连慢先看什么？', answer: 'A：抓包看 SYN/SYN+ACK/ACK 时序和丢包点。', memoryHook: '先证据后结论。' },
          { prompt: 'Q3：backlog 调优原则？', answer: 'A：结合并发峰值和超时参数联合评估。', memoryHook: '容量与等待时间成对看。' },
        ],
        example: {
          prompt: '线上偶发建连超时，抓包显示 SYN+ACK 重发 3 次，如何定位？',
          steps: [
            { title: '确认方向', detail: '先判断 ACK 丢失在客户端出口还是服务端入口。' },
            { title: '查容量', detail: '核对半连接队列、syn backlog、系统丢包统计。' },
            { title: '给措施', detail: '优化网络链路并调整超时/队列参数，配合监控告警。' },
          ],
          result: '网络与内核参数要同时看，不能只盯应用层。',
        },
        actionablePoints: ['准备 1 个抓包定位案例', '背 2 个常用内核参数（tcp_max_syn_backlog 等）', '答题结尾给监控项：握手时延/重传率/半连接占用'],
        quizItems: [
          {
            question: '为什么重传间隔通常会拉长？',
            answer: '为了避免拥塞时造成更大拥堵。',
            explanation: '这就是指数退避思想。',
          },
          {
            question: '只看应用日志能定位握手问题吗？',
            answer: '通常不够。',
            explanation: '握手异常常在内核和网络链路层。',
          },
        ],
      },
      L3: {
        goals: ['会做建连性能容量规划', '能讲清抗攻击策略 tradeoff', '能从 SLO 角度回答'],
        definition: '高级回答强调容量模型、SLO 和安全策略之间的平衡。',
        analogy: '机场入境系统：效率、准确、安全三者不能只顾一个。',
        misconception: '误解：防攻击策略越严越好。过严会牺牲正常请求成功率。',
        cards: [
          { prompt: 'Q1：SYN cookie 的代价？', answer: 'A：在某些场景会影响扩展能力与性能。', memoryHook: '抗攻击有成本。' },
          { prompt: 'Q2：如何估算建连容量？', answer: 'A：并发连接峰值 × 平均握手时延 × 安全冗余。', memoryHook: '容量规划要留余量。' },
          { prompt: 'Q3：面试追问怎么给结论？', answer: 'A：先给风险分级，再给分层治理方案。', memoryHook: '先定级，再动作。' },
        ],
        example: {
          prompt: '大促前如何验证建连链路可承载 3 倍流量峰值？',
          steps: [
            { title: '制定压测场景', detail: '模拟真实连接建立节奏与突发峰值。' },
            { title: '观测关键指标', detail: '建连成功率、握手时延分位数、SYN 队列占用。' },
            { title: '设定门槛', detail: '低于 SLO 阈值立即回滚并扩容。' },
          ],
          result: '能力验证要有门槛、有回滚，不是“压一压看没挂就行”。',
        },
        actionablePoints: ['准备容量估算公式模板', '答题时明确 SLO 门槛', '补一条异常演练与回滚策略'],
        quizItems: [
          {
            question: '握手容量规划为什么要看分位时延？',
            answer: '因为尾部延迟决定高峰失败风险。',
            explanation: '平均值可能掩盖高峰抖动。',
          },
          {
            question: '防御 SYN 攻击时只开 SYN cookie 足够吗？',
            answer: '不够，通常要结合限流与监控策略。',
            explanation: '单一策略难覆盖全部攻击形态。',
          },
        ],
      },
    },
  },
  {
    topic: '数据库：B+Tree 索引与回表',
    keywords: ['数据库', 'mysql', '索引', '回表', 'b+tree'],
    levels: {
      L0: {
        goals: ['理解索引像目录', '知道什么是回表', '会识别覆盖索引'],
        definition: 'B+Tree 索引像书的目录，先定位位置，再找到具体内容。',
        analogy: '先看目录页找到章节，再翻正文；如果目录里就有答案，就不用翻正文。',
        misconception: '常见误解：有索引就一定快。索引命中后大量回表也会慢。',
        cards: [
          { prompt: 'Q1：什么叫回表？', answer: 'A：二级索引找到了主键后，再去主键索引拿完整列。', memoryHook: '目录找页码，再翻正文。' },
          { prompt: 'Q2：什么是覆盖索引？', answer: 'A：查询需要的列都在索引里，不用回表。', memoryHook: '目录里就有答案。' },
          { prompt: 'Q3：回表多会怎样？', answer: 'A：随机 IO 增多，查询变慢。', memoryHook: '翻页太多就慢。' },
        ],
        example: {
          prompt: '过滤后命中 1000 条记录，若每条都要回表取字段，回表约多少次？',
          steps: [
            { title: '先看候选行数', detail: '二级索引先筛出 1000 条。' },
            { title: '逐条回主键索引', detail: '每条候选都要再访问一次聚簇索引。' },
            { title: '得出次数', detail: '回表次数约等于 1000。' },
          ],
          result: '覆盖索引的价值就是尽量减少这一步。',
        },
        actionablePoints: ['看慢 SQL 先判断是否回表过多', '尽量让高频查询命中覆盖索引', 'EXPLAIN 时重点看 rows 与 extra'],
        quizItems: [
          {
            question: '覆盖索引为什么通常更快？',
            answer: '因为减少一次回表访问。',
            explanation: '少一次随机 IO 往往就是主要收益。',
          },
          {
            question: '“有索引仍慢”常见原因之一？',
            answer: '索引命中后回表过多。',
            explanation: '特别是低选择性条件。',
          },
        ],
      },
      L1: {
        goals: ['会分析索引选择性', '会判断最左前缀是否命中', '会给简单优化方案'],
        definition: '索引优化不仅是“建索引”，更是“让查询计划正确利用索引”。',
        analogy: '目录做得再好，翻书顺序错了也找不快。',
        misconception: '误解：联合索引字段越多越好。字段过多会增加维护成本。',
        cards: [
          { prompt: 'Q1：联合索引命中规则？', answer: 'A：遵循最左前缀。', memoryHook: '从左往右，断了就难用。' },
          { prompt: 'Q2：选择性差会怎样？', answer: 'A：扫描行数仍多，优化收益有限。', memoryHook: '过滤不掉就快不起来。' },
          { prompt: 'Q3：优化顺序建议？', answer: 'A：先看 SQL 再看索引，再看回表。', memoryHook: '先诊断再动刀。' },
        ],
        example: {
          prompt: 'where a=? and c=?，索引是 (a,b,c)，为什么可能没完全利用？',
          steps: [
            { title: '命中 a', detail: '最左列 a 可用。' },
            { title: '跳过 b', detail: 'b 缺失会影响 c 的继续利用。' },
            { title: '结果', detail: '可能只部分命中索引。' },
          ],
          result: '联合索引要匹配查询条件顺序。',
        },
        actionablePoints: ['回答慢 SQL 时给出 EXPLAIN before/after', '习惯记录 rows 变化量', '优化后复查写入成本是否上升'],
        quizItems: [
          {
            question: '联合索引 (a,b,c) 下 where b=? 能高效命中吗？',
            answer: '通常不能。',
            explanation: '缺少最左列 a。',
          },
          {
            question: '优化索引后第一步验证什么？',
            answer: '执行计划是否按预期改变。',
            explanation: '先确认真命中，再谈性能收益。',
          },
        ],
      },
      L2: {
        goals: ['能从执行计划拆解瓶颈', '能做索引-写放大权衡', '能讲索引失效场景'],
        definition: '中级重点是“读性能收益”和“写入维护成本”平衡。',
        analogy: '给城市加道路会提速，但道路维护也有成本。',
        misconception: '误解：每个查询都建专属索引最优。',
        cards: [
          { prompt: 'Q1：索引越多越好吗？', answer: 'A：不是，写入和存储成本会上升。', memoryHook: '读快写慢要平衡。' },
          { prompt: 'Q2：什么叫索引失效？', answer: 'A：查询条件写法导致优化器放弃索引。', memoryHook: '索引在那但没被用上。' },
          { prompt: 'Q3：如何说明优化有效？', answer: 'A：给出 rows/latency/QPS 前后对比。', memoryHook: '优化要可量化。' },
        ],
        example: {
          prompt: '一个查询从 600ms 降到 80ms，你需要给出哪些证据？',
          steps: [
            { title: '执行计划变化', detail: 'type/key/rows/extra 对比。' },
            { title: '性能指标变化', detail: '平均与 p95 延迟、QPS。' },
            { title: '副作用检查', detail: '写入延迟、磁盘增长。' },
          ],
          result: '只给“变快了”不够，要有完整证据链。',
        },
        actionablePoints: ['面试回答里补“副作用评估”', '记录是否增加写放大', '准备 1 个索引失效修复案例'],
        quizItems: [
          {
            question: '为什么索引优化要看写入指标？',
            answer: '因为索引会增加写入维护成本。',
            explanation: '读写都要平衡。',
          },
          {
            question: '“优化有效”至少给几类证据？',
            answer: '执行计划 + 性能指标 + 副作用检查。',
            explanation: '三者缺一不可。',
          },
        ],
      },
      L3: {
        goals: ['能设计索引治理策略', '会从业务增长预测索引演进', '会讲分库分表前后索引策略'],
        definition: '高级阶段关注长期可维护性与演进策略，而非单条 SQL 修补。',
        analogy: '不是修一条路，而是规划整座城市路网。',
        misconception: '误解：一次索引优化能长期稳定。业务变化会让最优策略改变。',
        cards: [
          { prompt: 'Q1：索引治理核心是什么？', answer: 'A：周期评估冷热查询并淘汰低价值索引。', memoryHook: '索引也要“生命周期管理”。' },
          { prompt: 'Q2：何时考虑重建/重排索引？', answer: 'A：数据分布变化导致选择性恶化时。', memoryHook: '业务变了，索引也要变。' },
          { prompt: 'Q3：面试追问“扩展性”如何答？', answer: 'A：谈容量预测、分层缓存、分区/分片协同。', memoryHook: '短期优化 + 长期演进。' },
        ],
        example: {
          prompt: '日活翻 5 倍后查询退化，你如何做索引治理计划？',
          steps: [
            { title: '分层盘点', detail: '按查询频率、收益、写成本给索引分级。' },
            { title: '灰度验证', detail: '先对核心查询灰度，观察指标波动。' },
            { title: '建立制度', detail: '纳入发布流程，新增索引需附收益证明。' },
          ],
          result: '高级答案要体现机制化，而不是临时救火。',
        },
        actionablePoints: ['准备索引治理 checklist', '回答中加入“灰度 + 回滚”', '能说清短期止血与长期治理区别'],
        quizItems: [
          {
            question: '为什么索引策略要跟业务增长一起评估？',
            answer: '数据分布变化会改变索引收益。',
            explanation: '旧策略可能不再最优。',
          },
          {
            question: '高级索引优化的标志是什么？',
            answer: '有机制、有指标、有回滚。',
            explanation: '不仅能修问题，还能持续防问题。',
          },
        ],
      },
    },
  },
]

const WEEKDAY_FALLBACK_TOPICS = LESSON_BANK.map((item) => item.topic)

function shanghaiDateParts(date: Date): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return { year, month, day }
}

function shanghaiWeekdayIndex(date: Date): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
  }).format(date)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[weekday] ?? 1
}

export function toDateKey(date: Date = new Date()): string {
  const { year, month, day } = shanghaiDateParts(date)
  return `${year}-${month}-${day}`
}

export function formatShanghaiDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function findTopicByText(text: string): TopicLessonTemplate | null {
  const query = text.trim().toLowerCase()
  if (!query) return null
  return (
    LESSON_BANK.find((item) => item.topic.toLowerCase().includes(query) || item.keywords.some((keyword) => query.includes(keyword))) ??
    null
  )
}

function pickTopic(options: {
  date: Date
  topicOverride: string
  weaknessProfile?: WeaknessProfile
}): { template: TopicLessonTemplate; topicLabel: string } {
  const customText = options.topicOverride.trim()
  const custom = findTopicByText(customText)
  if (custom) {
    return {
      template: custom,
      topicLabel: customText || custom.topic,
    }
  }
  if (customText) {
    return {
      template: LESSON_BANK[0],
      topicLabel: customText,
    }
  }

  const weakTopic = options.weaknessProfile?.topTopics.find((topic) => findTopicByText(topic))
  if (weakTopic) {
    const template = findTopicByText(weakTopic) ?? LESSON_BANK[0]
    return {
      template,
      topicLabel: template.topic,
    }
  }

  const fallbackTopic = WEEKDAY_FALLBACK_TOPICS[shanghaiWeekdayIndex(options.date) % WEEKDAY_FALLBACK_TOPICS.length]
  const template = findTopicByText(fallbackTopic) ?? LESSON_BANK[0]
  return {
    template,
    topicLabel: template.topic,
  }
}

function buildMicroPractices(weaknessProfile?: WeaknessProfile): string[] {
  if (!weaknessProfile || weaknessProfile.topErrorTypes.length === 0) {
    return ['用 2 分钟口述今天卡片 1 的结论与理由。', '手算一遍小算例，不看答案复述每一步。']
  }

  const practices: string[] = []
  const topType = weaknessProfile.topErrorTypes[0]
  if (topType === 'concept') {
    practices.push('把“定义 + 反例”各说 1 句，确认概念边界。')
  } else if (topType === 'boundary') {
    practices.push('针对今天知识点列 3 个边界输入（最小、最大、空值）。')
  } else if (topType === 'complexity') {
    practices.push('口头说明今天算例的时间复杂度与空间复杂度。')
  } else if (topType === 'implementation') {
    practices.push('写 5 行伪代码，只保留关键步骤和判断条件。')
  } else if (topType === 'expression') {
    practices.push('用 30 秒复述“结论 -> 原因 -> 例子”的表达模板。')
  } else if (topType === 'careless') {
    practices.push('做题前先写一条检查清单：输入范围、初始化、返回值。')
  } else {
    practices.push('挑 1 道最简单子题，先口述思路再动手。')
  }

  const secondType = weaknessProfile.topErrorTypes[1]
  if (secondType && secondType !== topType) {
    practices.push(`针对「${secondType}」再补一条 3 分钟微练习，并写 1 句复盘。`)
  }

  if (practices.length < 2) {
    practices.push('把今天最容易错的步骤抄成 1 张速记卡。')
  }

  return practices.slice(0, 2)
}

function buildTomorrowSuggestions(template: LessonLevelTemplate, weaknessProfile?: WeaknessProfile): string[] {
  const suggestions = [...template.actionablePoints.slice(0, 2)]
  if (weaknessProfile?.topTopics?.length) {
    suggestions.push(`优先复习薄弱主题：${weaknessProfile.topTopics.slice(0, 2).join('、')}。`)
  } else {
    suggestions.push('明天先复述 3 张卡片，再开始新题目。')
  }
  return suggestions.slice(0, 3)
}

export function buildDailyLesson(options?: {
  date?: Date
  topicOverride?: string
  level?: DailyLessonLevel
  weaknessProfile?: WeaknessProfile
}): DailyLesson {
  const date = options?.date ?? new Date()
  const level = options?.level ?? 'L0'
  const picked = pickTopic({
    date,
    topicOverride: options?.topicOverride ?? '',
    weaknessProfile: options?.weaknessProfile,
  })
  const template = picked.template.levels[level]

  const plainTalk = [template.definition, `生活类比：${template.analogy}`, template.misconception]

  return {
    dateKey: toDateKey(date),
    level,
    topic: picked.topicLabel,
    goals: template.goals.slice(0, 3),
    plainTalk,
    cards: template.cards.slice(0, 5).map((item) => ({ ...item })),
    example: {
      prompt: template.example.prompt,
      steps: template.example.steps.map((step) => ({ ...step })),
      result: template.example.result,
    },
    actionablePoints: template.actionablePoints.slice(0, 5),
    quizItems: template.quizItems.slice(0, 3).map((item) => ({ ...item })),
    microPractices: buildMicroPractices(options?.weaknessProfile),
    tomorrowSuggestions: buildTomorrowSuggestions(template, options?.weaknessProfile),
  }
}

function formatMistakeLine(item: MistakeItem): string {
  const pieces = [`${item.topic || '未分类'}`]
  if (item.prompt.trim()) pieces.push(item.prompt.trim())
  return `- ${pieces.join('：')}（${item.errorType}，严重度 ${item.severity}）`
}

export function renderDailyLessonMarkdown(
  lesson: DailyLesson,
  options?: { completedAt?: number; todayMistakes?: MistakeItem[] },
): string {
  const lines: string[] = []

  lines.push(`# 408 每日小课 ${lesson.dateKey}（Level ${lesson.level}）`)
  lines.push('')
  lines.push('## 今日目标（3 条）')
  lesson.goals.slice(0, 3).forEach((goal, index) => {
    lines.push(`${index + 1}. ${goal}`)
  })
  lines.push('')
  lines.push('## 白话讲解（零基础）')
  lesson.plainTalk.forEach((line) => {
    lines.push(`- ${line}`)
  })
  lines.push('')
  lines.push('## 记忆卡片（3-5 张）')
  lesson.cards.slice(0, 5).forEach((card, index) => {
    lines.push(`### 卡片 ${index + 1}`)
    lines.push(`- 提问：${card.prompt}`)
    lines.push(`- 回答：${card.answer}`)
    lines.push(`- 记忆钩子：${card.memoryHook}`)
    lines.push('')
  })

  lines.push('## 小算例（逐步）')
  lines.push(`题目：${lesson.example.prompt}`)
  lesson.example.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.title}：${step.detail}`)
  })
  lines.push(`结论：${lesson.example.result}`)
  lines.push('')

  lines.push('## 5 分钟自测（含答案与解析）')
  lesson.quizItems.forEach((item, index) => {
    lines.push(`${index + 1}. 题目：${item.question}`)
    lines.push(`   - 答案：${item.answer}`)
    lines.push(`   - 解析：${item.explanation}`)
  })
  lines.push('')

  lines.push('## 我今天的薄弱点（自动列当天记录）')
  const todayMistakes = options?.todayMistakes ?? []
  if (todayMistakes.length === 0) {
    lines.push('- 今日未记录新的薄弱点。')
  } else {
    todayMistakes.slice(0, 8).forEach((item) => {
      lines.push(formatMistakeLine(item))
    })
  }
  if (typeof options?.completedAt === 'number') {
    lines.push(`- 打卡时间：${formatShanghaiDateTime(options.completedAt)}`)
  }
  lines.push('')

  lines.push('## 明日建议（系统生成）')
  lesson.tomorrowSuggestions.forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`)
  })
  lines.push('')
  lines.push('### 针对薄弱点的 2 条微练习')
  lesson.microPractices.slice(0, 2).forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`)
  })

  return lines.join('\n')
}
