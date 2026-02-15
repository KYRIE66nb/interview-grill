export type BankQuestion = {
  id: string;
  tags: string[];
  difficulty: string;
  prompt: string;
  followups: string[];
  checkpoints: string[];
};

function parseBlock(block: string): BankQuestion | null {
  const lines = block
    .split("\n")
    .map((l) => l.trimEnd());

  const header = lines.find((l) => l.startsWith("## "));
  if (!header) return null;
  const id = header.replace(/^##\s+/, "").trim();

  const tagsLine = lines.find((l) => l.startsWith("- tags:"));
  const difficultyLine = lines.find((l) => l.startsWith("- difficulty:"));

  const tags = tagsLine
    ? tagsLine
        .replace(/^-\s*tags:\s*/, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const difficulty = difficultyLine ? difficultyLine.replace(/^-\s*difficulty:\s*/, "").trim() : "";

  const section = (name: string): string[] => {
    const idx = lines.findIndex((l) => l.toLowerCase() === `${name.toLowerCase()}:`);
    if (idx < 0) return [];
    const out: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l) continue;
      if (l.startsWith("---")) break;
      if (l.endsWith(":")) break;
      if (l.startsWith("## ")) break;
      if (l.startsWith("- ")) out.push(l.replace(/^-\s*/, "").trim());
    }
    return out;
  };

  const promptLines = section("Prompt");
  const prompt = promptLines.join("\n").trim();
  const followups = section("Followups");
  const checkpoints = section("Checkpoints");

  if (!id || !prompt) return null;
  return { id, tags, difficulty, prompt, followups, checkpoints };
}

export function loadSeedBankMarkdown(seedMarkdown: string): BankQuestion[] {
  const parts = seedMarkdown.split(/\n---\n/);
  const questions: BankQuestion[] = [];
  for (const p of parts) {
    const q = parseBlock(p);
    if (q) questions.push(q);
  }
  return questions;
}

export function loadSeedBankFromDisk(): BankQuestion[] {
  const fallback = `## q-meta-project-deep-dive\n- tags: meta/project-deep-dive, meta/tradeoffs\n- difficulty: L2\n\nPrompt:\n- 选一个你最熟的项目：目标/架构/你的贡献/最难的问题/结果（指标）讲清楚。\n\nFollowups:\n- 如果重做一次，你会怎么改？\n\nCheckpoints:\n- STAR 结构\n- 量化结果\n- 关键取舍\n\n---\n\n## q-rest-idempotency\n- tags: backend/rest, backend/idempotency\n- difficulty: L3\n\nPrompt:\n- 为“创建订单”接口设计幂等：幂等键怎么生成、存哪里、过期怎么做？\n\nFollowups:\n- 并发重复请求怎么保证只创建一次？\n\nCheckpoints:\n- 业务唯一键/幂等键 + 结果表/唯一索引\n- Redis/Lua 原子或 DB 唯一索引兜底\n- TTL 与清理策略\n\n---\n\n## q-mysql-index-btree\n- tags: db/mysql-indexing, db/index\n- difficulty: L2\n\nPrompt:\n- InnoDB B+Tree 为什么适合范围查询？覆盖索引/回表是什么？\n\nFollowups:\n- 你会怎么让慢查询可观测并优化？\n\nCheckpoints:\n- 叶子有序链表；二级索引回表\n- explain/慢日志/索引设计\n`;

  return loadSeedBankMarkdown(fallback);
}
