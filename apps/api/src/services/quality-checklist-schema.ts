type ChecklistQuestion = {
  id: string;
  text: string;
  weight: number;
  required: boolean;
};

type ChecklistSection = {
  id: string;
  title: string;
  questions: ChecklistQuestion[];
};

export function parseSchema(value: unknown): ChecklistSection[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30)
    return null;
  const ids = new Set<string>();
  const sections: ChecklistSection[] = [];
  for (const rawSection of value) {
    if (!rawSection || typeof rawSection !== "object") return null;
    const section = rawSection as Record<string, unknown>;
    const id = typeof section.id === "string" ? section.id.trim() : "";
    const title = typeof section.title === "string" ? section.title.trim() : "";
    if (!id || !title || ids.has(id) || !Array.isArray(section.questions))
      return null;
    ids.add(id);
    const questions: ChecklistQuestion[] = [];
    for (const rawQuestion of section.questions) {
      if (!rawQuestion || typeof rawQuestion !== "object") return null;
      const question = rawQuestion as Record<string, unknown>;
      const questionId =
        typeof question.id === "string" ? question.id.trim() : "";
      const text =
        typeof question.text === "string" ? question.text.trim() : "";
      const weight =
        typeof question.weight === "number" ? Math.round(question.weight) : 1;
      if (
        !questionId ||
        !text ||
        ids.has(questionId) ||
        !Number.isFinite(weight) ||
        weight < 1 ||
        weight > 100
      )
        return null;
      ids.add(questionId);
      questions.push({
        id: questionId,
        text,
        weight,
        required: question.required !== false,
      });
    }
    if (questions.length === 0 || questions.length > 100) return null;
    sections.push({ id, title, questions });
  }
  return sections;
}
