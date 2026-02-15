# Seed Question Bank (ZH)

MVP 种子题库（约 25 题）。后续会按“一题一文件”拆分。

---

## q-java-string
- tags: java/basics, java/collections
- difficulty: L1

Prompt:
- `String` 为什么是不可变的？这样设计的收益和代价？

Followups:
- `StringBuilder` vs `StringBuffer` 区别？
- `"a" + "b"` 编译期和运行期分别怎样？

Checkpoints:
- 不可变：线程安全、缓存 hash、常量池复用
- 代价：频繁拼接产生临时对象

---

## q-java-equals-hashcode
- tags: java/collections, java/oop
- difficulty: L2

Prompt:
- 解释 `equals` / `hashCode` 合同；违反会造成什么问题？

Followups:
- 为什么 HashMap 里 key 必须“不可变”（或至少 hash 不变）？

Checkpoints:
- equals 相等 -> hashCode 必须相等
- 违反导致：查不到、重复 key、性能退化

---

## q-java-generics-erasure
- tags: java/generics, jvm/classloading
- difficulty: L2

Prompt:
- Java 泛型类型擦除是什么？带来哪些限制？

Followups:
- 为什么不能 `new T()`？为什么不能 `List<String>[]`？

Checkpoints:
- 编译期泛型，运行期擦除到上界/Object
- 运行期拿不到真实类型参数（除非 TypeToken 等）

---

## q-spring-ioc-lifecycle
- tags: backend/spring-core, backend/spring-boot
- difficulty: L2

Prompt:
- Spring Bean 生命周期关键阶段；常见扩展点有哪些？

Followups:
- `@PostConstruct` 和 `InitializingBean` 区别？

Checkpoints:
- 实例化->注入->BPP 前后->init->destroy
- 扩展点：BFPP/BPP 等

---

## q-spring-aop-proxy
- tags: backend/spring-core
- difficulty: L2

Prompt:
- Spring AOP 怎么实现？JDK Proxy vs CGLIB 何时用？

Followups:
- 为什么同类内部调用可能不走 AOP？怎么解决？

Checkpoints:
- 基于代理；接口/JDK，类/CGLIB
- self-invocation 绕过代理

---

## q-rest-idempotency
- tags: backend/rest, backend/idempotency, sys/retries-timeouts
- difficulty: L3

Prompt:
- 你如何为“创建订单”接口设计幂等？

Followups:
- 幂等 key 存哪？过期策略？

Checkpoints:
- 业务唯一键/幂等键 + 结果表/唯一索引
- 并发与重放返回一致结果

---

## q-mysql-index-btree
- tags: db/mysql-indexing, db/index
- difficulty: L2

Prompt:
- InnoDB B+Tree 为什么适合范围查询？

Followups:
- 覆盖索引/回表是什么？

Checkpoints:
- 叶子有序链表，范围扫描高效
- 二级索引回表

---

## q-mysql-transaction-isolation
- tags: db/transactions, db/isolation-levels, db/mysql-innodb
- difficulty: L3

Prompt:
- 隔离级别解决什么问题？RR 下如何避免幻读？

Followups:
- Next-Key Lock 是什么？

Checkpoints:
- 脏读/不可重复读/幻读
- MVCC + 间隙锁/next-key lock

---

## q-redis-cache-penetration
- tags: db/redis, backend/cache, sys/caching
- difficulty: L3

Prompt:
- 缓存穿透/击穿/雪崩分别是什么？如何治理？

Followups:
- 布隆过滤器适合哪里？

Checkpoints:
- 空值缓存/布隆/互斥锁/TTL 随机/限流熔断

---

## q-jmm-happens-before
- tags: jvm/memory-model, concurrency/volatile
- difficulty: L3

Prompt:
- 解释 happens-before；举例说明哪些操作建立 HB。

Followups:
- `volatile` 写-读为什么能保证可见性？

Checkpoints:
- HB：可见性 + 有序
- 规则：锁、volatile、线程启动/终止等

---

## q-concurrency-lock-vs-cas
- tags: concurrency/synchronization, concurrency/atomic
- difficulty: L3

Prompt:
- 互斥锁和 CAS 各自优缺点？什么时候选？

