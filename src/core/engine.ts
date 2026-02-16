import type { Mode } from "../types";
import type { BankQuestion } from "./questionBank";

export type IntensityTier = "gentle" | "normal" | "hell";

export function intensityTier(intensity: number): IntensityTier {
  if (intensity <= 3) return "gentle";
  if (intensity <= 7) return "normal";
  return "hell";
}

export function chooseNextQuestion(
  bank: BankQuestion[],
  project: { name: string; tech: string[] } | null,
  mode: Mode,
  intensity: number,
  askedIds: Set<string>
): BankQuestion {
  const tier = intensityTier(intensity);

  const tagBoost = new Set<string>();
  if (project?.tech?.some((t) => /spring/i.test(t))) tagBoost.add("backend/spring-core");
  if (project?.tech?.some((t) => /mysql/i.test(t))) tagBoost.add("db/mysql-indexing");
  tagBoost.add("meta/project-deep-dive");

  const candidates = bank
    .filter((q) => !askedIds.has(q.id))
    .map((q) => {
      let score = 0;
      for (const t of q.tags) {
        if (tagBoost.has(t)) score += 3;
        if (t.startsWith("db/")) score += 1;
        if (t.startsWith("backend/")) score += 1;
      }
      if (mode === "drill") score += 1;
      if (tier === "hell") score += q.difficulty === "L3" ? 2 : q.difficulty === "L2" ? 1 : 0;
      return { q, score };
    })
    .sort((a, b) => b.score - a.score);

  return (candidates[0]?.q ?? bank[0]) as BankQuestion;
}

export function renderQuestionZh(q: BankQuestion, project: { name: string; tech: string[] } | null, intensity: number): string {
  const tier = intensityTier(intensity);
  const projectLine = project ? `项目：${project.name}（${project.tech.join(" ") || ""}）` : "";
  const followupCount = tier === "gentle" ? 1 : tier === "normal" ? 2 : 3;
  const pressureHint =
    tier === "gentle"
      ? "节奏说明：追问较少，优先讲清思路。"
      : tier === "normal"
        ? "节奏说明：追问 1-2 轮，重点看结构与指标。"
        : "节奏说明：追问更深，默认需要证据和边界条件。";

  const opening =
    tier === "gentle"
      ? "我们先从基础开始，答得越具体越好。"
      : tier === "normal"
        ? "按面试节奏来，尽量结构化回答，带上取舍和指标。"
        : "地狱模式：我会追问到你给出证据、边界和取舍。";

  return [
    projectLine,
    opening,
    pressureHint,
    `问题（${q.id} / ${q.difficulty}）：${q.prompt}`,
    q.followups.length ? `可能追问：${q.followups.slice(0, followupCount).join("；")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
