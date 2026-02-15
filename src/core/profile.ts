export type ExtractedProject = {
  name: string;
  tech: string[];
};

export type CandidateProfile = {
  projects: ExtractedProject[];
};

export function extractProfileFromFreeform(text: string): CandidateProfile {
  const normalized = text
    .replace(/\s+/g, " ")
    .trim();

  const projects: ExtractedProject[] = [];

  if (normalized) {
    // Heuristic: if the user pasted a short "项目 / 技术栈" style line.
    const parts = normalized.split("/").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const name = parts[0];
      const tech = parts
        .slice(1)
        .join(" ")
        .split(/[\s,，]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      projects.push({ name, tech });
    }
  }

  return { projects };
}