Followups:
- ABA 是什么？如何解决？

Checkpoints:
- 锁适合大临界区；CAS 适合短小高并发
- ABA 用版本号

---

## q-threadlocal-leak
- tags: concurrency/threadlocal
- difficulty: L3

Prompt:
- ThreadLocal 为什么会在“线程池”场景更容易出问题？

Followups:
- 如何正确清理？

Checkpoints:
- value 残留 + 线程长期存活
- 用完 remove

---

## q-jvm-gc-g1
- tags: jvm/gc-g1
- difficulty: L3

Prompt:
- G1 基本思想是什么？为什么更好控制停顿？

Followups:
- remembered set 是什么？

Checkpoints:
- Region + 按收益回收 + 并发标记

---

## q-jvm-classloading
- tags: jvm/classloading
- difficulty: L2

Prompt:
- 类加载阶段 + 双亲委派解决什么问题？

Followups:
- 什么时候触发类初始化？

Checkpoints:
- 加载/验证/准备/解析/初始化
- 防止核心类被篡改

---

## q-http-tcp
- tags: cs/network-tcp
- difficulty: L2

Prompt:
- TCP 三次握手/四次挥手分别为了什么？

Followups:
- TIME_WAIT 为什么需要？怎么缓解？

Checkpoints:
- 建连同步序列号；断连全双工关闭

---

## q-http-cache
- tags: cs/network-http1, frontend/http
- difficulty: L2

Prompt:
- 强缓存/协商缓存如何工作？

Followups:
- ETag vs Last-Modified？

Checkpoints:
- Cache-Control / ETag

---

## q-frontend-xss-csrf
- tags: frontend/security
- difficulty: L2

Prompt:
- XSS vs CSRF 区别？怎么防？

Followups:
- SameSite 解决什么？

Checkpoints:
- 转义/CSP/HttpOnly；token/SameSite

---

## q-algo-binary-search
- tags: algo/binary-search
- difficulty: L1

Prompt:
- 二分查找最常见的边界 bug 是什么？

Followups:
- 第一个 >= x / 最后一个 <= x 怎么写？

Checkpoints:
- 循环不变量 + 区间定义

---

## q-algo-sliding-window
- tags: algo/sliding-window
- difficulty: L2

Prompt:
- 滑动窗口适用前提是什么？

Followups:
- 什么时候窗口无法单调移动？

Checkpoints:
- 条件单调性

---

## q-algo-dp
- tags: algo/dp
- difficulty: L2

Prompt:
- DP 核心是什么？如何定义状态/转移？

Followups:
- 怎么做空间优化？

Checkpoints:
- 最优子结构/重叠子问题；滚动数组

---

## q-sysdesign-rate-limit
- tags: sys/rate-limiting
- difficulty: L3

Prompt:
- 设计一个限流：单机与分布式怎么做？

Followups:
- 令牌桶 vs 漏桶？

Checkpoints:
- Redis Lua 原子；滑窗/令牌桶

---

## q-sysdesign-caching-strategy
- tags: sys/caching
- difficulty: L3

Prompt:
- Cache Aside / Write Through / Write Back 如何取舍？

Followups:
- 双写一致性怎么处理？

Checkpoints:
- 读写路径与一致性策略

---

## q-sysdesign-message-queue
- tags: backend/message-queue, sys/queueing
- difficulty: L3

Prompt:
- MQ 至少一次投递下如何幂等去重？

Followups:
- 顺序消息怎么保证？

Checkpoints:
- 幂等键/消费表；按 key 分区

---

## q-meta-project-deep-dive
- tags: meta/project-deep-dive, meta/tradeoffs
- difficulty: L2

Prompt:
- 选一个最熟项目：目标/架构/贡献/难点/结果（指标）讲清楚。

Followups:
- 如果重做一次你会怎么改？

Checkpoints:
- STAR + 量化结果 + 取舍

---

## q-debugging-production
- tags: meta/debugging, backend/metrics
- difficulty: L3

Prompt:
- 线上 CPU 飙高、延迟升高，你的排查路径？

Followups:
- 你会看哪些指标/日志/trace？

Checkpoints:
- 先止血；再定位；最后复盘
